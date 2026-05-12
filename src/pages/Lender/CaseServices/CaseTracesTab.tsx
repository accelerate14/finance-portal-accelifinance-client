import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertCircle, Bot, Brain, CheckCircle, ChevronDown, ChevronRight, Clock3, Zap, User, Wrench, XCircle, RotateCw, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { ExecutionTrail, type ExecutionTrailNode } from '../../../components/UI/ExecutionTrail';
import {
  flattenStageTasks,
  getCaseHealthSummary,
  // fetchCaseJson, // COMMENTED: Not available in current SDK features
  getCaseTraceBundle,
  // extractVariablesFromCaseJson, // COMMENTED: Not available in current SDK features
  getVariablesForElement,
  // type CaseJsonVariable, // COMMENTED: Not available in current SDK features
  // type CaseJsonResponse, // COMMENTED: Not available in current SDK features
} from './caseTraceService';
import type { CaseTraceBundle, CaseDefinitionJson, FlattenedStageTask } from './types';

// ── Types ───────────────────────────────────────────────────────────────────

type CaseTracesTabProps = {
  caseBundle: CaseTraceBundle | null;
  refreshCaseData: () => Promise<void>;
  refreshCaseDataFast?: () => Promise<void>;
  isMutating: boolean;
  feedback: string | null;
  error: string | null;
  traceWarning: string | null;
  operationComment: string;
  setOperationComment: (value: string) => void;
  selectedReopenStageId: string;
  setSelectedReopenStageId: (value: string) => void;
  runCaseOperation: (operation: 'pause' | 'resume' | 'close' | 'reopen') => Promise<void>;
  sdk?: any;
  folderKey?: string;
  processKey?: string;
  roleLender: "Loan Officer" | "Underwriter";
  caseStatus?: string;
};

type CanvasStageTask = {
  id: string;
  name: string;
  status: string;
  type?: string;
  durationLabel?: string;
  endedAt?: string;
  reworkedCount?: number;
  importance: 'primary' | 'secondary';
};

type CaseDefinitionLike = {
  nodes?: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    measured?: { width?: number; height?: number };
    style?: { width?: number; height?: number };
    data?: {
      label?: string;
      tasks?: Array<Array<{
        id?: string;
        elementId?: string;
        type?: string;
        displayName?: string;
        data?: Record<string, unknown>;
      }>>;
    };
  }>;
  edges?: Array<{
    id: string;
    source: string;
    target: string;
  }>;
};

type StageGroupNodeData = {
  stageId?: string;
  label: string;
  duration?: string;
  status?: string;
  hasFailedStep: boolean;
};

type StepCardNodeData = {
  stageId?: string;
  taskId?: string;
  definitionElementId?: string;
  name: string;
  status: string;
  type?: string;
  durationLabel?: string;
  endedAt?: string;
  reworkedCount?: number;
  isInProgress?: boolean;
  isReworking?: boolean;
};

type ExecutionRowKind = 'stage' | 'agent' | 'automation' | 'trigger' | 'internal' | 'tool';

// ── Custom React Flow Nodes ─────────────────────────────────────────────────

function StageGroupNode({ data, selected }: NodeProps<StageGroupNodeData>) {
  const hasFailure = data.hasFailedStep || /fail|error/i.test(String(data.status || ''));
  const isComplete = /complete|success/i.test(String(data.status || ''));
  const isInProgress = /inprogress|in progress|running|active/i.test(String(data.status || ''));

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}
      className={`rounded-2xl border bg-white shadow-sm transition-all overflow-hidden h-full ${hasFailure
        ? 'border-red-300'
        : selected
          ? 'border-blue-400 shadow-blue-100'
          : isComplete
            ? 'border-emerald-300'
            : isInProgress
              ? 'border-blue-400 shadow-blue-100 animate-pulse'
              : 'border-slate-200'
        }`}
    >
      {/* ── MANDATORY HANDLES ── */}
      {/* Placed at top: 24px (middle of 48px header) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ top: '24px', background: 'transparent', border: 'none', width: 0, height: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: '24px', background: 'transparent', border: 'none', width: 0, height: 0 }}
      />

      {/* Header section - 48px height */}
      <div className={`flex items-start justify-between px-4 h-[48px] pt-3 pb-2 border-b ${hasFailure ? 'border-red-100 bg-red-50/40' : isComplete ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/60'
        }`}>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-bold text-slate-800 leading-tight truncate">
            {data.label}
          </span>
          {data.duration && (
            <span className="text-[9px] text-slate-400 font-semibold uppercase">
              {data.duration}
            </span>
          )}
        </div>
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ml-2 mt-0.5 ${hasFailure ? 'text-red-500' : isComplete ? 'text-emerald-500' : 'text-slate-300'
          }`}>
          {hasFailure ? <AlertCircle size={14} /> : isComplete ? <CheckCircle size={14} /> : <Clock3 size={14} />}
        </div>
      </div>
    </div>
  );
}

function StepCardNode({ data }: NodeProps<StepCardNodeData>) {
  const isError = /fail|error/i.test(data.status);
  const isInProgress = /inprogress|in progress|running|active/i.test(String(data.status || ''));
  const isReworking = data.isReworking === true;
  const typeIcon = getStepTypeIconSmall(data.type, data.name);
  //console.log(`StepCardNode ${data.name} reworkedCount: ${data.reworkedCount}`);

  return (
    <div className={`
      relative flex flex-col p-2 bg-white border rounded shadow-sm transition-all
      ${isError ? 'border-l-4 border-l-red-500 border-red-200' : ''}
      ${isReworking ? 'border-2 border-blue-400 bg-blue-50/50' : isInProgress ? 'border-2 border-blue-400 bg-blue-50/50 animate-pulse' : 'border-slate-200'}
    `}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {typeIcon}
          <span className="text-[11px] font-semibold truncate text-slate-700">{data.name}</span>
        </div>
        <div className="shrink-0">
          {isError ? <XCircle size={12} className="text-red-500" /> :
            isReworking || isInProgress ? <RotateCw size={12} className="text-blue-600 animate-spin" /> :
              /complete|success/i.test(data.status) ? <CheckCircle size={12} className="text-emerald-500" /> :
                <Clock3 size={12} className="text-slate-300" />}
        </div>
      </div>

      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[9px] text-slate-400 font-mono">{data.durationLabel}</span>
        {isReworking ? (
          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
            Reworking...
          </span>
        ) : data.reworkedCount && data.reworkedCount > 0 ? (
          <span className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded font-bold italic">
            Reworked x{data.reworkedCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const processNodeTypes: NodeTypes = {
  stageGroup: StageGroupNode,
  stepCard: StepCardNode,
};

// ── Utility Functions ───────────────────────────────────────────────────────

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function prettifyTraceSource(value?: 'cursor' | 'executionHistory' | 'heuristic' | null) {
  if (!value) return '—';
  const labels: Record<string, string> = {
    cursor: 'Cursor',
    executionHistory: 'Execution History',
    heuristic: 'Fallback Heuristic',
  };
  return labels[value] || value;
}

function getStepTypeIcon(type?: string) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('agent')) return <Brain size={16} />;
  if (normalized.includes('action') || normalized.includes('user') || normalized.includes('manual')) return <User size={16} />;
  return <Bot size={16} />;
}

// ── Custom SVG Icons for Task Types ─────────────────────────────────────────

function AgentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-violet-500">
      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" fill="currentColor" />
    </svg>
  );
}

function HumanActionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-500">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
    </svg>
  );
}

function ApiWorkflowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-orange-500">
      <path d="M21 11l-3-3v2H9V8L6 11l3 3v-2h9v2l3-3zM3 13l3 3v-2h9v2l3-3-3-3v2H6v-2l-3 3z" fill="currentColor" />
    </svg>
  );
}

function MaestroBpmnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12h10M12 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RpaProjectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 22 22" fill="none" className="text-amber-500">
      <path fill="currentColor" d="M9.787 16.65a3.1 3.1 0 0 1-.947-.357c-.31-.17-.57-.39-.77-.66a1.6 1.6 0 0 1-.29-.9c0-.33.1-.63.29-.9.2-.27.46-.49.77-.66.32-.17.66-.29 1.03-.35.37-.06.73-.06 1.07 0 .34.06.65.18.92.35.27.17.49.39.66.66.17.27.26.57.26.9 0 .33-.09.63-.26.9-.17.27-.39.49-.66.66-.27.17-.58.29-.92.35-.34.06-.7.06-1.07 0z" />
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="m1.5 5.25c0-.966.784-1.75 1.75-1.75h15.5c.966 0 1.75.784 1.75 1.75v11.5c0 .966-.784 1.75-1.75 1.75h-15.5c-.966 0-1.75-.784-1.75-1.75v-11.5zm1.75-.25a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h15.5a.25.25 0 0 0 .25-.25v-11.5a.25.25 0 0 0-.25-.25h-15.5z" />
    </svg>
  );
}

function getStepTypeIconSmall(type?: string, name?: string) {
  const normalizedType = String(type || '').toLowerCase();
  const normalizedName = String(name || '').toLowerCase();
  const combined = `${normalizedType} ${normalizedName}`;

  // 1. Agent / AI Tasks
  if (combined.includes('agent') || combined.includes('autopilot') || combined.includes('intelligence') || combined.includes('ai')) {
    return <AgentIcon />;
  }

  // 2. Human in the Loop / Manual Actions
  if (combined.includes('manual') || combined.includes('human') || combined.includes('review') || normalizedType === 'action') {
    return <HumanActionIcon />;
  }

  // 3. API / Integration Service
  if (combined.includes('api') || combined.includes('integration') || combined.includes('fetch')) {
    return <ApiWorkflowIcon />;
  }

  // 4. RPA / Automated Robots
  if (combined.includes('robot') || combined.includes('rpa') || combined.includes('automation')) {
    return <RpaProjectIcon />;
  }

  // 5. Maestro / BPMN Logic
  if (combined.includes('status') || combined.includes('bpmn') || combined.includes('logic')) {
    return <MaestroBpmnIcon />;
  }

  // Default Fallback
  return <Bot size={14} className="text-slate-400" />;
}

function formatStepTypeLabel(type: string) {
  const normalized = String(type || 'Task');
  if (/agent/i.test(normalized)) return 'Agent';
  if (/action|user|manual/i.test(normalized)) return 'Action';
  if (/rpa|robot|automation/i.test(normalized)) return 'RPA';
  return normalized;
}

function isSecondaryStage(stageName?: string) {
  const normalized = String(stageName || '').toLowerCase();
  return normalized.includes('document upload') || normalized.includes('application reject');
}

function deriveTaskStatus(runtimeTask: any, definitionTask: any, executionHistory: any, stageName?: string) {
  const explicitStatus = runtimeTask?.status || definitionTask?.status;
  if (explicitStatus) return explicitStatus;

  const taskName = String(definitionTask?.displayName || definitionTask?.name || runtimeTask?.name || '').toLowerCase();
  const stageLabel = String(stageName || '').toLowerCase();
  const matchingExecution = (executionHistory?.elementExecutions ?? []).find((execution: any) => {
    const executionName = String(execution?.elementName || '').toLowerCase();
    return executionName === taskName || executionName.includes(taskName) || taskName.includes(executionName);
  });

  if (matchingExecution?.status) return matchingExecution.status;

  if (stageLabel.includes('loan officer review') && taskName.includes('documentintelligence')) {
    return 'Failed';
  }

  return 'Pending';
}


// ── Rework Delta Calculation ────────────────────────────────────────────────

function calculateReworkDelta(
  firstAttemptStarted: string | undefined,
  latestAttemptCompleted: string | undefined,
): string | undefined {
  if (!firstAttemptStarted || !latestAttemptCompleted) return undefined;

  const start = new Date(firstAttemptStarted).getTime();
  const end = new Date(latestAttemptCompleted).getTime();
  const deltaMs = end - start;

  if (deltaMs <= 0) return undefined;

  const minutes = Math.floor(deltaMs / 60000);
  const seconds = Math.floor((deltaMs % 60000) / 1000);
  return `+${minutes}m ${seconds}s`;
}

// ── Task Duration Formatting ────────────────────────────────────────────────

function getRunDurationMs(run: any): number {
  const start = run?.startedTime ? new Date(run.startedTime).getTime() : NaN;
  const end = run?.completedTime ? new Date(run.completedTime).getTime() : NaN;
  return !Number.isNaN(start) && !Number.isNaN(end) && end >= start ? end - start : 0;
}

function getTaskDurationMs(task: any): number {
  let started = task?.startedTime ? new Date(task.startedTime).getTime() : NaN;
  let completed = task?.completedTime ? new Date(task.completedTime).getTime() : NaN;
  
  const runs = task?.elementRuns || [];
  const lastSuccess = [...runs].reverse().find((r: any) => 
    /complete|success/i.test(String(r.status || ''))
  );

  if (lastSuccess) {
    const s = lastSuccess.startedTime ? new Date(lastSuccess.startedTime).getTime() : NaN;
    const c = lastSuccess.completedTime ? new Date(lastSuccess.completedTime).getTime() : NaN;
    if (!Number.isNaN(s) && !Number.isNaN(c)) {
      started = s;
      completed = c;
    }
  }

  return !Number.isNaN(started) && !Number.isNaN(completed) && completed >= started
    ? completed - started
    : 0;
}

function getCumulativeTaskDurationMs(taskExecutions: any[]): number {
  let totalMs = 0;
  taskExecutions.forEach((execution) => {
    const runs = execution.elementRuns || [];
    if (runs.length > 0) {
      runs.forEach((run: any) => {
        const start = run.startedTime ? new Date(run.startedTime).getTime() : NaN;
        const end = run.completedTime ? new Date(run.completedTime).getTime() : NaN;
        if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          totalMs += end - start;
        }
      });
    } else {
      // Fallback for parent execution if no runs
      const start = execution.startedTime ? new Date(execution.startedTime).getTime() : NaN;
      const end = execution.completedTime ? new Date(execution.completedTime).getTime() : NaN;
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        totalMs += end - start;
      }
    }
  });
  return totalMs;
}

function formatDurationFromMs(totalMs: number): string {
  if (totalMs <= 0) return '0sec';
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}hr`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 || (hours === 0 && minutes === 0)) parts.push(`${seconds}sec`);
  
  return parts.join(' ');
}

function formatTaskDuration(task: any): string | undefined {
  const ms = getTaskDurationMs(task);
  return ms > 0 ? formatDurationFromMs(ms) : undefined;
}

function formatStageDuration(stage: any, tasks: any[]) {
  const durationFromTasks = tasks
    .map((task) => getTaskDurationMs(task))
    .reduce((a, b) => a + b, 0);

  const started = stage?.startedTime ? new Date(stage.startedTime).getTime() : NaN;
  const completed = stage?.completedTime ? new Date(stage.completedTime).getTime() : NaN;
  const totalMs = !Number.isNaN(started) && !Number.isNaN(completed) && completed >= started
    ? completed - started
    : durationFromTasks;

  if (totalMs > 0) {
    return formatDurationFromMs(totalMs);
  }

  if (stage?.sla?.length) return `SLA ${stage.sla.length}${stage.sla.duration || ''}`;
  return `${tasks.length} steps`;
}


// ── Maestro-Style Layout Constants ──────────────────────────────────────────

const MAESTRO_STAGE_WIDTH = 280;
const MAESTRO_STAGE_GAP = 48;
const MAESTRO_TASK_HEIGHT = 48;
const MAESTRO_STAGE_HEADER = 48;
const MAESTRO_CHILD_PAD = 10;
const MAESTRO_CHILD_GAP = 8;
const MAESTRO_PRIMARY_ROW_Y = 40;

// ── Layout Calculation (Separated from Node Creation) ───────────────────────

function calculateStageLayout(
  stages: any[],
  caseDefinition: CaseDefinitionLike | null,
): {
  stageLayout: Map<string, { x: number; y: number }>;
  enrichedStageRecords: Array<{
    id: string;
    originalIndex: number;
    name: string;
    status: string;
    runtimeTasks: any[];
    definitionNode?: any;
    secondary: boolean;
  }>;
  runtimeStageMap: Map<string, any>;
} {
  const runtimeStages = stages ?? [];
  const runtimeStageMap = new Map(runtimeStages.map((stage: any) => [stage.id, stage]));

  const definitionNodes = (caseDefinition?.nodes ?? []).filter((node) => node.type !== 'case-management:Trigger');
  const hasDefinitionCanvas = definitionNodes.length > 0;

  // Build stage records from definition or runtime
  const stageRecords = hasDefinitionCanvas
    ? definitionNodes.map((node, index) => {
      const runtimeStage = runtimeStageMap.get(node.id);
      return {
        id: node.id,
        originalIndex: index,
        name: runtimeStage?.name || node.data?.label || `Stage ${index + 1}`,
        status: runtimeStage?.status || 'Not Started',
        runtimeTasks: (runtimeStage?.tasks ?? []).flat(),
        definitionNode: node,
      };
    })
    : runtimeStages.length
      ? runtimeStages.map((stage: any) => ({
        id: stage.id,
        originalIndex: runtimeStages.findIndex((entry: any) => entry.id === stage.id),
        name: stage.name,
        status: stage.status,
        runtimeTasks: (stage.tasks ?? []).flat(),
        definitionNode: undefined,
      }))
      : [];

  // Enrich with secondary flag
  const enrichedStageRecords = stageRecords.map((stage, index) => ({
    ...stage,
    originalIndex: typeof stage.originalIndex === 'number' && stage.originalIndex >= 0 ? stage.originalIndex : index,
    secondary: isSecondaryStage(stage.name),
  }));

  const primaryStages = enrichedStageRecords.filter((stage) => !stage.secondary);
  const secondaryStages = enrichedStageRecords.filter((stage) => stage.secondary);

  // Calculate heights - consistent spacing above, between, and below tasks
  const computeStageHeight = (taskCount: number) => {
    const actualTaskCount = Math.max(taskCount, 1);
    return MAESTRO_STAGE_HEADER + MAESTRO_CHILD_GAP + actualTaskCount * MAESTRO_TASK_HEIGHT + actualTaskCount * MAESTRO_CHILD_GAP;
  };

  const stageTaskCounts = new Map<string, number>();
  enrichedStageRecords.forEach((stage) => {
    const defTasks = stage.definitionNode?.data?.tasks ?? [];
    const flatDef = defTasks.flat();
    const taskCount = flatDef.length || stage.runtimeTasks.length;
    stageTaskCounts.set(stage.id, taskCount);
  });

  // Calculate primary row bottom
  const maxPrimaryBottom = primaryStages.reduce((maxY, stage) => {
    const h = computeStageHeight(stageTaskCounts.get(stage.id) ?? 0);
    return Math.max(maxY, MAESTRO_PRIMARY_ROW_Y + h);
  }, 0);
  const secondaryRowY = maxPrimaryBottom + 48;

  // ── STRICT GRID: x = index * (WIDTH + GAP) ──────────────────────────────
  const stageLayout = new Map<string, { x: number; y: number }>();

  primaryStages.forEach((stage, index) => {
    const x = index * (MAESTRO_STAGE_WIDTH + MAESTRO_STAGE_GAP);
    stageLayout.set(stage.id, { x, y: MAESTRO_PRIMARY_ROW_Y });
  });

  // Secondary stages anchored below their primary parent
  const secondaryGroupByAnchorId = new Map<string, typeof secondaryStages>();
  secondaryStages.forEach((stage) => {
    const anchorPrimary =
      [...primaryStages]
        .filter((c) => c.originalIndex < stage.originalIndex)
        .sort((a, b) => b.originalIndex - a.originalIndex)[0] ??
      primaryStages[0];
    const anchorId = anchorPrimary?.id ?? '__none__';
    const group = secondaryGroupByAnchorId.get(anchorId) ?? [];
    group.push(stage);
    secondaryGroupByAnchorId.set(anchorId, group);
  });

  secondaryStages.forEach((stage) => {
    const anchorPrimary =
      [...primaryStages]
        .filter((c) => c.originalIndex < stage.originalIndex)
        .sort((a, b) => b.originalIndex - a.originalIndex)[0] ??
      primaryStages[0];

    const anchorId = anchorPrimary?.id ?? '__none__';
    const anchorPos = anchorPrimary ? stageLayout.get(anchorPrimary.id) : null;
    const group = secondaryGroupByAnchorId.get(anchorId) ?? [stage];
    const indexInGroup = group.findIndex((s) => s.id === stage.id);

    let offsetX = 0;
    for (let i = 0; i < indexInGroup; i++) {
      offsetX += MAESTRO_STAGE_WIDTH + 24;
    }

    stageLayout.set(stage.id, {
      x: (anchorPos?.x ?? 0) + offsetX,
      y: secondaryRowY,
    });
  });

  return { stageLayout, enrichedStageRecords, runtimeStageMap };
}

// ── Node Creation (Uses Pre-calculated Layout) ──────────────────────────────

function createCanvasNodes(
  layout: {
    stageLayout: Map<string, { x: number; y: number }>;
    enrichedStageRecords: Array<{
      id: string;
      originalIndex: number;
      name: string;
      status: string;
      runtimeTasks: any[];
      definitionNode?: any;
      secondary: boolean;
    }>;
    runtimeStageMap: Map<string, any>;
  },
  executionHistory?: any,
): { nodes: Node[]; edges: Edge[] } {
  const { stageLayout, enrichedStageRecords, runtimeStageMap } = layout;
  const nodes: Node[] = [];

  enrichedStageRecords.forEach((stage, stageIndex) => {
    const stageId = `stage-${stage.id || stageIndex}`;
    const stageWidth = MAESTRO_STAGE_WIDTH;

    const layoutPos = stageLayout.get(stage.id);
    const stageX = layoutPos?.x ?? stageIndex * (MAESTRO_STAGE_WIDTH + MAESTRO_STAGE_GAP);
    const stageY = layoutPos?.y ?? MAESTRO_PRIMARY_ROW_Y;

    const definitionTaskGroups = stage.definitionNode?.data?.tasks ?? [];
    const runtimeTaskMap = new Map(stage.runtimeTasks.map((task: any) => [task.id, task]));
    const flattenedTasks = definitionTaskGroups.length ? definitionTaskGroups.flat() : stage.runtimeTasks;

    const isStageInProgress = /running|active|inprogress/i.test(String(stage.status || ''));

    // Build execution history lookup: elementId -> array of executions
    const elementExecutions = executionHistory?.elementExecutions ?? [];
    const executionsByElement = new Map<string, any[]>();
    elementExecutions.forEach((exec: any) => {
      const elementId = String(exec?.elementId || '').toLowerCase();
      if (elementId) {
        const arr = executionsByElement.get(elementId) ?? [];
        arr.push(exec);
        executionsByElement.set(elementId, arr);
      }
    });


    // Build task list
    const stageTasks: CanvasStageTask[] = flattenedTasks.map((task: any, taskIndex: number) => {
      const runtimeTask =
        runtimeTaskMap.get(task.id) ??
        runtimeTaskMap.get(task.elementId) ??
        stage.runtimeTasks.find(
          (candidate: any) =>
            String(candidate.name || '').trim() === String(task.displayName || task.name || '').trim(),
        ) ??
        task;

      const derivedStatus = deriveTaskStatus(runtimeTask, task, executionHistory, stage.name);

      // Rework count: use elementRuns to determine actual rework attempts
      // Each execution with elementRuns.length > 1 indicates rework
      const taskElementId = String(task.id || task.elementId || '').toLowerCase();
      const taskExecutions = (executionHistory?.elementExecutions ?? []).filter((execution: any) => {
        const executionElementId = String(execution?.elementId || '').toLowerCase();
        return executionElementId === taskElementId;
      });

      // Count rework attempts: each execution with elementRuns.length > 1 contributes (elementRuns.length - 1) reworks
      let reworkedCount = 0;
      taskExecutions.forEach((execution: any) => {
        const elementRuns = execution.elementRuns ?? [];
        if (Array.isArray(elementRuns) && elementRuns.length > 1) {
          reworkedCount += elementRuns.length - 1;
        }
      });

      // Only show rework count if there are actual rework attempts
      reworkedCount = reworkedCount > 0 ? reworkedCount : 0;
      //console.log(`Task ${task.id} elementId: ${taskElementId} executions: ${taskExecutions.length} reworkedCount: ${reworkedCount ?? 0}`);

      const isInProgress =
        isStageInProgress &&
        /running|active|inprogress|pending/i.test(String(derivedStatus || '')) &&
        !runtimeTask?.completedTime &&
        (reworkedCount ?? 0) > 0;

      // Calculate rework delta: time from first attempt start to latest attempt end
      let reworkDelta: string | undefined;
      if (taskExecutions.length > 1) {
        const sortedExecutions = [...taskExecutions].sort((a, b) => {
          const aTime = new Date(a.startedTime ?? 0).getTime();
          const bTime = new Date(b.startedTime ?? 0).getTime();
          return aTime - bTime;
        });
        const firstStart = sortedExecutions[0]?.startedTime;
        const lastEnd = sortedExecutions[sortedExecutions.length - 1]?.completedTime;
        reworkDelta = calculateReworkDelta(firstStart, lastEnd);
      }

      const cumulativeMs = getCumulativeTaskDurationMs(taskExecutions);
      const durationLabel = cumulativeMs > 0 ? formatDurationFromMs(cumulativeMs) : undefined;

      return {
        id: task.id || task.elementId || runtimeTask.id || `${stageId}-task-${taskIndex}`,
        name: task.displayName || task.name || runtimeTask.name || `Task ${taskIndex + 1}`,
        status: derivedStatus,
        type: task.type ? String(task.type) : runtimeTask.type ? String(runtimeTask.type) : undefined,
        durationLabel,
        endedAt: runtimeTask.completedTime || runtimeTask.endedAt,
        reworkedCount,
        importance: taskIndex === 0 ? 'primary' : 'secondary',
        isInProgress,
        isReworking: isInProgress && (reworkedCount ?? 0) > 0,
      };
    });

    // Only show first task as "in progress"
    const firstInProgressIdx = stageTasks.findIndex((t: any) => t.isInProgress);
    stageTasks.forEach((t: any, idx: number) => {
      if (t.isInProgress && idx !== firstInProgressIdx) {
        t.isInProgress = false;
      }
    });

    const hasFailedStep = stageTasks.some((task) => /fail|error/i.test(String(task.status || '')));
    const totalDuration = formatStageDuration(
      { status: stage.status, sla: (runtimeStageMap.get(stage.id) as any)?.sla },
      flattenedTasks.map((task: any) => runtimeTaskMap.get(task.id) ?? runtimeTaskMap.get(task.elementId) ?? task),
    );

    const actualTaskCount = Math.max(stageTasks.length, 1);
    const nodeHeight = MAESTRO_STAGE_HEADER + MAESTRO_CHILD_GAP + actualTaskCount * MAESTRO_TASK_HEIGHT + actualTaskCount * MAESTRO_CHILD_GAP;

    // Stage node (background plate)
    nodes.push({
      id: stageId,
      type: 'stageGroup',
      position: { x: stageX, y: stageY },
      draggable: false,
      selectable: true,
      style: { width: stageWidth, height: nodeHeight, border: 'none' },
      data: {
        stageId: stage.id,
        label: stage.name || `Stage ${stageIndex + 1}`,
        duration: totalDuration,
        status: stage.status,
        hasFailedStep,
      },
    });

    // Task cards (inside stage plate)
    if (!stageTasks.length) return;

    stageTasks.forEach((task, taskIndex) => {
      nodes.push({
        id: `${stageId}-task-${task.id || taskIndex}`,
        type: 'stepCard',
        position: {
          x: MAESTRO_CHILD_PAD,
          y: MAESTRO_STAGE_HEADER + MAESTRO_CHILD_GAP + taskIndex * (MAESTRO_TASK_HEIGHT + MAESTRO_CHILD_GAP),
        },
        parentNode: stageId,
        extent: 'parent',
        draggable: false,
        selectable: true,
        style: { width: stageWidth - MAESTRO_CHILD_PAD * 2, height: MAESTRO_TASK_HEIGHT, border: 'none' },
        data: {
          stageId: stage.id,
          taskId: task.id,
          name: task.name,
          status: task.status,
          type: task.type,
          durationLabel: task.durationLabel,
          endedAt: task.endedAt,
          reworkedCount: task.reworkedCount,
          isInProgress: (task as any).isInProgress ?? false,
        },
      });
    });
  });

  // ── Edges with smoothstep + borderRadius ─────────────────────────────────
  const primaryStages = enrichedStageRecords.filter((stage) => !stage.secondary);
  const primaryStageIds = new Set(primaryStages.map((stage) => stage.id));

  const edgesSource = primaryStages.slice(0, -1).map((stage, index) => ({
    id: `edge-${index}`,
    source: stage.id,
    target: primaryStages[index + 1].id,
  }));

  const edges: Edge[] = primaryStages.slice(0, -1).map((stage, index) => {
    const sourceId = `stage-${stage.id}`;
    const targetId = `stage-${primaryStages[index + 1].id}`;
    const isInProgress = /inprogress|in progress|running|active/i.test(String(stage.status || ''));

    //console.log(`[Edges] Connecting ${sourceId} to ${targetId} (stage status: ${stage.status}, isInProgress: ${isInProgress})`);

    return {
      id: `edge-${stage.id}-${index}`,
      source: sourceId,
      target: targetId,
      type: 'step',
      animated: false,
      style: {
        stroke: isInProgress ? '#3b82f6' : '#cbd5e1',
        strokeWidth: isInProgress ? 3 : 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isInProgress ? '#3b82f6' : '#cbd5e1',
      },
    };
  });

  //console.log('[Edges] Total edges created:', edges.length);
  //console.log('[Edges] Node IDs in canvas:', nodes.map(n => n.id));

  return { nodes, edges };
}

// ── Main Canvas Builder (Two-Phase: Layout → Nodes) ─────────────────────────

function buildProcessCanvas(
  stages: any[],
  caseDefinition: CaseDefinitionLike | null,
  executionHistory?: any,
): { nodes: Node[]; edges: Edge[] } {
  const layout = calculateStageLayout(stages, caseDefinition);
  return createCanvasNodes(layout, executionHistory);
}

function buildExecutionTrailRows(nodes: Node[], elementExecutions?: any[]): ExecutionTrailNode[] {
  const executedElementIds = new Set(
    (elementExecutions ?? []).map((exec: any) => String(exec?.elementId || '').toLowerCase())
  );

  console.log('[ExecutionTrail] Total element executions:', elementExecutions?.length || 0);
  // console.log('[ExecutionTrail] Executed element IDs:', Array.from(executedElementIds));

  const stageNodes = nodes
    .filter((node) => node.type === 'stageGroup')
    .sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0));

  const stepNodesByParent = new Map<string, Node[]>();
  nodes
    .filter((node) => node.type === 'stepCard' && node.parentNode)
    .forEach((node) => {
      const parentId = String(node.parentNode);
      const arr = stepNodesByParent.get(parentId) ?? [];
      arr.push(node);
      stepNodesByParent.set(parentId, arr);
    });

  stepNodesByParent.forEach((arr) => arr.sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0)));

  // Build a lookup from elementName → execution record for robotJobId enrichment
  const execByName = new Map<string, any>();
  (elementExecutions ?? []).forEach((exec: any) => {
    const name = String(exec?.elementName || '').trim().toLowerCase();
    if (name && !execByName.has(name)) execByName.set(name, exec);
  });

  return stageNodes
    .map((stageNode): ExecutionTrailNode | null => {
      const stageData = (stageNode.data ?? {}) as Record<string, unknown>;

      // Filter children to only include executed steps
      const stageChildren = (stepNodesByParent.get(stageNode.id) ?? [])
        .map((stepNode, index) => {
          const stepData = (stepNode.data ?? {}) as Record<string, unknown>;
          const stepElementId = String(stepData.taskId || stepData.definitionElementId || stepData.name || '').toLowerCase();
          const isExecuted = executedElementIds.has(stepElementId);

          if (!isExecuted) {
            // console.log(`[ExecutionTrail] Skipping unexecuted step: ${stepData.name} (ID: ${stepElementId})`);
            return null;
          }

          const kind = inferExecutionRowKind(String(stepData.type || ''));

          // Enrich with robotJobId from execution history
          const stepName = String(stepData.name || '').trim().toLowerCase();
          const matchedExec = execByName.get(stepName);
          const robotJobId = matchedExec?.externalLink
            ? String(matchedExec.externalLink).split('/').pop() || matchedExec.externalLink
            : matchedExec?.processKey
              ? String(matchedExec.processKey)
              : undefined;

          const baseDuration = formatTaskDuration(matchedExec);

          const baseRow: ExecutionTrailNode = {
            id: `trail-${stepNode.id}`,
            nodeId: stepNode.id,
            stageId: stepData.stageId as string | undefined,
            taskId: stepData.taskId as string | undefined,
            definitionElementId: stepData.definitionElementId as string | undefined,
            label: String(stepData.name || `Step ${index + 1}`),
            status: String(stepData.status || 'Pending'),
            endedAt: (stepData.endedAt as string | undefined) || undefined,
            duration: baseDuration,
            kind,
            reworkedCount: typeof stepData.reworkedCount === 'number' ? stepData.reworkedCount : (matchedExec?.elementRuns?.length || 1) - 1,
            robotJobId: kind === 'automation' ? robotJobId : undefined,
          };
          return baseRow;
        })
        .filter((row): row is ExecutionTrailNode => row !== null);

      // Only include stage if it has executed children or if stage itself has been executed
      if (stageChildren.length === 0) {
        //  console.log(`[ExecutionTrail] Skipping stage with no executed children: ${stageData.label}`);
        return null;
      }

      const stageNode_result: ExecutionTrailNode = {
        id: `trail-${stageNode.id}`,
        nodeId: stageNode.id,
        stageId: stageData.stageId as string | undefined,
        label: String(stageData.label || 'Stage'),
        status: String(stageData.status || 'Not Started'),
        kind: 'stage' as ExecutionRowKind,
        children: stageChildren,
      };
      return stageNode_result;
    })
    .filter((stage): stage is ExecutionTrailNode => stage !== null);
}

function inferExecutionRowKind(typeText: string): ExecutionRowKind {
  const normalized = String(typeText || '').toLowerCase();
  if (normalized.includes('agent')) return 'agent';
  if (normalized.includes('trigger')) return 'trigger';
  return 'automation';
}

function getStatusPillClass(status: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('complete') || normalized.includes('success')) return 'bg-emerald-100 text-emerald-700';
  if (normalized.includes('fail') || normalized.includes('error')) return 'bg-red-100 text-red-700';
  if (normalized.includes('progress') || normalized.includes('running')) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

function findSelectedTrailRow(rows: ExecutionTrailNode[], selectedRowId: string | null): ExecutionTrailNode | null {
  if (!selectedRowId) return null;
  for (const row of rows) {
    if (row.id === selectedRowId) return row;
    if (row.children?.length) {
      const found = findSelectedTrailRow(row.children, selectedRowId);
      if (found) return found;
    }
  }
  return null;
}

function indexExecutionTrailRows(rows: ExecutionTrailNode[]) {
  const index = new Map<string, { id: string; parentIds: string[] }>();

  const visit = (currentRows: ExecutionTrailNode[], parentIds: string[]) => {
    currentRows.forEach((row) => {
      if (row.nodeId) {
        index.set(row.nodeId, { id: row.id, parentIds });
      }
      if (row.children?.length) {
        visit(row.children, [...parentIds, row.id]);
      }
    });
  };

  visit(rows, []);
  return index;
}



function extractCaseJsonVariables(caseDefinition: any) {
  const normalizeEntries = (source: any): Array<{ key: string; value: string; elementId?: string }> => {
    if (!source) return [];

    if (Array.isArray(source)) {
      return source
        .filter(Boolean)
        .map((item: any) => ({
          key: String(item?.name || item?.displayName || item?.key || item?.id || 'Unnamed'),
          value:
            item?.value !== undefined
              ? stringifyVariable(item.value)
              : item?.defaultValue !== undefined
                ? stringifyVariable(item.defaultValue)
                : item?.body !== undefined
                  ? stringifyVariable(item.body)
                  : item?.type !== undefined
                    ? String(item.type)
                    : '—',
          elementId: item?.elementId ? String(item.elementId) : item?.id ? String(item.id) : undefined,
        }))
        .filter((entry) => entry.value !== '—');
    }

    if (typeof source === 'object') {
      return Object.entries(source).map(([key, value]: [string, any]) => ({
        key,
        value: stringifyVariable(value),
        elementId:
          value?.elementId
            ? String(value.elementId)
            : value?.id
              ? String(value.id)
              : value?.data?.elementId
                ? String(value.data.elementId)
                : undefined,
      }));
    }

    return [];
  };

  const candidatePaths = [
    caseDefinition?.root?.data?.uipath?.variables?.inputOutputs,
    caseDefinition?.root?.data?.uipath?.variables?.inputs,
    caseDefinition?.root?.data?.uipath?.variables?.outputs,
    caseDefinition?.root?.data?.uipath?.variables,
    caseDefinition?.data?.uipath?.variables?.inputOutputs,
    caseDefinition?.data?.uipath?.variables,
    caseDefinition?.variables,
  ];

  for (const candidate of candidatePaths) {
    const normalized = normalizeEntries(candidate);
    if (normalized.length) return normalized;
  }

  return [] as Array<{ key: string; value: string; elementId?: string }>;
}

function stringifyVariable(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}



interface ExecutionRunDetail {
  id: string;
  title: string;
  isLatest: boolean;
  status: string;
  details: Array<[string, string]>;
}

function buildSelectedDetails(selectedRow: ExecutionTrailNode | null, stages: any[], elementExecutions: any[]): ExecutionRunDetail[] {
  if (!selectedRow) return [];

  if (selectedRow.kind === 'stage') {
    const stage = stages.find((entry: any) => entry.id === selectedRow.stageId || entry.id === selectedRow.nodeId?.replace(/^stage-/, ''));
    return [{
      id: 'stage-summary',
      title: 'Current Stage Summary',
      isLatest: true,
      status: selectedRow.status,
      details: [
        ['Type', 'Stage'],
        ['Name', selectedRow.label],
        ['Status', selectedRow.status],
        ['Stage ID', String(stage?.id || selectedRow.stageId || '—')],
        ['Tasks', String((stage?.tasks ?? []).flat().length || 0)],
      ]
    }];
  }

  // Find raw execution for detailed fields
  const rawId = String(selectedRow.definitionElementId || selectedRow.taskId || '').toLowerCase();
  const raw = elementExecutions.find(e => String(e.elementId || '').toLowerCase() === rawId);

  if (!raw) {
    return [{
      id: 'task-fallback',
      title: 'Execution Summary',
      isLatest: true,
      status: selectedRow.status,
      details: [
        ['Type', selectedRow.kind],
        ['Name', selectedRow.label],
        ['Status', selectedRow.status],
        ['Stage ID', String(selectedRow.stageId || '—')],
        ['Task ID', String(selectedRow.taskId || '—')],
        ['Ended At', formatDateTime(selectedRow.endedAt)],
      ]
    }];
  }

  const runs = raw.elementRuns || [];
  
  if (runs.length === 0) {
    return [{
      id: 'task-no-runs',
      title: 'Execution Details',
      isLatest: true,
      status: selectedRow.status,
      details: [
        ['Type', selectedRow.kind],
        ['Name', selectedRow.label],
        ['Status', selectedRow.status],
        ['Stage ID', String(selectedRow.stageId || '—')],
        ['Task ID', String(selectedRow.taskId || '—')],
        ['Element Type', raw.elementType || '—'],
        ['Extension', raw.elementExtensionType || '—'],
        ['Link', raw.externalLink || '—'],
      ]
    }];
  }

  // Build runs sequentially in descending order
  return [...runs].reverse().map((run: any, idx: number) => {
    const isLatest = idx === 0;
    const attemptNum = runs.length - idx;
    const runMs = getRunDurationMs(run);
    const errorMsg = run.error?.message || run.exception?.message || run.errorMessage;

    let rowDetails: Array<[string, string]> = [];

    if (isLatest) {
      // FULL details for the latest attempt
      rowDetails = [
        ['Type', selectedRow.kind],
        ['Name', selectedRow.label],
        ['Status', String(run.status || '—')],
        ['Stage ID', String(selectedRow.stageId || '—')],
        ['Task ID', String(selectedRow.taskId || '—')],
        ['Element Type', run.elementType || raw.elementType || '—'],
        ['Extension', run.elementExtensionType || raw.elementExtensionType || '—'],
      ];
      if (run.startedTime) rowDetails.push(['Started At', formatDateTime(run.startedTime)]);
      if (run.completedTime) rowDetails.push(['Completed At', formatDateTime(run.completedTime)]);
      if (runMs > 0) rowDetails.push(['Duration', formatDurationFromMs(runMs)]);
      
      const latestLink = run.externalLink || run.externalLinkUrl || raw.externalLink;
      if (latestLink) rowDetails.push(['Link', latestLink]);
      
      if (errorMsg) rowDetails.push(['Error Info', errorMsg]);
    } else {
      // SIMPLIFIED details for older attempts
      rowDetails = [
        ['Status', String(run.status || '—')],
        ['Element Run ID', String(run.elementRunId || run.id || '—')],
      ];
      if (run.startedTime) rowDetails.push(['Started At', formatDateTime(run.startedTime)]);
      if (run.completedTime) rowDetails.push(['Completed At', formatDateTime(run.completedTime)]);
      if (runMs > 0) rowDetails.push(['Duration', formatDurationFromMs(runMs)]);
      if (errorMsg) rowDetails.push(['Error Info', errorMsg]);
    }

    return {
      id: `run-${run.elementExecutionId || run.elementRunId || idx}-${attemptNum}`,
      title: `Attempt ${attemptNum} ${isLatest ? '(Latest)' : ''}`,
      status: run.status,
      isLatest,
      details: rowDetails
    };
  });
}

// ── Button Visibility Helpers ───────────────────────────────────────────────

function shouldShowPauseButton(instance: any): boolean {
  // Show when instance is running or not cancelled/case not closed
  const latestRunStatus = String(instance?.latestRunStatus || '').toLowerCase();
  const completedTime = instance?.completedTime;

  // Hide if cancelled or completed
  if (latestRunStatus.includes('cancelled') || completedTime) {
    return false;
  }

  // Show if running or paused
  return latestRunStatus.includes('running') || latestRunStatus.includes('paused');
}

function shouldShowResumeButton(instance: any): boolean {
  // Show only when instance is paused
  const latestRunStatus = String(instance?.latestRunStatus || '').toLowerCase();
  return latestRunStatus.includes('paused');
}

function shouldShowCancelButton(instance: any): boolean {
  // Show in every scenario EXCEPT: cancelled, closed, or completed
  const latestRunStatus = String(instance?.latestRunStatus || '').toLowerCase();
  const completedTime = instance?.completedTime;

  // Hide if already cancelled or completed
  if (latestRunStatus.includes('cancelled') || completedTime) {
    return false;
  }

  return true;
}

function shouldShowReopenButton(instance: any): boolean {
  // Show only when case status is "Completed"
  const latestRunStatus = String(instance?.latestRunStatus || '').toLowerCase();

  return latestRunStatus.includes('completed');
}

// ── Helper Components ───────────────────────────────────────────────────────

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'indigo' | 'amber' | 'emerald' }) {
  const toneClasses = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  };

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-3 text-2xl font-black">{value || '—'}</p>
    </div>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white">
      <h4 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-4">{title}</h4>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            <span className="text-sm font-bold text-slate-700 text-right">{value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  loading,
  subtle,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  loading?: boolean;
  subtle?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${danger
        ? 'bg-red-600 text-white'
        : subtle
          ? 'border border-slate-200 bg-white text-slate-700'
          : 'bg-blue-600 text-white'
        }`}
    >
      {loading ? 'Working...' : label}
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function CaseTracesTab({
  caseBundle,
  processKey,
  sdk,
  folderKey,
  refreshCaseData,
  refreshCaseDataFast,
  isMutating,
  feedback,
  error,
  traceWarning,
  operationComment,
  setOperationComment,
  selectedReopenStageId,
  setSelectedReopenStageId,
  runCaseOperation,
  roleLender,
  caseStatus,
}: CaseTracesTabProps) {
  const [selectedCanvasNodeId, setSelectedCanvasNodeId] = useState<string | null>(null);
  const [selectedTrailRowId, setSelectedTrailRowId] = useState<string | null>(null);
  const [expandedExecutionRows, setExpandedExecutionRows] = useState<Record<string, boolean>>({});
  const [autoPolling, setAutoPolling] = useState(true);
  const executionRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const caseSummary = getCaseHealthSummary(
    caseBundle?.instance ?? null,
    caseBundle?.stages ?? [],
    caseBundle?.executionHistory ?? null,
    caseBundle?.actionTasks ?? [],
    roleLender,
    caseStatus,
  );
  const flattenedStageTasks = flattenStageTasks(caseBundle?.stages ?? []);
  const orchestrationCanvas = useMemo(
    () => buildProcessCanvas(
      caseBundle?.stages ?? [],
      caseBundle?.caseDefinition ?? null,
      caseBundle?.executionHistory ?? null,
    ),
    [caseBundle?.stages, caseBundle?.caseDefinition, caseBundle?.executionHistory],
  );
  const executionTrailRows = useMemo(
    () => buildExecutionTrailRows(
      orchestrationCanvas.nodes,
      caseBundle?.executionHistory?.elementExecutions ?? [],
    ),
    [orchestrationCanvas.nodes, caseBundle?.executionHistory?.elementExecutions],
  );
  const executionTrailIndex = useMemo(
    () => indexExecutionTrailRows(executionTrailRows),
    [executionTrailRows],
  );
  const highlightedCanvasNodes = useMemo(
    () => orchestrationCanvas.nodes.map((node) => ({ ...node, selected: node.id === selectedCanvasNodeId })),
    [orchestrationCanvas.nodes, selectedCanvasNodeId],
  );
  const selectedExecutionRow = useMemo(
    () => findSelectedTrailRow(executionTrailRows, selectedTrailRowId),
    [executionTrailRows, selectedTrailRowId],
  );

  const finalDetailsRows = useMemo(
    () => buildSelectedDetails(selectedExecutionRow, caseBundle?.stages ?? [], caseBundle?.executionHistory?.elementExecutions ?? []),
    [selectedExecutionRow, caseBundle?.stages, caseBundle?.executionHistory?.elementExecutions]
  );

  // React Query for auto-refresh when case is running
  const instanceId = caseBundle?.instance?.instanceId;
  const status = caseBundle?.instance?.latestRunStatus?.toLowerCase();

  useQuery({
    queryKey: ['case', instanceId],
    queryFn: async () => {
      if (!sdk || !instanceId || !folderKey) return null;

      // Use fast refresh during polling (skips resolveCaseInstance) if available
      if (refreshCaseDataFast) {
        await refreshCaseDataFast();
      } else {
        await refreshCaseData();
      }

      return caseBundle;
    },
    refetchInterval: () => {
      if (!autoPolling) return false;
      const currentStatus = status;
      if (currentStatus === 'running' || currentStatus === 'inprogress' || currentStatus === 'paused') {
        return 2000;
      }
      return false;
    },
    enabled: !!instanceId && autoPolling && !!sdk && !!folderKey,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Initial data fetch
  useEffect(() => {
    if (instanceId) {
      refreshCaseData();
    }
  }, [instanceId]);

  useEffect(() => {
    if (!selectedTrailRowId) return;
    const rowEl = executionRowRefs.current[selectedTrailRowId];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedTrailRowId]);

  const handleCanvasNodeClick = (_: unknown, node: Node) => {
    setSelectedCanvasNodeId(node.id);
    const indexed = executionTrailIndex.get(node.id);
    if (!indexed) return;
    setSelectedTrailRowId(indexed.id);
    if (indexed.parentIds.length) {
      setExpandedExecutionRows((prev) => {
        const next = { ...prev };
        indexed.parentIds.forEach((parentId: string) => {
          next[parentId] = true;
        });
        return next;
      });
    }
  };



  // Check if we have any meaningful data to display
  const hasNoData = !caseBundle || (
    !caseBundle.instance &&
    (!caseBundle.stages || caseBundle.stages.length === 0) &&
    !caseBundle.executionHistory &&
    (!caseBundle.actionTasks || caseBundle.actionTasks.length === 0)
  );

  const hasApiErrors = caseBundle?.warnings && caseBundle.warnings.length > 0;

  return (
    <div className="space-y-8">
      {/* API Error Banner */}
      {hasApiErrors && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-amber-800 mb-2">Data Loading Issues Detected</h4>
              <ul className="space-y-1">
                {caseBundle?.warnings?.map((warning, idx) => (
                  <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-3">
                The case trace may display incomplete information. Click "Refresh Trace" to retry loading the data.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <XCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-red-800">Error Loading Case Trace</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
          {feedback}
        </div>
      )}

      {traceWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
          {traceWarning}
        </div>
      )}

      {/* No Data State */}
      {hasNoData && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <AlertCircle className="text-slate-400" size={32} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No Case Trace Data Available</h3>
            <p className="text-sm text-slate-500 mb-6">
              Unable to load case trace information. This could be due to:
            </p>
            <ul className="text-sm text-slate-500 text-left space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>The case has not been created in UiPath yet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>Network connectivity issues or API timeout</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>Insufficient permissions to access case data</span>
              </li>
            </ul>
            <button
              onClick={refreshCaseData}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              <RotateCw size={16} />
              Refresh Case Trace
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Only render when we have data */}
      {!hasNoData && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <MetricCard label="Current Run Status" value={caseSummary.latestRunStatus} tone="blue" />
            <MetricCard label="Current Stage" value={caseSummary.currentStage?.name || 'Not available'} tone="indigo" />
            <MetricCard label="Pending Tasks" value={String(caseSummary.pendingTasksCount)} tone="amber" />
            <MetricCard label="Completed Stages" value={`${caseSummary.completedStages}/${caseSummary.totalStages}`} tone="emerald" />
          </section>

          <section className="bg-slate-50 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Case Management Orchestration Canvas</h3>
                  {hasApiErrors && (
                    <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Showing partial data - some information may be missing
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Auto-Polling Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Auto-refresh</span>
                    <button
                      onClick={() => setAutoPolling(!autoPolling)}
                      className="flex items-center gap-1 transition-colors"
                    >
                      {autoPolling ? (
                        <ToggleRight size={24} className="text-blue-600" />
                      ) : (
                        <ToggleLeft size={24} className="text-slate-400" />
                      )}
                    </button>
                    {!autoPolling && (
                      <button
                        onClick={refreshCaseData}
                        disabled={isMutating}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={isMutating ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid h-[860px] grid-rows-[3fr_2fr] bg-slate-50">
              <div className="min-h-0 bg-slate-50">
                {orchestrationCanvas.nodes.length > 0 ? (
                  <ReactFlow
                    nodes={highlightedCanvasNodes}
                    edges={orchestrationCanvas.edges}
                    nodeTypes={processNodeTypes}
                    fitView
                    minZoom={0.45}
                    maxZoom={1.4}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    panOnScroll
                    onNodeClick={handleCanvasNodeClick}
                    onPaneClick={() => {
                      setSelectedCanvasNodeId(null);
                      setSelectedTrailRowId(null);
                    }}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{
                      type: 'step',
                      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
                      style: { stroke: '#64748b', strokeWidth: 2.2 },
                    }}
                  >
                    <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={18} size={1.2} />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-50">
                    <div className="text-center p-8">
                      <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
                          <AlertCircle className="text-slate-400" size={24} />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-600 mb-2">No Process Flow Available</h4>
                      <p className="text-xs text-slate-400 max-w-xs">
                        The case stages could not be loaded. This may be due to API errors or the case not having any stages defined yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid min-h-0 grid-cols-1 border-t border-slate-200 bg-white lg:grid-cols-2">
                <div className="border-r border-slate-200 overflow-y-auto flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 sticky top-0 z-10 bg-white">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">Hierarchical Execution Trail</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      {executionTrailRows.length > 0
                        ? `${executionTrailRows.length} stages with ${executionTrailRows.reduce((sum, stage) => sum + (stage.children?.length || 0), 0)} total steps`
                        : 'No execution data available'
                      }
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {executionTrailRows.length > 0 ? (
                      <div className="p-5">
                        <ExecutionTrail
                          rows={executionTrailRows}
                          selectedRowId={selectedTrailRowId}
                          onRowSelect={(row) => {
                            console.log('[ExecutionTrail] Row selected:', row);
                            setSelectedTrailRowId(row.id);
                          }}
                          onCanvasNodeClick={(nodeId) => {
                            setSelectedCanvasNodeId(nodeId);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full p-8">
                        <div className="text-center">
                          <div className="flex justify-center mb-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <Clock3 className="text-slate-400" size={20} />
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-500 mb-1">No Execution Trail</p>
                          <p className="text-xs text-slate-400">
                            Execution steps will appear here as the case progresses through its stages.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 sticky top-0 z-10 bg-white">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">Task Details</h4>
                  </div>

                  <div className="p-4 bg-slate-50 min-h-full">
                    {selectedExecutionRow ? (
                      <div className="space-y-4">
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-700 px-1">
                          Execution History for "{selectedExecutionRow.label}"
                        </h5>
                        
                        {(finalDetailsRows as unknown as ExecutionRunDetail[]).map((run) => (
                          <details 
                            key={run.id} 
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden group shadow-sm transition-all"
                            open={run.isLatest}
                          >
                            <summary className="px-4 py-3 cursor-pointer select-none flex items-center justify-between hover:bg-slate-50 transition-colors list-none">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-2 h-2 rounded-full ${
                                  /complete|success/i.test(run.status) ? 'bg-emerald-500' : 
                                  /fail|error/i.test(run.status) ? 'bg-red-500' : 'bg-blue-500'
                                }`} />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-700">{run.title}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getStatusPillClass(run.status)}`}>
                                  {run.status}
                                </span>
                                <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
                              </div>
                            </summary>
                            
                            <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                              <div className="space-y-2.5">
                                {run.details.map(([label, value]) => (
                                  <div key={label} className="flex justify-between items-start gap-4 py-1.5 border-b border-slate-50 last:border-0">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest shrink-0 mt-0.5">{label}</span>
                                    <div className="text-[11px] text-slate-800 font-bold text-right break-all">
                                      {label === 'Link' && String(value).startsWith('http') ? (
                                        <a
                                          href={String(value)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 font-black uppercase tracking-tight transition-colors"
                                        >
                                          View Job Details
                                          <Bot size={11} />
                                        </a>
                                      ) : (
                                        <span className={label === 'Error Info' || label.includes('Error') ? 'text-red-600' : ''}>
                                          {value}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400 mt-10">
                        <div className="flex justify-center mb-4">
                          <Bot size={48} className="opacity-10" />
                        </div>
                        <p className="text-sm font-bold">Select a task or stage from the execution trail to view complete details</p>
                        <p className="text-xs mt-2 max-w-[200px] mx-auto opacity-60">Full execution history and failure logs will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </section>
        </>
      )}

      <section className="bg-white rounded-2xl border-2 border-slate-100 p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Case Runtime Overview</h3>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-black mt-1">
              Powered by CaseInstances.getById, getStages, getExecutionHistory, getActionTasks
            </p>
          </div>
          <button
            onClick={refreshCaseData}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-blue-500 hover:text-blue-600"
          >
            Refresh Trace
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoPanel
            title="Instance Identity"
            rows={[
              ['Instance ID', caseBundle?.instance?.instanceId],
              ['Display Name', caseBundle?.instance?.instanceDisplayName],
              ['Process Key', caseBundle?.instance?.processKey],
              ['Folder Key', caseBundle?.instance?.folderKey],
              ['Started By', caseBundle?.instance?.startedByUser],
              ['Started Time', formatDateTime(caseBundle?.instance?.startedTime)],
              ['Completed Time', formatDateTime(caseBundle?.instance?.completedTime)],
            ]}
          />

          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-4">Case Controls</h4>
            <div className="space-y-3">
              <textarea
                value={operationComment}
                onChange={(e) => setOperationComment(e.target.value)}
                placeholder="Optional operation comment"
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500"
                rows={3}
              />
              <div className="grid grid-cols-2 gap-3">
                {shouldShowPauseButton(caseBundle?.instance) && (
                  <ActionButton label="Pause" onClick={() => runCaseOperation('pause')} loading={isMutating} />
                )}
                {shouldShowResumeButton(caseBundle?.instance) && (
                  <ActionButton label="Resume" onClick={() => runCaseOperation('resume')} loading={isMutating} />
                )}
                {shouldShowCancelButton(caseBundle?.instance) && (
                  <ActionButton label="Cancel" onClick={() => runCaseOperation('close')} loading={isMutating} danger />
                )}
                <ActionButton label="Refresh" onClick={refreshCaseData} loading={isMutating} subtle />
              </div>
              {shouldShowReopenButton(caseBundle?.instance) && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Reopen from stage</label>
                  <select
                    value={selectedReopenStageId}
                    onChange={(e) => setSelectedReopenStageId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select a stage...</option>
                    {(caseBundle?.stages ?? []).map((stage: any) => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => runCaseOperation('reopen')}
                    disabled={!selectedReopenStageId || isMutating}
                    className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    Reopen Case
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
