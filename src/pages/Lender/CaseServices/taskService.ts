import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import { CaseInstances } from '@uipath/uipath-typescript/cases';
import type {
  TaskAssignOptions,
  TaskCompletionOptions,
  TaskGetResponse,
} from '@uipath/uipath-typescript/tasks';
import type { UiPath } from '@uipath/uipath-typescript/core';
import type { TaskMutationResult } from './types';

export function filterTasksAssignedToUser(tasks: TaskGetResponse[], userEmail?: string | null) {
  const normalizedEmail = String(userEmail ?? '').trim().toLowerCase();

  if (!normalizedEmail) return tasks;

  return tasks.filter((task) => {
    const assignedEmail = String(task.assignedToUser?.emailAddress ?? '').trim().toLowerCase();
    const assignmentEmails =
      task.taskAssignments
        ?.map((assignment) => String(assignment.assignee?.emailAddress ?? '').trim().toLowerCase())
        .filter(Boolean) ?? [];

    return assignedEmail === normalizedEmail || assignmentEmails.includes(normalizedEmail);
  });
}

export async function getTaskUsers(sdk: UiPath, folderId: number) {
  const tasksService = new Tasks(sdk);
  const response = await tasksService.getUsers(folderId);
  return response.items;
}

export async function assignTaskToUser(
  sdk: UiPath,
  taskId: number,
  options: TaskAssignOptions,
): Promise<TaskMutationResult> {
  const tasksService = new Tasks(sdk);
  const result = await tasksService.assign({ taskId, ...options });
  return {
    success: result.success,
    message: result.success ? 'Task assigned successfully.' : 'Failed to assign task.',
  };
}

export async function reassignTaskToUser(
  sdk: UiPath,
  taskId: number,
  options: TaskAssignOptions,
): Promise<TaskMutationResult> {
  const tasksService = new Tasks(sdk);
  const result = await tasksService.reassign({ taskId, ...options });
  return {
    success: result.success,
    message: result.success ? 'Task reassigned successfully.' : 'Failed to reassign task.',
  };
}

export async function unassignTask(sdk: UiPath, taskId: number): Promise<TaskMutationResult> {
  const tasksService = new Tasks(sdk);
  const result = await tasksService.unassign(taskId);
  return {
    success: result.success,
    message: result.success ? 'Task unassigned successfully.' : 'Failed to unassign task.',
  };
}

export async function completeSdkTask(
  sdk: UiPath,
  taskId: number,
  folderId: number,
  payload?: { action?: string; data?: Record<string, unknown>; type?: string },
): Promise<TaskMutationResult> {
  const tasksService = new Tasks(sdk);

  const type = payload?.type === TaskType.External ? TaskType.External : TaskType.App;

  const options: TaskCompletionOptions =
    type === TaskType.External
      ? { taskId, type }
      : {
          taskId,
          type: TaskType.App,
          action: payload?.action || 'submit',
          data: payload?.data ?? {},
        };

  const result = await tasksService.complete(options, folderId);
  return {
    success: result.success,
    message: result.success ? 'Task completed successfully.' : 'Failed to complete task.',
  };
}

