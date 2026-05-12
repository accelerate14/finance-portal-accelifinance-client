import type {
  CaseGetStageResponse,
  CaseInstanceExecutionHistoryResponse,
  CaseInstanceGetResponse,
} from '@uipath/uipath-typescript/cases';
import type { TaskGetResponse } from '@uipath/uipath-typescript/tasks';

export interface CaseDefinitionNodeTask {
  id?: string;
  elementId?: string;
  type?: string;
  displayName?: string;
  data?: Record<string, unknown>;
}

export interface CaseDefinitionNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  measured?: { width?: number; height?: number };
  style?: { width?: number; height?: number; opacity?: number };
  data?: {
    label?: string;
    tasks?: CaseDefinitionNodeTask[][];
    [key: string]: unknown;
  };
}

export interface CaseDefinitionEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    waypoints?: Array<{ x: number; y: number; original?: { x: number; y: number } }>;
    [key: string]: unknown;
  };
}

export interface CaseDefinitionJson {
  root?: {
    id?: string;
    name?: string;
    type?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
  };
  nodes?: CaseDefinitionNode[];
  edges?: CaseDefinitionEdge[];
}

export interface CaseTraceBundle {
  instance: CaseInstanceGetResponse | null;
  stages: CaseGetStageResponse[];
  executionHistory: CaseInstanceExecutionHistoryResponse | null;
  actionTasks: TaskGetResponse[];
  caseDefinition?: CaseDefinitionJson | null;
  warnings?: string[];
}

export interface FlattenedStageTask {
  stageId: string;
  stageName: string;
  stageStatus: string;
  taskIndex: number;
  id: string;
  name: string;
  status: string;
  type: string;
  startedTime?: string;
  completedTime?: string;
}

export interface TaskMutationResult {
  success: boolean;
  message: string;
}