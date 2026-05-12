import { CaseInstances, Cases } from '@uipath/uipath-typescript/cases';
import type {
  CaseAppConfig,
  CaseAppOverview,
  CaseGetStageResponse,
  CaseInstanceExecutionHistoryResponse,
  CaseInstanceGetResponse,
  RawCaseInstanceGetResponse,
} from '@uipath/uipath-typescript/cases';
import type { UiPath } from '@uipath/uipath-typescript/core';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';
import type { CaseDefinitionJson, CaseTraceBundle, FlattenedStageTask } from './types';

export interface ResolveCaseInstanceOptions {
  businessCaseId: string;
  folderKey: string;
  processKey?: string;
  baseUrl?: string;
  orgName?: string;
  tenantName?: string;
}

export interface CaseJsonVariable {
  id: string;
  name: string;
  type: string;
  elementId?: string;
  body?: any;
  [key: string]: any;
}

export interface CaseJsonResponse {
  root?: {
    id?: string;
    type?: string;
    name?: string;
    data?: {
      uipath?: {
        bindings?: Array<{
          id: string;
          name: string;
          type: string;
          resource: string;
          resourceKey: string;
          default: string;
          propertyAttribute: string;
          resourceSubType?: string;
        }>;
        variables?: {
          inputOutputs?: CaseJsonVariable[];
          [key: string]: any;
        };
        [key: string]: any;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
  nodes?: Array<{
    id: string;
    type: string;
    data?: {
      tasks?: Array<Array<{
        id?: string;
        elementId?: string;
        displayName?: string;
        type?: string;
        data?: {
          inputs?: Array<{
            name: string;
            displayName?: string;
            value: string;
            type: string;
            id?: string;
            var?: string;
            elementId?: string;
            [key: string]: any;
          }>;
          outputs?: Array<{
            name: string;
            displayName?: string;
            value: string;
            type: string;
            id?: string;
            var?: string;
            elementId?: string;
            [key: string]: any;
          }>;
          [key: string]: any;
        };
        [key: string]: any;
      }>>;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
  [key: string]: any;
}

export async function resolveCaseInstance(
  sdk: UiPath,
  options: ResolveCaseInstanceOptions,
): Promise<CaseInstanceGetResponse | null> {
  const caseInstances = new CaseInstances(sdk);
  const allInstances = await caseInstances.getAll(
    options.processKey ? { processKey: options.processKey } : undefined,
  );

  return (
    allInstances.items.find((instance) => {
      const businessId = String((instance as any).caseId ?? '').trim();
      return businessId === String(options.businessCaseId).trim();
    }) ?? null
  );
}

export async function getCaseTraceBundle(
  sdk: UiPath,
  options: ResolveCaseInstanceOptions,
  preResolvedInstanceId?: string,
): Promise<CaseTraceBundle> {
  const caseInstances = new CaseInstances(sdk);

  let instance: CaseInstanceGetResponse | null = null;

  if (preResolvedInstanceId) {
    // Skip discovery phase and create a skeleton instance that will be fully hydrated by getById
    instance = { instanceId: preResolvedInstanceId } as CaseInstanceGetResponse;
  } else {
    instance = await resolveCaseInstance(sdk, options);
  }

  if (!instance) {
    return {
      instance: null,
      stages: [],
      executionHistory: null,
      actionTasks: [],
      caseDefinition: null,
      warnings: ['No UiPath case instance found for this business case id.'],
    };
  }

  const warnings: string[] = [];

  const [hydratedInstanceResult, stagesResult, executionHistoryResult, actionTasksResult] = await Promise.allSettled([
    caseInstances.getById(instance.instanceId, options.folderKey),
    caseInstances.getStages(instance.instanceId, options.folderKey),
    caseInstances.getExecutionHistory(instance.instanceId, options.folderKey),
    caseInstances.getActionTasks(instance.instanceId).then((response) => response.items),
  ]);

  const hydratedInstance = hydratedInstanceResult.status === 'fulfilled' ? hydratedInstanceResult.value : instance;
  const stages = stagesResult.status === 'fulfilled' ? stagesResult.value : [];
  const executionHistory = executionHistoryResult.status === 'fulfilled' ? executionHistoryResult.value : null;
  const actionTasks = actionTasksResult.status === 'fulfilled' ? actionTasksResult.value : [];

  if (hydratedInstanceResult.status === 'rejected') {
    warnings.push('Could not load full case instance details.');
  }
  if (stagesResult.status === 'rejected') {
    warnings.push('Could not load case stages.');
  }
  if (executionHistoryResult.status === 'rejected') {
    warnings.push('Could not load execution history.');
  }
  if (actionTasksResult.status === 'rejected') {
    warnings.push('Could not load case action tasks in the browser. This is likely due to UiPath CORS restrictions on task endpoints.');
  }

  const caseDefinition = ((hydratedInstance as any)?.caseJson ?? null) as CaseDefinitionJson | null;

  console.log('[CaseTraceBundle] Update:', { stages: stages, executionHistory: executionHistory, executions: (executionHistory as any)?.elementExecutions });
  return {
    instance: hydratedInstance,
    stages,
    executionHistory,
    actionTasks,
    caseDefinition,
    warnings,
  };
}

/**
 * Fast refresh path used during auto-polling.
 * Skips instance resolution (requires known instanceId) and only fetches
 * the 4 live-data endpoints in parallel — no redundant getAll() calls.
 * Preserves the existing caseDefinition from a previous full fetch.
 */
export async function refreshCaseTraceBundle(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
  previousBundle: CaseTraceBundle,
): Promise<CaseTraceBundle> {
  const caseInstances = new CaseInstances(sdk);

  const [hydratedInstanceResult, stagesResult, executionHistoryResult, actionTasksResult] = await Promise.allSettled([
    caseInstances.getById(instanceId, folderKey),
    caseInstances.getStages(instanceId, folderKey),
    caseInstances.getExecutionHistory(instanceId, folderKey),
    caseInstances.getActionTasks(instanceId).then((response) => response.items),
  ]);

  const hydratedInstance = hydratedInstanceResult.status === 'fulfilled'
    ? hydratedInstanceResult.value
    : previousBundle.instance;
  const stages = stagesResult.status === 'fulfilled' ? stagesResult.value : previousBundle.stages;
  const executionHistory = executionHistoryResult.status === 'fulfilled'
    ? executionHistoryResult.value
    : previousBundle.executionHistory;
  const actionTasks = actionTasksResult.status === 'fulfilled'
    ? actionTasksResult.value
    : previousBundle.actionTasks;

  console.log('[refreshCaseTraceBundle] Fast Update:', { executions: (executionHistory as any)?.elementExecutions?.length });
  return {
    instance: hydratedInstance,
    stages,
    executionHistory,
    actionTasks,
    // Preserve caseDefinition — it never changes during a run
    caseDefinition: previousBundle.caseDefinition,
    warnings: previousBundle.warnings,
  };
}

export function flattenStageTasks(stages: CaseGetStageResponse[]): FlattenedStageTask[] {
  return stages.flatMap((stage) =>
    (stage.tasks ?? []).flatMap((taskGroup, groupIndex) =>
      taskGroup.map((task) => ({
        stageId: stage.id,
        stageName: stage.name,
        stageStatus: stage.status,
        taskIndex: groupIndex,
        id: task.id,
        name: task.name,
        status: task.status,
        type: String(task.type),
        startedTime: task.startedTime,
        completedTime: task.completedTime,
      })),
    ),
  );
}

function getStageCursorIds(instance: CaseInstanceGetResponse | null): string[] {
  const cursorIds = (instance as any)?.cursors?.elementIds;
  return Array.isArray(cursorIds) ? cursorIds.map((id) => String(id)) : [];
}

function getLatestExecutionStage(
  executionHistory: CaseInstanceExecutionHistoryResponse | null,
  stages: CaseGetStageResponse[],
) {
  const stageIds = new Set(stages.map((stage) => stage.id));
  const stageExecutions = (executionHistory?.elementExecutions ?? [])
    .filter((execution: any) => {
      const stageId = execution.caseStageElementId ?? execution.elementId;
      return stageId && stageIds.has(String(stageId));
    })
    .sort((a: any, b: any) => {
      const aTime = new Date(a.startedTime ?? 0).getTime();
      const bTime = new Date(b.startedTime ?? 0).getTime();
      return bTime - aTime;
    });

  const activeExecution = stageExecutions.find((execution: any) => !execution.completedTime);
  return activeExecution ?? stageExecutions[0] ?? null;
}

export function getCurrentStage(
  instance: CaseInstanceGetResponse | null,
  stages: CaseGetStageResponse[],
  executionHistory?: CaseInstanceExecutionHistoryResponse | null,
) {
  const cursorStage = getStageCursorIds(instance)
    .map((cursorId) => stages.find((stage) => stage.id === cursorId))
    .find(Boolean);

  if (cursorStage) {
    return { stage: cursorStage, source: 'cursor' as const };
  }

  const latestExecutionStage = getLatestExecutionStage(executionHistory ?? null, stages);
  if (latestExecutionStage) {
    const matchedStage = stages.find(
      (stage) => stage.id === (latestExecutionStage as any).caseStageElementId || stage.id === latestExecutionStage.elementId,
    );

    if (matchedStage) {
      return { stage: matchedStage, source: 'executionHistory' as const };
    }
  }

  return (
    {
      stage:
        stages.find((stage) => /running|pending|active|inprogress/i.test(stage.status)) ??
        stages.find((stage) => stage.tasks?.some((group) => group.some((task) => /pending|unassigned/i.test(task.status)))) ??
        stages[stages.length - 1] ??
        null,
      source: 'heuristic' as const,
    }
  );
}

function getLatestFailedTaskInStage(stage: CaseGetStageResponse | null) {
  if (!stage) return null;

  const tasks = (stage.tasks ?? []).flat();
  const failedTasks = tasks.filter((task) => /failed/i.test(String(task.status)));
  if (!failedTasks.length) return null;

  return failedTasks.sort((a, b) => {
    const aTime = new Date((a as any).startedTime ?? 0).getTime();
    const bTime = new Date((b as any).startedTime ?? 0).getTime();
    return bTime - aTime;
  })[0];
}

export async function fetchCaseJson(
  sdk: UiPath,
  options: ResolveCaseInstanceOptions,
): Promise<CaseJsonResponse | null> {
  try {
    const baseUrl = options.baseUrl || 'https://cloud.uipath.com';
    const orgName = options.orgName;
    const tenantName = options.tenantName;
    const instanceId = options.businessCaseId;

    if (!orgName || !tenantName) {
      console.warn('[fetchCaseJson] Missing orgName or tenantName for case-json API');
      return null;
    }

    // Try to get access token from sessionStorage with multiple fallbacks
    let accessToken: string | null = null;

    // Method 1: Try the SDK client ID pattern
    const clientId = import.meta.env.VITE_UIPATH_CLIENT_ID;
    if (clientId) {
      const tokenKey = `uipath_sdk_user_token-${clientId}`;
      accessToken = sessionStorage.getItem(tokenKey);
    }

    // Method 2: Try common token key variations
    if (!accessToken) {
      const allKeys = Object.keys(sessionStorage);
      const tokenKey = allKeys.find(key => key.includes('uipath_sdk_user_token'));
      if (tokenKey) {
        accessToken = sessionStorage.getItem(tokenKey);
      }
    }

    if (!accessToken) {
      const allKeys = Object.keys(sessionStorage);
      console.warn('[fetchCaseJson] No access token in sessionStorage. Available keys:', allKeys.filter(k => k.includes('uipath') || k.includes('token') || k.includes('auth')));
      return null;
    }

    const url = `${baseUrl}/${orgName}/${tenantName}/pims_/api/v1/cases/${instanceId}/case-json`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[fetchCaseJson] Failed to fetch case-json:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('[fetchCaseJson] Error response body:', errorText);
      return null;
    }

    const data = await response.json();
    return data as CaseJsonResponse;
  } catch (error) {
    console.error('[fetchCaseJson] Error fetching case-json:', error);
    if (error instanceof Error) {
      console.error('[fetchCaseJson] Error message:', error.message);
      console.error('[fetchCaseJson] Error stack:', error.stack);
    }
    return null;
  }
}

export function extractVariablesFromCaseJson(caseJson: CaseJsonResponse | null): CaseJsonVariable[] {
  console.log('=== [extractVariablesFromCaseJson] START ===');

  if (!caseJson) {
    console.log('[extractVariablesFromCaseJson] No case JSON provided, returning empty array');
    return [];
  }

  const variables: CaseJsonVariable[] = [];

  // Extract from root.data.uipath.variables.inputOutputs
  const inputOutputs = caseJson.root?.data?.uipath?.variables?.inputOutputs ?? [];
  console.log('[extractVariablesFromCaseJson] Root inputOutputs count:', inputOutputs.length);
  variables.push(...inputOutputs);

  // Extract from nodes tasks inputs/outputs
  const nodes = caseJson.nodes ?? [];
  console.log('[extractVariablesFromCaseJson] Nodes count:', nodes.length);

  let totalInputs = 0;
  let totalOutputs = 0;

  for (const node of nodes) {
    const taskGroups = node.data?.tasks ?? [];
    for (const taskGroup of taskGroups) {
      for (const task of taskGroup) {
        const inputs = task.data?.inputs ?? [];
        const outputs = task.data?.outputs ?? [];

        totalInputs += inputs.length;
        totalOutputs += outputs.length;

        for (const input of inputs) {
          variables.push({
            id: input.id || input.var || '',
            name: input.displayName || input.name,
            type: input.type,
            elementId: input.elementId,
            value: input.value,
            direction: 'input',
            taskId: task.id,
            taskElementId: task.elementId,
            taskDisplayName: task.displayName,
          } as any);
        }

        for (const output of outputs) {
          variables.push({
            id: output.id || output.var || '',
            name: output.displayName || output.name,
            type: output.type,
            elementId: output.elementId,
            value: output.value,
            body: output.body,
            direction: 'output',
            taskId: task.id,
            taskElementId: task.elementId,
            taskDisplayName: output.displayName,
          } as any);
        }
      }
    }
  }

  console.log('[extractVariablesFromCaseJson] Total inputs extracted:', totalInputs);
  console.log('[extractVariablesFromCaseJson] Total outputs extracted:', totalOutputs);
  console.log('[extractVariablesFromCaseJson] Total variables extracted:', variables.length);
  console.log('[extractVariablesFromCaseJson] Variable names:', variables.map(v => v.name || v.key));
  console.log('=== [extractVariablesFromCaseJson] END ===');

  return variables;
}

export function getVariablesForElement(
  variables: CaseJsonVariable[],
  elementId: string | null | undefined,
): CaseJsonVariable[] {
  console.log('=== [getVariablesForElement] START ===');
  console.log('[getVariablesForElement] Input elementId:', elementId);
  console.log('[getVariablesForElement] Total input variables:', variables.length);

  if (!elementId) {
    console.log('[getVariablesForElement] No elementId provided, returning all variables');
    console.log('=== [getVariablesForElement] END ===');
    return variables;
  }

  const filtered = variables.filter((v) => {
    const vElementId = (v as any).elementId;
    return vElementId === elementId || vElementId === undefined || vElementId === null;
  });

  console.log('[getVariablesForElement] Filtered variables count:', filtered.length);
  console.log('[getVariablesForElement] Filtered variable names:', filtered.map(v => v.name || v.key));
  console.log('=== [getVariablesForElement] END ===');

  return filtered;
}

export function getReworkSummary(executionHistory: CaseInstanceExecutionHistoryResponse | null) {
  if (!executionHistory) return { totalFailedRuns: 0, perStageRetryCounts: {}, totalRetries: 0 };

  const elementExecutions = executionHistory.elementExecutions ?? [];
  let totalFailedRuns = 0;
  const perStageRetryCounts: Record<string, number> = {};
  let totalRetries = 0;

  for (const execution of elementExecutions) {
    const stageId = (execution as any).caseStageElementId || execution.elementId || 'unknown';
    const elementRuns = execution.elementRuns ?? [];

    // Count failed runs in this execution's runs
    const failedRuns = elementRuns.filter((run) => /fail|error/i.test(String(run.status || ''))).length;
    totalFailedRuns += failedRuns;

    // If multiple runs, it's a retry
    if (elementRuns.length > 1) {
      totalRetries += elementRuns.length - 1;
      perStageRetryCounts[stageId] = (perStageRetryCounts[stageId] || 0) + (elementRuns.length - 1);
    }
  }

  return { totalFailedRuns, perStageRetryCounts, totalRetries };
}

export function isTaskAssignedToRole(task: TaskGetResponse, role: "Loan Officer" | "Underwriter"): boolean {
  const assignedToUser = task.assignedToUser;
  const assignedToName = assignedToUser?.displayName || assignedToUser?.name || "";
  const roleName = role.toLowerCase();
  const isAssignedToMe = assignedToName.toLowerCase().includes(roleName);
  return isAssignedToMe;
}

export function getCaseHealthSummary(
  instance: CaseInstanceGetResponse | null,
  stages: CaseGetStageResponse[],
  executionHistory: CaseInstanceExecutionHistoryResponse | null,
  actionTasks: TaskGetResponse[],
  role: "Loan Officer" | "Underwriter",
  caseStatus?: string,
) {
  const currentStageResult = getCurrentStage(instance, stages, executionHistory);
  const currentStage = currentStageResult.stage;

  // Filter tasks that are not completed and assigned to the appropriate role or unassigned
  const pendingTasks = actionTasks.filter((task) => {
    // Only show tasks that are NOT completed
    if (task.isCompleted) return false;

    // Only show tasks assigned to the appropriate role or unassigned
    return isTaskAssignedToRole(task, role);
  });

  const completedStages = stages.filter((stage) => /completed/i.test(stage.status)).length;
  const latestFailedTask = getLatestFailedTaskInStage(currentStage);

  return {
    currentStage,
    currentStageSource: currentStageResult.source,
    pendingTasksCount: pendingTasks.length + (role === "Underwriter" && caseStatus?.toLowerCase() === "underwriter agreement sign pending" ? 1 : 0),
    completedStages,
    totalStages: stages.length,
    latestRunStatus: instance?.latestRunStatus ?? 'Unknown',
    currentCursorIds: getStageCursorIds(instance),
    latestFailedTask,
  };
}
