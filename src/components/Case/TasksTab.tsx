import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface TasksTabProps {
  caseStatus: string;
  caseBundle: any;
  loanId: string;
  borrowerId: string;
  isMutating: boolean;
  onError?: (error: string) => void;
  onTaskCountChange?: (count: number) => void;
  actionTasks?: any[]; // Direct action tasks fetched from UiPath
  onTaskCompleted?: (taskId?: string) => void; // Callback when task iframe is closed (to trigger refresh)
}

export default function TasksTab({
  caseStatus,
  caseBundle,
  loanId,
  borrowerId,
  isMutating,
  onError,
  onTaskCountChange,
  actionTasks: propActionTasks,
  onTaskCompleted,
}: TasksTabProps) {
  const navigate = useNavigate();
  const [actionTaskUrl, setActionTaskUrl] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showActionTaskIframe, setShowActionTaskIframe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const setError = (msg: string) => {
    setLocalError(msg);
    onError?.(msg);
  };

  // Check if caseStatus contains "Underwriter" - if so, skip for Loan Officer
  const isUnderwriterTask = caseStatus.toLowerCase().includes("underwriter");

  // Build tasks based on caseStatus
  const tasks: Array<{
    id: string;
    type: string;
    status: string;
    description: string;
    action: string;
    hasUrl?: boolean;
  }> = [];

  // Use actionTasks from props if provided, otherwise fall back to caseBundle
  const actionTasks = propActionTasks || caseBundle?.actionTasks || [];

  // Filter pending/unassigned tasks
  const pendingTasks = actionTasks.filter(
    (t: any) =>
      t.status?.toLowerCase().includes("pending") ||
      t.status?.toLowerCase().includes("unassigned") ||
      t.status?.toLowerCase().includes("ready")
  );

  // For Underwriter Agreement Sign Pending, show the sign task
  if (isUnderwriterTask && caseStatus?.toLowerCase() === "underwriter agreement sign pending") {
    tasks.push({
      id: "agreement-sign",
      type: "Agreement Sign",
      status: "Pending",
      description: "Sign the loan agreement",
      action: "Sign Agreement",
    });
  }

  // Notify parent of task count
  const pendingTaskCount = pendingTasks.length;
  
  // For all other statuses, show actual tasks from case instance
  if (pendingTaskCount > 0) {
    pendingTasks.forEach((task: any) => {
      // Skip if this is an agreement sign task (handled separately)
      if (isUnderwriterTask && caseStatus?.toLowerCase() === "underwriter agreement sign pending") {
        return;
      }

      tasks.push({
        id: task.id,
        type: task.title || task.name || task.displayName || task.type || "Task",
        status: task.status || "Pending",
        description: task.description || task.title || task.name || "No description available",
        action: "Open",
        hasUrl: true,
      });
    });
  } else if (!isUnderwriterTask || caseStatus?.toLowerCase() !== "underwriter agreement sign pending") {
    // No tasks found
    tasks.push({
      id: "no-task",
      type: "No Tasks Available",
      status: "N/A",
      description: `No pending tasks found for case status: ${caseStatus}`,
      action: "N/A",
      hasUrl: false,
    });
  }

  const handleTaskAction = async (taskId: string) => {
    // Agreement Sign always navigates
    if (taskId === "agreement-sign") {
      navigate(`/underwriter/agreement-sign/${loanId}/${borrowerId}`);
      return;
    }

    // For review tasks, build the task URL from env and show in iframe
    try {
      setLocalError(null);

      // Build task URL from org name and tenant name using dedicated task base URL
      const orgName = import.meta.env.VITE_UIPATH_ORG_NAME;
      const tenantName = import.meta.env.VITE_UIPATH_TENANT_NAME;
      
        if (orgName && tenantName) {
        const taskBaseUrl = import.meta.env.VITE_UIPATH_TASK_BASE_URL || 'https://cloud.uipath.com';
        const taskUrl = `${taskBaseUrl}/embed_/${orgName}/${tenantName}/actions_/current-task/tasks/${taskId}`;
        setActiveTaskId(taskId);
        setActionTaskUrl(taskUrl);
        setShowActionTaskIframe(true);
      } else {
        setError("Unable to build task URL. Missing org or tenant configuration.");
      }
    } catch (err) {
      console.error("Failed to build task URL:", err);
      setError("Error retrieving action task");
    }
  };

  const closeActionTaskIframe = () => {
    setShowActionTaskIframe(false);
    setActionTaskUrl(null);
    const id = activeTaskId;
    setActiveTaskId(null);
    // Notify parent to refresh task data
    onTaskCompleted?.(id || undefined);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center text-slate-400 font-bold py-8">
        {isUnderwriterTask
          ? "No pending underwriter tasks"
          : "No pending tasks for this case"}
      </div>
    );
  }

  // Calculate total task count (including agreement sign if applicable)
  const totalTaskCount = isUnderwriterTask && caseStatus?.toLowerCase() === "underwriter agreement sign pending" 
    ? pendingTaskCount + 1 
    : pendingTaskCount;

  // Notify parent of task count
  useEffect(() => {
    onTaskCountChange?.(totalTaskCount);
  }, [totalTaskCount, onTaskCountChange]);

  return (
    <div className="space-y-4">
      {/* Task Count Header */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {totalTaskCount} Pending Task{totalTaskCount !== 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Requires your attention</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
          totalTaskCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
        }`}>
          {totalTaskCount > 0 ? "Action Required" : "All Clear"}
        </span>
      </div>

      {localError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 font-bold text-sm">
          {localError}
        </div>
      )}

      {showActionTaskIframe && actionTaskUrl ? (
        <div className="rounded-xl border-2 border-indigo-200 overflow-hidden">
          <div className="flex items-center justify-between bg-indigo-50 px-4 py-3 border-b border-indigo-200">
            <h3 className="font-bold text-indigo-900">Action Center Task</h3>
            <button
              onClick={closeActionTaskIframe}
              className="text-indigo-600 hover:text-indigo-800 font-bold text-sm"
            >
              Close
            </button>
          </div>
          <iframe
            src={actionTaskUrl}
            className="w-full h-[800px] border-0"
            title="Action Center Task"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border-2 border-slate-200 p-4 hover:border-indigo-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{task.type}</h3>
                  <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                  <span
                    className={`inline-block mt-2 text-[10px] font-bold px-2 py-1 rounded uppercase ${
                      task.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
                <button
                  onClick={() => handleTaskAction(task.id)}
                  disabled={isMutating}
                  className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMutating ? "Loading..." : task.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}