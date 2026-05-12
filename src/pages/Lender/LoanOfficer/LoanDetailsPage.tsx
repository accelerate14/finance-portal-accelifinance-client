import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUiPathAuth } from "../../../context/UiPathAuthContext";
import { useAuditLog } from "../../../hooks/useAuditLog";
import { Entities } from '@uipath/uipath-typescript/entities';
import { TaskType } from '@uipath/uipath-typescript/tasks';
import { jwtDecode } from 'jwt-decode';
import { getCaseTraceBundle, refreshCaseTraceBundle } from '../CaseServices/caseTraceService';
import {
  assignTaskToUser,
  completeSdkTask,
  filterTasksAssignedToUser,
  getTaskUsers,
  reassignTaskToUser,
  unassignTask,
} from '../CaseServices/taskService';
import CaseTracesTab from '../CaseServices/CaseTracesTab';
import TasksTab from '../../../components/Case/TasksTab';

export default function LoanDetailsPage() {
  const { loanId, borrowerId } = useParams<{ loanId: string; borrowerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const preResolvedInstanceId = location.state?.preResolvedInstanceId;
  const { isAuthenticated, sdk, user, roleLender } = useUiPathAuth();
  const { logAudit } = useAuditLog();

  const loanApplicationsEntityId =
    import.meta.env.VITE_LOAN_APPLICATION_ENTITY_ID;
  const personalInfoEntityId =
    import.meta.env.VITE_PERSONAL_INFO_ENTITY_ID;
  const employmentEntityId =
    import.meta.env.VITE_EMPLOYMENT_ENTITY_ID;
  const documentEntityId =
    import.meta.env.VITE_DOCUMENT_ENTITY_ID;
  const folderId = Number(
    import.meta.env.VITE_FLCM_FOLDER_ID,
  );
  const folderKey = import.meta.env.VITE_UIPATH_CASE_FOLDER_KEY;
  const processKey = import.meta.env.VITE_UIPATH_CASE_PROCESS_KEY;

  const [activeTab, setActiveTab] = useState<"application details" | "documents" | "case traces" | "tasks">("application details");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [caseBundle, setCaseBundle] = useState<any | null>(null);
  const [taskUsers, setTaskUsers] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedUserIdentifier, setSelectedUserIdentifier] = useState<string>('');
  const [completeAction, setCompleteAction] = useState('submit');
  const [operationComment, setOperationComment] = useState('');
  const [selectedReopenStageId, setSelectedReopenStageId] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traceWarning, setTraceWarning] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [pendingTaskCount, setPendingTaskCount] = useState<number>(0);
  const [actionTasks, setActionTasks] = useState<any[]>([]);
  const [loanOfficerComments, setLoanOfficerComments] = useState<string>("");
  const [isSavingComments, setIsSavingComments] = useState(false);
  const [commentsSaved, setCommentsSaved] = useState(false);

  const tokenKey = `uipath_sdk_user_token-${import.meta.env.VITE_UIPATH_CLIENT_ID}`;
  const lenderToken = sessionStorage.getItem(tokenKey);
  const decodedToken: any = lenderToken ? jwtDecode(lenderToken) : null;
  const loggedInEmail = decodedToken?.email || decodedToken?.upn || null;

  useEffect(() => {
    const fetchAllDetails = async () => {
      if (!sdk || !isAuthenticated) return;
      setLoading(true);
      setError(null);
      setTraceWarning(null);
      try {
        const entitiesService = new Entities(sdk);

        if (!loanApplicationsEntityId || !personalInfoEntityId || !employmentEntityId) {
          throw new Error("Missing entity IDs. Configure VITE_LOAN_APPLICATION_ENTITY_ID, VITE_PERSONAL_INFO_ENTITY_ID, and VITE_EMPLOYMENT_ENTITY_ID in .env");
        }

        const loanEntity = await entitiesService.getById(loanApplicationsEntityId);
        const personalInfoEntity = await entitiesService.getById(personalInfoEntityId);
        const employmentEntity = await entitiesService.getById(employmentEntityId);

        const [loanRes, profileRes, employRes] = await Promise.all([
          loanEntity.getAllRecords(),
          personalInfoEntity.getAllRecords(),
          employmentEntity.getAllRecords(),
        ]);

        const activeLoan = (loanRes.items as any[])?.find(r => r.Id === loanId) || loanRes.items?.[0];
        const resolvedBorrowerId = borrowerId || activeLoan?.UserId || activeLoan?.userId;

        let documents = null;
        if (activeLoan?.CaseId && documentEntityId) {
          try {
            const docRecords = await entitiesService.getAllRecords(documentEntityId);
            const caseDocs = (docRecords.items as any[]).filter((r: any) => r.CaseNumber === activeLoan.CaseId);
            if (caseDocs.length > 0) {
              documents = caseDocs[0];
            }
          } catch (docErr) {
            console.warn("Failed to fetch documents from SDK:", docErr);
          }
        }

        const bundle = activeLoan?.CaseId && folderKey
          ? await getCaseTraceBundle(sdk, {
              businessCaseId: activeLoan.CaseId,
              folderKey,
              processKey,
            }, preResolvedInstanceId)
          : null;

        if (folderId) {
          try {
            const users = await getTaskUsers(sdk, folderId);
            setTaskUsers(users);
          } catch (taskUserErr) {
            console.error('Task user lookup failed:', taskUserErr);
            setTaskUsers([]);
          }
        }

        setCaseBundle(bundle);
        setSelectedReopenStageId(bundle?.stages?.[0]?.id || '');
        setTraceWarning(bundle?.warnings?.join(' ') || null);

        // OPTIMIZATION: Use action tasks from bundle - no need for another getAll() fetch
        if (bundle?.actionTasks) {
          const filteredTasks = bundle.actionTasks.filter((task: any) => {
            if (task.isCompleted) return false;
            const assignedToUser = task.assignedToUser;
            const assignedToName = assignedToUser?.displayName || assignedToUser?.name || "";
            return assignedToName.toLowerCase().includes("loan officer");
          });
          setActionTasks(filteredTasks);
        }

        setData({
          loan: activeLoan,
          profile: (profileRes.items as any[])?.find(r => (r.UserId || r.userId) === resolvedBorrowerId) || profileRes.items?.[0],
          employment: (employRes.items as any[])?.find(r => (r.UserId || r.userId) === resolvedBorrowerId) || employRes.items?.[0],
          documents: documents,
          loanEntityId: loanApplicationsEntityId
        });
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err instanceof Error ? err.message : 'Unable to load case details');
      } finally {
        setLoading(false);
      }
    };
    fetchAllDetails();
  }, [loanId, borrowerId, sdk, isAuthenticated, loanApplicationsEntityId, personalInfoEntityId, employmentEntityId]);

  const handleSaveLoanOfficerComments = async () => {
    if (!sdk || !data?.loan?.Id || !loanApplicationsEntityId) return;

    const oldComments = data.loan?.LoanOfficerComments || data.loan?.loanOfficerComments || "";

    setIsSavingComments(true);
    setCommentsSaved(false);
    setError(null);

    try {
      const entitiesService = new Entities(sdk);
      await entitiesService.updateRecordsById(loanApplicationsEntityId, [{
        Id: data.loan.Id,
        LoanOfficerComments: loanOfficerComments
      }]);
      setCommentsSaved(true);
      setTimeout(() => setCommentsSaved(false), 3000);

      // Audit log - fire and forget
      logAudit({
        action: 'CommentsUpdated',
        entityType: 'Loan',
        entityId: data.loan.Id,
        caseId: data.loan?.CaseId || data.loan?.caseId || "",
        oldValue: { LoanOfficerComments: oldComments },
        newValue: { LoanOfficerComments: loanOfficerComments },
        description: `Loan officer comments updated for case ${data.loan?.CaseId || data.loan?.caseId}`,
        severity: 'Info'
      });
    } catch (err) {
      console.error("Failed to save loan officer comments:", err);
      setError(err instanceof Error ? err.message : "Failed to save comments");
    } finally {
      setIsSavingComments(false);
    }
  };

  // Initialize loan officer comments when data is loaded
  useEffect(() => {
    if (data?.loan) {
      setLoanOfficerComments(data.loan?.LoanOfficerComments || data.loan?.loanOfficerComments || data.loan?.Comments || data.loan?.comments || "");
    }
  }, [data?.loan]);

  const refreshCaseData = async () => {
    if (!sdk || !data?.loan?.CaseId || !folderKey) return;

    try {
      const bundle = await getCaseTraceBundle(sdk, {
        businessCaseId: data.loan.CaseId,
        folderKey,
        processKey,
      }, caseBundle?.instance?.instanceId || preResolvedInstanceId);
      setCaseBundle(bundle);
      setTraceWarning(bundle?.warnings?.join(' ') || null);
    } catch (err) {
      console.error('Refresh case data failed:', err);
    }
  };

  // Fast refresh — used by auto-polling in CaseTracesTab.
  // Skips resolveCaseInstance + redundant getAll() calls by reusing the known instanceId.
  const refreshCaseDataFast = async () => {
    const instanceId = caseBundle?.instance?.instanceId;
    if (!sdk || !instanceId || !folderKey || !caseBundle) return;

    try {
      const bundle = await refreshCaseTraceBundle(sdk, instanceId, folderKey, caseBundle);
      setCaseBundle(bundle);
    } catch (err) {
      console.error('Fast refresh failed, falling back to full refresh:', err);
      await refreshCaseData();
    }
  };

  // Refresh action tasks when task iframe is closed
  // OPTIMIZATION: Uses the known instanceId instead of searching for it with getAll()
  const refreshActionTasks = async (closedTaskId?: string) => {
    const instanceId = caseBundle?.instance?.instanceId || preResolvedInstanceId;
    if (!sdk || !instanceId || !folderKey) return;

    try {
      const { CaseInstances } = await import('@uipath/uipath-typescript/cases');
      const caseInstancesService = new CaseInstances(sdk);
      
      console.log('Loan Officer: Refreshing tasks for case instance:', instanceId);
      const tasksResponse = await caseInstancesService.getActionTasks(instanceId);
      const taskItems = (tasksResponse as any).items || tasksResponse || [];
      
      if (closedTaskId) {
        const closedTask = taskItems.find((t: any) => String(t.id) === String(closedTaskId));
        if (!closedTask || closedTask.isCompleted) {
          logAudit({
            action: 'TaskComplete',
            entityType: 'Task',
            entityId: String(closedTaskId),
            caseId: data?.loan?.CaseId || data?.loan?.caseId || "",
            description: `Task ${closedTaskId} was completed via Action Center by loan officer`,
            severity: 'Info',
            newValue: { completedBy: user }
          });
        }
      }

      // Filter: only show tasks that are NOT completed AND assigned to Loan Officer
      const filteredTasks = taskItems.filter((task: any) => {
        if (task.isCompleted) return false;
        const assignedToUser = task.assignedToUser;
        const assignedToName = assignedToUser?.displayName || assignedToUser?.name || "";
        return assignedToName.toLowerCase().includes("loan officer");
      });
      
      console.log('Loan Officer: Refreshed tasks:', filteredTasks.length);
      setActionTasks(filteredTasks);
    } catch (taskErr) {
      console.warn('Loan Officer: Failed to refresh action tasks:', taskErr);
    }
  };

  const runCaseOperation = async (operation: 'pause' | 'resume' | 'close' | 'reopen') => {
    if (!sdk || !caseBundle?.instance || !folderKey) return;

    setIsMutating(true);
    setFeedback(null);
    setError(null);

    try {
      const oldStatus = caseBundle?.status || caseBundle?.instance?.status || "Unknown";
      
      if (operation === 'pause') {
        await caseBundle.instance.pause({ comment: operationComment || undefined });
      }
      if (operation === 'resume') {
        await caseBundle.instance.resume({ comment: operationComment || undefined });
      }
      if (operation === 'close') {
        await caseBundle.instance.close({ comment: operationComment || undefined });
      }
      if (operation === 'reopen') {
        await caseBundle.instance.reopen({
          stageId: selectedReopenStageId,
          comment: operationComment || undefined,
        });
      }

      setFeedback(`Case ${operation} operation completed successfully.`);
      await refreshCaseData();

      // Audit log - fire and forget
      logAudit({
        action: `Case${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
        entityType: 'Case',
        entityId: data?.loan?.Id || "",
        caseId: data?.loan?.CaseId || data?.loan?.caseId || "",
        oldValue: { status: oldStatus, comment: operationComment },
        newValue: { status: operation, comment: operationComment },
        description: `Case ${operation} operation performed for case ${data?.loan?.CaseId || data?.loan?.caseId}`,
        severity: operation === 'close' ? 'Warning' : 'Info'
      });
    } catch (err) {
      console.error(`Case ${operation} failed:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${operation} case`);
    } finally {
      setIsMutating(false);
    }
  };

  const runTaskOperation = async (operation: 'assign' | 'reassign' | 'unassign' | 'complete') => {
    if (!sdk || !selectedTaskId) return;

    setIsMutating(true);
    setFeedback(null);
    setError(null);

    try {
      let result;
      const taskInfo = selectedTask ? { title: selectedTask.title, id: selectedTaskId } : { id: selectedTaskId };

      if (operation === 'assign') {
        result = await assignTaskToUser(sdk, selectedTaskId, { userNameOrEmail: selectedUserIdentifier });
      }

      if (operation === 'reassign') {
        result = await reassignTaskToUser(sdk, selectedTaskId, { userNameOrEmail: selectedUserIdentifier });
      }

      if (operation === 'unassign') {
        result = await unassignTask(sdk, selectedTaskId);
      }

      if (operation === 'complete') {
        result = await completeSdkTask(sdk, selectedTaskId, folderId, {
          action: completeAction,
          data: { caseId: data?.loan?.CaseId, completedBy: user },
          type: TaskType.App,
        });
      }

      setFeedback(result?.message || 'Task action completed successfully.');
      await refreshCaseData();

      // Audit log - fire and forget
      logAudit({
        action: `Task${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
        entityType: 'Task',
        entityId: String(selectedTaskId),
        caseId: data?.loan?.CaseId || data?.loan?.caseId || "",
        newValue: { task: taskInfo, operation, completedBy: user },
        description: `Task ${operation} operation performed: ${taskInfo.title || 'Task'} for case ${data?.loan?.CaseId || data?.loan?.caseId}`,
        severity: operation === 'complete' ? 'Info' : 'Warning'
      });
    } catch (err) {
      console.error(`Task ${operation} failed:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${operation} task`);
    } finally {
      setIsMutating(false);
    }
  };

  const { loan, profile, employment, documents } = data || {};
  const currentLoanStatus = String(loan?.CaseStatus || loan?.caseStatus || "").toLowerCase();
  const isRejected = currentLoanStatus === "reject";

  // Calculate pending task count from actionTasks for badge display
  // Also add 1 for portal-side tasks if applicable
  const hasPortalTasks = ['document review pending', 'loan scrutiny pending'].includes(currentLoanStatus) && 
    !actionTasks.some(t => t.caseId === data?.loan?.CaseId);
  const calculatedTaskCount = actionTasks.length + (hasPortalTasks ? 1 : 0);

  // Update pendingTaskCount when actionTasks or case status changes
  useEffect(() => {
    setPendingTaskCount(calculatedTaskCount);
  }, [calculatedTaskCount]);
  
  // Only show tasks when case status is "Document Review Pending" or "Loan Scrutiny Pending"
  // OR when there are actual action tasks assigned to the user
  const shouldShowTasks = ['document review pending', 'loan scrutiny pending'].includes(currentLoanStatus) || actionTasks.length > 0;
  const userScopedTasks = shouldShowTasks ? actionTasks : [];
  const selectedTask = useMemo(
    () => userScopedTasks.find((task: any) => task.id === selectedTaskId) || null,
    [userScopedTasks, selectedTaskId],
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white text-slate-900 text-sm font-bold uppercase tracking-widest">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Loading Data...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-blue-100">
      <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-20">
        <div className="w-full 2xl:px-8 mx-auto px-4 md:px-8 py-4 md:py-0 min-h-[5rem] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 xl:gap-0">
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={() => navigate('/lender/dashboard')} className="p-2 md:p-3 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200 flex-shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2 md:gap-3">
                <span>{profile?.FirstName} {profile?.LastName}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {loan?.CaseId || loan?.caseId || "N/A"}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loan Application Detail</p>
            </div>
          </div>

          <nav className="flex w-full xl:w-auto overflow-x-auto hide-scrollbar bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1">
            {["application details", "documents", "case traces", "tasks"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "application details" | "documents" | "case traces" | "tasks")}
                className={`px-4 md:px-8 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest relative whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span className="flex items-center gap-1.5">
                  {tab}
                  {tab === "tasks" && pendingTaskCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                      {pendingTaskCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="w-full 2xl:px-8 mx-auto p-8 lg:p-12">
        <div className="w-full">
          <div className="space-y-6">
            {activeTab === "application details" ? (
              <>
                {/* Application Summary Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{profile?.FirstName} {profile?.LastName}</h2>
                        <p className="text-blue-100 text-sm">Application #{loan?.CaseId || loan?.caseId || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-blue-100 text-xs uppercase tracking-wider">Loan Amount</p>
                        <p className="text-3xl font-bold">${loan?.LoanAmount?.toLocaleString() || "0"}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${getStatusBadgeClass(loan?.CaseStatus || loan?.caseStatus)}`}>
                        {loan?.CaseStatus || loan?.caseStatus || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column - Borrower Information */}
                  <div className="xl:col-span-1 space-y-6">
                    {/* Personal Information Card */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Personal Information</h3>
                      </div>
                      <div className="p-5 space-y-4">
                        <InfoRow icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        } label="Full Name" value={`${profile?.FirstName || ""} ${profile?.LastName || ""}`} />
                        <InfoRow icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        } label="Email" value={profile?.Email} />
                        <InfoRow icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        } label="Phone" value={profile?.PhoneNumber || profile?.phoneNumber} />
                        <InfoRow icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        } label="Date of Birth" value={profile?.DateOfBirth ? new Date(profile.DateOfBirth).toLocaleDateString() : "N/A"} />
                        <InfoRow icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                        } label="SSN" value={maskSSN(profile?.SSN)} />
                        <InfoRow icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        } label="Address" value={`${profile?.Address || ""}${profile?.City ? ", " + profile.City : ""}${profile?.State ? ", " + profile.State : ""} ${profile?.ZipCode || ""}`} />
                        <InfoRow icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                          </svg>
                        } label="Education" value={profile?.HighestDegree || profile?.highestDegree} />
                      </div>
                    </section>

                    {/* Application IDs Card */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Application IDs</h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <CopyField label="Case ID" value={loan?.CaseId || loan?.caseId} />
                        <CopyField label="Loan Record ID" value={loan?.Id} />
                        <CopyField label="Borrower ID" value={loan?.UserId || loan?.userId} />
                      </div>
                    </section>
                  </div>

                  {/* Right Column - Employment & Loan Details */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Employment Information Card */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Employment Information</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getEmploymentStatusClass(employment?.EmploymentStatus || employment?.employmentStatus)}`}>
                          {employment?.EmploymentStatus || employment?.employmentStatus || "N/A"}
                        </span>
                      </div>
                      <div className="p-5">
                        {/* Income Highlight */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100 mb-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Monthly Income</p>
                              <p className="text-3xl font-bold text-emerald-700 mt-1">
                                {employment?.MonthlyIncome || employment?.monthlyIncome ? `$${Number(employment?.MonthlyIncome || employment?.monthlyIncome).toLocaleString()}` : "N/A"}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-200 rounded-xl flex items-center justify-center">
                              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Employment Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          } label="Employer Name" value={employment?.EmployerName || employment?.employerName} />
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          } label="Compensation Type" value={employment?.CompensationType || employment?.compensationType} />
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          } label="Years at Employer" value={employment?.YearsAtEmployer || employment?.yearsAtEmployer} />
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          } label="Employer Address" value={employment?.EmployerAddress || employment?.employerAddress} />
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          } label="Employer Location" value={`${employment?.EmployerCity || employment?.employerCity || ""}${employment?.EmployerState || employment?.employerState ? ", " + (employment?.EmployerState || employment?.employerState) : ""} ${employment?.EmployerZipCode || employment?.employerZipCode || ""}`} />
                        </div>
                      </div>
                    </section>

                    {/* Loan Details Card */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Loan Details</h3>
                      </div>
                      <div className="p-5">
                        {/* Loan Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <SummaryCard 
                            label="Loan Amount" 
                            value={`$${loan?.LoanAmount?.toLocaleString() || "0"}`} 
                            icon={
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            }
                            color="blue"
                          />
                          <SummaryCard 
                            label="Interest Rate" 
                            value={loan?.InterestRate || loan?.interestRate ? `${loan?.InterestRate || loan?.interestRate}%` : "N/A"} 
                            icon={
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            }
                            color="amber"
                          />
                          <SummaryCard 
                            label="Monthly Payment" 
                            value={loan?.MonthlyPayment || loan?.monthyPayment ? `$${Number(loan?.MonthlyPayment || loan?.monthyPayment).toLocaleString()}` : "N/A"} 
                            icon={
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            }
                            color="emerald"
                          />
                          <SummaryCard 
                            label="Total Payment" 
                            value={loan?.TotalPayment || loan?.totalPayment ? `$${Number(loan?.TotalPayment || loan?.totalPayment).toLocaleString()}` : "N/A"} 
                            icon={
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            }
                            color="indigo"
                          />
                        </div>

                        {/* Loan Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          } label="Loan Purpose" value={loan?.PurposeOfLoan || loan?.purposeOfLoan} />
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          } label="Term Length" value={loan?.TermOfLoan || loan?.termOfLoan ? `${loan?.TermOfLoan || loan?.termOfLoan} Months` : "N/A"} />
                          <InfoRow icon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          } label="Application Date" value={loan?.CreateTime ? new Date(loan.CreateTime).toLocaleDateString() : "N/A"} />
                          {/* Loan Officer Comments - Editable Textarea */}
                          <div className="md:col-span-2">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Loan Officer Comments</p>
                                <textarea
                                  value={loanOfficerComments}
                                  onChange={(e) => setLoanOfficerComments(e.target.value)}
                                  placeholder="Enter your comments about this loan application..."
                                  rows={4}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                />
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    {commentsSaved && (
                                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Comments saved successfully
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={handleSaveLoanOfficerComments}
                                    disabled={isSavingComments || !loanOfficerComments.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                  >
                                    {isSavingComments ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        Save Comments
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rejection Reason (if applicable) */}
                        {isRejected && (
                          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Rejection Reason</p>
                                <p className="text-sm text-red-600 mt-1">{loan?.RejectionReason || loan?.rejectionReason || loan?.RejectReason || loan?.rejectReason || "N/A"}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </>
            ) : activeTab === 'documents' ? (
              <section className="bg-white rounded-2xl border-2 border-slate-100 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-8 border-b-2 border-slate-50 pb-4">Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  {[
                    { label: "Driver's License", key: "DriversLicense" },
                    { label: "Recent Pay Stub", key: "PayStub" },
                    { label: "Loan Agreement", key: "LoanAgreement" },
                  ].map((doc) => (
                    <div key={doc.key} className="flex items-center justify-between p-6 rounded-2xl border-2 border-slate-100 group hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div>
                          <span className="text-base font-black text-slate-800 block uppercase tracking-tight">{doc.label}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Required for compliance</span>
                        </div>
                      </div>
                      {documents?.[doc.key] ? (
                        <button
                          onClick={() => window.open(documents[doc.key], '_blank')}
                          className="bg-white border-2 border-slate-200 hover:border-blue-600 px-6 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-blue-600 transition-all shadow-sm active:scale-95"
                        >
                          OPEN
                        </button>
                      ) : (
                        <span className="text-xs font-black text-red-400 border-2 border-red-50 px-4 py-2 rounded-xl uppercase italic">Not uploaded yet</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : activeTab === 'case traces' ? (
<CaseTracesTab
  caseBundle={caseBundle}
  refreshCaseData={refreshCaseData}
  isMutating={isMutating}
  feedback={feedback}
  error={error}
  traceWarning={traceWarning}
  operationComment={operationComment}
  setOperationComment={setOperationComment}
  selectedReopenStageId={selectedReopenStageId}
  setSelectedReopenStageId={setSelectedReopenStageId}
  runCaseOperation={runCaseOperation}
  sdk={sdk}
  folderKey={folderKey}
  processKey={processKey}
  roleLender={roleLender as "Loan Officer" | "Underwriter"}
  refreshCaseDataFast={refreshCaseDataFast}
/>
            ) : (
              <div className="space-y-8">
                {tasksError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 font-bold text-sm">
                    {tasksError}
                  </div>
                )}
                <TasksTab
                  caseStatus={data.loan?.CaseStatus || data.loan?.caseStatus || ""}
                  caseBundle={caseBundle}
                  loanId={loanId || ""}
                  borrowerId={borrowerId || ""}
                  isMutating={isMutating}
                  onError={(err: string) => setError(err)}
                  onTaskCountChange={(count) => setPendingTaskCount(count)}
                  actionTasks={actionTasks}
                  onTaskCompleted={(taskId) => {
                    console.log("Task completed:", taskId);
                    refreshActionTasks(taskId);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | undefined }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string | undefined }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{label}</p>
        <p className="text-sm font-mono font-semibold text-slate-700">{value || "—"}</p>
      </div>
      <button
        onClick={handleCopy}
        className="p-2 hover:bg-slate-200 rounded-md transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012-2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: 'blue' | 'amber' | 'emerald' | 'indigo' }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  };

  const iconColorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function getStatusBadgeClass(status: string | undefined): string {
  const lowerStatus = (status || "").toLowerCase();
  switch (lowerStatus) {
    case 'approved':
    case 'approved pending signing':
      return 'bg-emerald-500 text-white';
    case 'rejected':
    case 'reject':
      return 'bg-red-500 text-white';
    case 'pending':
    case 'document review pending':
    case 'loan scrutiny pending':
      return 'bg-amber-500 text-white';
    case 'in review':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
}

function getEmploymentStatusClass(status: string | undefined): string {
  const lowerStatus = (status || "").toLowerCase();
  switch (lowerStatus) {
    case 'employed':
    case 'full-time':
      return 'bg-emerald-100 text-emerald-700';
    case 'self-employed':
      return 'bg-blue-100 text-blue-700';
    case 'part-time':
      return 'bg-amber-100 text-amber-700';
    case 'unemployed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function maskSSN(ssn: string | undefined): string {
  if (!ssn) return "N/A";
  const cleaned = ssn.replace(/[-\s]/g, '');
  if (cleaned.length >= 4) {
    return `***-**-${cleaned.slice(-4)}`;
  }
  return ssn;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

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
      className={`rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
        danger
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

function Detail({ label, value, bold = false, className = "" }: { label: string, value: any, bold?: boolean, className?: string }) {
  return (
    <div className={className}>
      <label className="text-[10px] text-slate-400 uppercase tracking-[0.15em] block mb-1.5 font-black">{label}</label>
      <p className={`text-base text-slate-800 ${bold ? 'font-black' : 'font-bold'}`}>{value || "—"}</p>
    </div>
  );
}