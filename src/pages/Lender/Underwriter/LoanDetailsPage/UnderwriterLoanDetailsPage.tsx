import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUiPathAuth } from "../../../../context/UiPathAuthContext";
import { Entities } from '@uipath/uipath-typescript/entities';
import { TaskType } from '@uipath/uipath-typescript/tasks';
import { jwtDecode } from 'jwt-decode';
import { getCaseTraceBundle, refreshCaseTraceBundle } from '../../CaseServices/caseTraceService';
import {
  assignTaskToUser,
  completeSdkTask,
  filterTasksAssignedToUser,
  getTaskUsers,
  reassignTaskToUser,
  unassignTask,
} from '../../CaseServices/taskService';
import CaseTracesTab from '../../CaseServices/CaseTracesTab';
import TasksTab from '../../../../components/Case/TasksTab';
import { useAuditLog } from '../../../../hooks/useAuditLog';

export default function UnderwriterLoanDetailsPage() {
  const { loanId, borrowerId } = useParams<{ loanId: string; borrowerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const preResolvedInstanceId = location.state?.preResolvedInstanceId;
  const { isAuthenticated, sdk, user } = useUiPathAuth();
  const { logAudit } = useAuditLog();

  const loanApplicationsEntityId = import.meta.env.VITE_LOAN_APPLICATION_ENTITY_ID;
  const personalInfoEntityId = import.meta.env.VITE_PERSONAL_INFO_ENTITY_ID;
  const employmentEntityId = import.meta.env.VITE_EMPLOYMENT_ENTITY_ID;
  const documentEntityId = import.meta.env.VITE_DOCUMENT_ENTITY_ID;
  const folderId = Number(import.meta.env.VITE_FLCM_FOLDER_ID);
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
  const [pendingTaskCount, setPendingTaskCount] = useState<number>(0);
  const [actionTasks, setActionTasks] = useState<any[]>([]);
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

        // Use action tasks from bundle - no need for another getAll() fetch
        if (bundle?.actionTasks) {
          const filteredTasks = bundle.actionTasks.filter((task: any) => {
            if (task.isCompleted) return false;
            const assignedToUser = task.assignedToUser;
            const assignedToName = assignedToUser?.displayName || assignedToUser?.name || "";
            return assignedToName.toLowerCase().includes("underwriter");
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
  const refreshActionTasks = async (closedTaskId?: string) => {
    const instanceId = caseBundle?.instance?.instanceId || preResolvedInstanceId;
    if (!sdk || !instanceId || !folderKey) return;
    try {
      const { CaseInstances } = await import('@uipath/uipath-typescript/cases');
      const caseInstancesService = new CaseInstances(sdk);

      console.log('Underwriter: Refreshing tasks for case instance:', instanceId);
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
            description: `Task ${closedTaskId} was completed via Action Center by underwriter`,
            severity: 'Info',
            newValue: { completedBy: user }
          });
        }
      }

      const filteredTasks = taskItems.filter((task: any) => {
        if (task.isCompleted) return false;
        const assignedToUser = task.assignedToUser;
        const assignedToName = assignedToUser?.displayName || assignedToUser?.name || "";
        return assignedToName.toLowerCase().includes("underwriter");
      });

      console.log('Underwriter: Refreshed tasks:', filteredTasks.length);
      setActionTasks(filteredTasks);
    } catch (taskErr) {
      console.warn('Underwriter: Failed to refresh action tasks:', taskErr);
    }
  };
  const runCaseOperation = async (operation: 'pause' | 'resume' | 'close' | 'reopen') => {
    if (!sdk || !caseBundle?.instance || !folderKey) return;
    setIsMutating(true);
    setFeedback(null);
    setError(null);
    try {
      const oldStatus = caseBundle?.status || caseBundle?.instance?.status || "Unknown";
      if (operation === 'pause') await caseBundle.instance.pause({ comment: operationComment || undefined });
      if (operation === 'resume') await caseBundle.instance.resume({ comment: operationComment || undefined });
      if (operation === 'close') await caseBundle.instance.close({ comment: operationComment || undefined });
      if (operation === 'reopen') await caseBundle.instance.reopen({ stageId: selectedReopenStageId, comment: operationComment || undefined });
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

  const selectedTask = useMemo(() => {
    if (!caseBundle?.tasks || !selectedTaskId) return null;
    return caseBundle.tasks.find((t: any) => t.id === selectedTaskId);
  }, [caseBundle?.tasks, selectedTaskId]);

  const allTasks = [
    ...(caseBundle?.tasks || []),
    ...filterTasksAssignedToUser(caseBundle?.tasks || [], loggedInEmail),
  ];

  const filteredTasks = useMemo(() => {
    const seen = new Set<number>();
    return allTasks.filter((t: any) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [allTasks]);

  const caseStatus = data?.loan?.CaseStatus || data?.loan?.caseStatus || "Unknown";

  const hasPortalSignTask = caseStatus?.toLowerCase() === "underwriter agreement sign pending" &&
    !actionTasks.some(t => t.caseId === data?.loan?.CaseId);
  const calculatedTaskCount = actionTasks.length + (hasPortalSignTask ? 1 : 0);

  useEffect(() => {
    setPendingTaskCount(calculatedTaskCount);
  }, [calculatedTaskCount]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Case Details</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-red-600 font-bold">Unable to load case details.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="w-full 2xl:px-8 mx-auto p-6">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
          <div>
            <button onClick={() => navigate("/underwriter/dashboard")} className="text-indigo-600 font-bold text-sm mb-2">← Back</button>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Underwriter Case Review</h1>
            <p className="text-slate-500 text-sm font-medium">Loan ID: {data.loan?.CaseId || data.loan?.caseId}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 font-bold text-sm">
            {error}
          </div>
        )}
        {feedback && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 font-bold text-sm">
            {feedback}
          </div>
        )}
        {traceWarning && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-700 font-bold text-sm">
            {traceWarning}
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto hide-scrollbar scroll-smooth">
          {(["application details", "documents", "case traces", "tasks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 whitespace-nowrap px-4 py-3 font-bold text-sm uppercase tracking-widest transition-colors relative ${
                activeTab === tab
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
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
        </div>

        {/* TAB CONTENT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {activeTab === "application details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Case Status" value={caseStatus} tone="indigo" />
                <MetricCard label="Loan Amount" value={`$${(data.loan?.loanAmount || data.loan?.LoanAmount || 0).toLocaleString()}`} tone="emerald" />
                <MetricCard label="Term" value={`${data.loan?.termOfLoan || data.loan?.TermOfLoan || 0} months`} tone="blue" />
                <MetricCard label="Applicant" value={data.profile?.FirstName + " " + data.profile?.LastName || "—"} tone="amber" />
              </div>

              <InfoPanel title="Loan Information" rows={[
                ["Case ID", data.loan?.CaseId || data.loan?.caseId],
                ["Application Date", formatDateTime(data.loan?.requestedOn || data.loan?.RequestedOn)],
                ["Purpose", data.loan?.PurposeOfLoan || data.loan?.purposeOfLoan],
                ["Interest Rate", `${data.loan?.InterestRate || data.loan?.interestRate || 0}%`],
                ["Total Amount to Repay", `$${(data.loan?.totalPayment || data.loan?.TotalPayment || 0).toLocaleString()}`],
                ["Monthly Payment", `$${(data.loan?.monthlyPayment || data.loan?.MonthlyPayment || 0).toLocaleString()}`],
                ["Loan Term", `${data.loan?.termOfLoan || data.loan?.TermOfLoan || 0} months`],
                ["Loan Officer Comments", data.loan?.LoanOfficerComments || data.loan?.loanOfficerComments],
                ["Rejection Reason", data.loan?.RejectionReason || data.loan?.rejectionReason || "—"],
              ]} />

              <InfoPanel title="Borrower Information" rows={[
                ["Full Name", `${data.profile?.FirstName || data.profile?.firstName || ""} ${data.profile?.LastName || data.profile?.lastName || ""}`],
                ["Email", data.profile?.Email || data.profile?.email],
                ["Phone", data.profile?.PhoneNumber || data.profile?.phoneNumber],
                ["Date of Birth", data.profile?.DateOfBirth || data.profile?.dateOfBirth],
                ["Address", `${data.profile?.Address || data.profile?.address || ""}, ${data.profile?.City || data.profile?.city || ""}, ${data.profile?.State || data.profile?.state || ""}, ${data.profile?.ZipCode || data.profile?.zipCode || ""}`],
              ]} />

              <InfoPanel title="Employment Information" rows={[
                ["Status", data.employment?.EmploymentStatus || data.employment?.employmentStatus],
                ["Employer", data.employment?.EmployerName || data.employment?.employerName],
                ["Employment Since", data.employment?.yearsAtEmployer || data.employment?.YearsAtEmployer],
                ["Monthly Income", `$${(Number(data.employment?.MonthlyIncome || data.employment?.monthlyIncome || 0)).toLocaleString()}`],
                ["Employment Status", data.employment?.EmploymentStatus || data.employment?.employmentStatus],
                ["Compensation Type", data.employment?.CompensationType || data.employment?.compensationType],
                ["Employer Address", `${data.employment?.EmployerAddress || data.employment?.employerAddress || ""}, ${data.employment?.EmployerCity || data.employment?.employerCity || ""}, ${data.employment?.EmployerState || data.employment?.employerState || ""}, ${data.employment?.EmployerZipCode || data.employment?.employerZipCode || ""}`],
              ]} />
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {[
                  { label: "Driver's License", key: "DriversLicense" },
                  { label: "Recent Pay Stub", key: "PayStub" },
                  { label: "Loan Agreement", key: "LoanAgreement" },
                ].map((doc) => (
                  <div key={doc.key} className="flex items-center justify-between p-6 rounded-2xl border-2 border-slate-100 group hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-base font-black text-slate-800 block uppercase tracking-tight">{doc.label}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Required for compliance</span>
                      </div>
                    </div>
                    {data.documents?.[doc.key] ? (
                      <button
                        onClick={() => window.open(data.documents[doc.key], '_blank')}
                        className="bg-white border-2 border-slate-200 hover:border-indigo-600 px-6 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                      >
                        OPEN
                      </button>
                    ) : (
                      <span className="text-xs font-black text-red-400 border-2 border-red-50 px-4 py-2 rounded-xl uppercase italic">Not uploaded yet</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "case traces" && caseBundle && (
            <CaseTracesTab
              caseBundle={caseBundle}
              refreshCaseData={refreshCaseData}
              refreshCaseDataFast={refreshCaseDataFast}
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
              roleLender={"Underwriter"}
              caseStatus={caseStatus}
            />
          )}

          {activeTab === "tasks" && (
            <TasksTab
              caseStatus={data.loan?.CaseStatus || data.loan?.caseStatus || ""}
              caseBundle={caseBundle}
              loanId={loanId || ""}
              borrowerId={borrowerId || ""}
              isMutating={isMutating}
              onError={(err: string) => setError(err)}
              onTaskCountChange={(count) => setPendingTaskCount(count)}
              actionTasks={actionTasks}
              onTaskCompleted={(taskId) => refreshActionTasks(taskId)}
            />
          )}
        </div>
      </main>
    </div>
  );
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
