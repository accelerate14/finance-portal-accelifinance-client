import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useUiPathAuth } from "../../../context/UiPathAuthContext";
import Button from "../../../components/UI/Button";
import { Entities } from '@uipath/uipath-typescript/entities';
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, BarChart, Bar, AreaChart, Area
} from 'recharts';

/* ================= TYPES ================= */
interface LoanRecord {
  Id: string;
  loanAmount: number;
  termOfLoan: number;
  caseStatus: string;
  userId: string;
  borrowerName: string;
  caseId: string;
  CreateTime: string;
  daysInStatus?: number;
  caseInstanceState?: string;
  caseInstanceId?: string;
}

interface PendingTask {
  id: string;
  loanId: string;
  borrowerId: string;
  caseId: string;
  borrowerName: string;
  loanAmount: number;
  taskType: string;
  status: string;
  daysPending: number;
  createdDate: string;
  priority: "high" | "medium" | "low";
  assignedToUser?: string;
  caseInstanceId?: string;
}

type TabType = "dashboard" | "loan-applications" | "pending-tasks" | "case-instances";

export default function LoanOfficerDashbaord() {
  const { isAuthenticated, sdk, user: currentUserEmail } = useUiPathAuth();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [requestedOnSort, setRequestedOnSort] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  const loanApplicationsEntityId =
    import.meta.env.VITE_LOAN_APPLICATION_ENTITY_ID;
  const personalInfoEntityId =
    import.meta.env.VITE_PERSONAL_INFO_ENTITY_ID;

  
  // Case Instances Summary data (from Cases.getAll() - processes summary)
  const [caseInstancesSummary, setCaseInstancesSummary] = useState<any[]>([]);
  const [caseInstancesLoading, setCaseInstancesLoading] = useState(false);
  
  // Case Instances list (from CaseInstances.getAll() - individual instances with status)
  const [caseInstancesList, setCaseInstancesList] = useState<any[]>([]);
  
  // Action tasks fetched from UiPath for each loan
  const [actionTasks, setActionTasks] = useState<PendingTask[]>([]);
  
  // Worklist filters
  const [worklistFilterStatus, setWorklistFilterStatus] = useState<string>("all");
  const [worklistFilterCaseState, setWorklistFilterCaseState] = useState<string>("all");
  const [worklistSearch, setWorklistSearch] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !sdk) return;

    setRefreshing(true);
    setLoading(true);
    try {
      const entitiesService = new Entities(sdk);
      if (!loanApplicationsEntityId || !personalInfoEntityId) {
        throw new Error("Missing entity IDs. Configure VITE_LOAN_APPLICATION_ENTITY_ID and VITE_PERSONAL_INFO_ENTITY_ID in .env");
      }

      const loanEntity = await entitiesService.getById(loanApplicationsEntityId);
      const personalInfoEntity = await entitiesService.getById(personalInfoEntityId);

      const [loanRecordsResponse, profileRecordsResponse] = await Promise.all([
        loanEntity.getAllRecords(),
        personalInfoEntity.getAllRecords(),
      ]);

      const rawData = (loanRecordsResponse as any).items || [];
      const profileData = (profileRecordsResponse as any).items || [];

      const borrowerNameByUserId = new Map<string, string>();
      profileData.forEach((profile: any) => {
        const profileUserId = profile.userId || profile.UserId;
        const profileName =
          profile.fullName ||
          profile.FullName ||
          [profile.firstName || profile.FirstName, profile.lastName || profile.LastName]
            .filter(Boolean)
            .join(" ")
            .trim();

        if (profileUserId && profileName) {
          borrowerNameByUserId.set(profileUserId, profileName);
        }
      });
      
      // Filter date: only show loans created after April 5th, 2026
      const FILTER_DATE = new Date("2026-04-05T00:00:00");

      const now = new Date();
      const mappedData: LoanRecord[] = rawData.map((item: any) => {
        const resolvedUserId = item.userId || item.UserId || "Unknown";
        const resolvedBorrowerName =
          borrowerNameByUserId.get(resolvedUserId) ||
          item.borrowerName ||
          item.BorrowerName ||
          item.fullName ||
          item.FullName ||
          [item.firstName || item.FirstName, item.lastName || item.LastName].filter(Boolean).join(" ").trim() ||
          (resolvedUserId !== "Unknown" ? `User-${String(resolvedUserId).substring(0, 5)}` : "Guest/Walk-in");

        const createTime = new Date(item.CreateTime || new Date().toISOString());
        const daysInStatus = Math.floor((now.getTime() - createTime.getTime()) / (1000 * 60 * 60 * 24));

        return {
          Id: item.Id,
          loanAmount: Number(item.loanAmount || item.LoanAmount || 0),
          termOfLoan: Number(item.termOfLoan || item.TermOfLoan || 0),
          caseStatus: item.caseStatus || item.CaseStatus || "Submitted",
          userId: resolvedUserId,
          borrowerName: resolvedBorrowerName,
          caseId: item.caseId || item.CaseId || "N/A",
          CreateTime: item.CreateTime || new Date().toISOString(),
          daysInStatus
        };
      });

      // Filter to only show loans created after April 5th, 2026
      const filteredLoans = mappedData.filter((loan: LoanRecord) => {
        const createTime = new Date(loan.CreateTime);
        return createTime > FILTER_DATE;
      });

      setLoans(filteredLoans);

      // Fetch case instances summary (processes summary) and individual instances
      try {
        const { Cases, CaseInstances } = await import('@uipath/uipath-typescript/cases');
        const casesService = new Cases(sdk);
        const caseInstancesService = new CaseInstances(sdk);
        const folderKey = import.meta.env.VITE_UIPATH_CASE_FOLDER_KEY;
        const processKey = import.meta.env.VITE_UIPATH_CASE_PROCESS_KEY;
        
        // Fetch summary data (processes summary with counts per process)
        // Filter to only show the process matching our configured processKey
        const summaryResponse = await casesService.getAll();
        const allSummaryData = Array.isArray(summaryResponse) ? summaryResponse : (summaryResponse as any).items || [];
        const summaryData = processKey 
          ? allSummaryData.filter((p: any) => p.processKey === processKey)
          : allSummaryData;
        setCaseInstancesSummary(summaryData);
        
        // Map caseId to case instance state for loans table
        const caseStateMap = new Map<string, { state: string, id: string }>();
        
        // Fetch individual case instances filtered by processKey
        const instancesResponse = await caseInstancesService.getAll(
          processKey ? { processKey } : undefined
        );
        const allInstances = (instancesResponse as any).items || [];
        setCaseInstancesList(allInstances);
        
        allInstances.forEach((instance: any) => {
          const caseId = instance.caseId;
          if (caseId) {
            caseStateMap.set(caseId, {
              state: instance.latestRunStatus || instance.status || "Unknown",
              id: instance.instanceId
            });
          }
        });
        
        // Update loans with case instance state and ID
        setLoans(prev => prev.map(loan => {
          const instanceInfo = caseStateMap.get(loan.caseId);
          return {
            ...loan,
            caseInstanceState: instanceInfo?.state || "Not Found",
            caseInstanceId: instanceInfo?.id
          };
        }));

        // Fetch action tasks for each loan from UiPath
        const allTasks: PendingTask[] = [];
        
        for (const loan of filteredLoans) {
          try {
            // Find the case instance that matches our caseId
            const matchingInstance = allInstances.find((instance: any) => 
              instance.caseId === loan.caseId
            );
            
            if (matchingInstance && matchingInstance.instanceId) {
              console.log('Dashboard: Found case instance:', matchingInstance.instanceId, 'for business case:', loan.caseId);
              
              // Use the case instance ID to fetch action tasks
              const tasksResponse = await caseInstancesService.getActionTasks(matchingInstance.instanceId);
              console.log("Dashboard: taskResponse- ", tasksResponse);
              const taskItems = (tasksResponse as any).items || tasksResponse || [];
              
              taskItems.forEach((task: any) => {
                // Filter: only show tasks that are NOT completed
                if (task.isCompleted) return;
                
                // Filter: only show tasks assigned to Loan Officer or unassigned
                const assignedToUser = task.assignedToUser;
                const assignedToName = assignedToUser?.displayName || assignedToUser?.name || "";
                console.log("Dashboard: assigned to- ", assignedToUser, "extracted name:", assignedToName);
                const isAssignedToMe = 
                  !assignedToUser || 
                  assignedToName.toLowerCase().includes("loan officer") ||
                  assignedToName.toLowerCase() === "unassigned";
                
                if (!isAssignedToMe) return;
                
                allTasks.push({
                  id: task.id,
                  loanId: loan.Id,
                  borrowerId: loan.userId,
                  caseId: loan.caseId,
                  borrowerName: loan.borrowerName,
                  loanAmount: loan.loanAmount,
                  taskType: task.title,
                  status: task.status || "Pending",
                  daysPending: loan.daysInStatus || 0,
                  createdDate: task.createdTime || task.startTime || loan.CreateTime,
                  priority: (loan.daysInStatus || 0) > 5 ? "high" : (loan.daysInStatus || 0) > 2 ? "medium" : "low",
                  assignedToUser,
                  caseInstanceId: matchingInstance.instanceId
                });
              });
            } else {
              console.warn('Dashboard: No case instance found for business case:', loan.caseId);
            }
          } catch (e) {
            console.warn(`Failed to fetch action tasks for case ${loan.caseId}:`, e);
          }
        }
        
        console.log('Dashboard: Total action tasks fetched:', allTasks.length);
        
        setActionTasks(allTasks);
      } catch (caseStateErr) {
        console.warn("Failed to fetch case instance states:", caseStateErr);
      }
    } catch (err) {
      console.error("Loan Officer Dashboard Data Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, sdk, loanApplicationsEntityId, personalInfoEntityId, currentUserEmail]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ================= HELPERS & CALCULATIONS ================= */

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getWeeklyData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    loans.forEach((loan) => {
      if (loan.CreateTime) {
        const day = days[new Date(loan.CreateTime).getDay()];
        counts[day]++;
      }
    });
    return days.map(d => ({ name: d, requests: counts[d] }));
  };

  const getBorrowerDistribution = () => {
    const distribution: Record<string, number> = {};
    loans.forEach(loan => {
      const label = loan.borrowerName?.trim() || "Unknown Borrower";
      distribution[label] = (distribution[label] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const handleReview = (loanId: string, borrowerId: string, caseId: string, caseInstanceId?: string) => {
    navigate(`/lender/loan-details/${loanId}/${borrowerId}/${caseId}`, { 
      state: { preResolvedInstanceId: caseInstanceId } 
    });
  };

  // Filtered worklist
  const filteredWorklist = useMemo(() => {
    let result = [...loans];
    
    if (worklistFilterStatus !== "all") {
      result = result.filter(l => l.caseStatus === worklistFilterStatus);
    }
    
    if (worklistFilterCaseState !== "all") {
      result = result.filter(l => l.caseInstanceState === worklistFilterCaseState);
    }
    
    if (worklistSearch) {
      const searchLower = worklistSearch.toLowerCase();
      result = result.filter(l => 
        l.caseId.toLowerCase().includes(searchLower) ||
        l.borrowerName.toLowerCase().includes(searchLower)
      );
    }
    
    return result.sort((a, b) => {
      const aTime = new Date(a.CreateTime).getTime();
      const bTime = new Date(b.CreateTime).getTime();
      return requestedOnSort === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [loans, worklistFilterStatus, worklistFilterCaseState, worklistSearch, requestedOnSort]);

  // Unique case instance states for filter
  const uniqueCaseStates = useMemo(() => {
    const states = new Set(loans.map(l => l.caseInstanceState).filter(Boolean));
    return Array.from(states);
  }, [loans]);

  // Unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(loans.map(l => l.caseStatus));
    return Array.from(statuses);
  }, [loans]);

  // Build pending tasks from action tasks fetched from UiPath
  const pendingTasks: PendingTask[] = useMemo(() => {
    return [...actionTasks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      if (priorityDiff !== 0) return priorityDiff;
      return b.daysPending - a.daysPending;
    });
  }, [actionTasks]);

  // Dashboard KPIs
  const totalPendingTasks = pendingTasks.length;
  const submittedCount = loans.filter(l => l.caseStatus === "Submitted").length;
  const approvedCount = loans.filter(l => {
    const status = l.caseStatus.toLowerCase();
    return status === "approved" || 
           status === "approved pending signing" || 
           status === "case completed";
  }).length;
  const totalLoanAmount = loans.reduce((sum, l) => sum + l.loanAmount, 0);
  const avgLoanAmount = loans.length > 0 ? totalLoanAmount / loans.length : 0;

  const lineData = getWeeklyData();
  const pieData = getBorrowerDistribution();
  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      const aTime = new Date(a.CreateTime).getTime();
      const bTime = new Date(b.CreateTime).getTime();
      return requestedOnSort === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [loans, requestedOnSort]);
  const COLORS = ['#4F46E5', '#F97316', '#10B981', '#EF4444', '#8B5CF6'];
  const pieDataWithColors = pieData.map((entry, index) => ({
    ...entry,
    fill: COLORS[index % COLORS.length],
  }));

  const handleMouseDown = (e: React.MouseEvent) => {
    const ele = e.currentTarget as HTMLDivElement;
    if (!ele) return;
    const startPos = {
      left: ele.scrollLeft,
      top: ele.scrollTop,
      x: e.clientX,
      y: e.clientY,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      ele.scrollTop = startPos.top - dy;
      ele.scrollLeft = startPos.left - dx;
      ele.style.cursor = 'grabbing';
      ele.style.userSelect = 'none';
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      ele.style.cursor = 'grab';
      ele.style.removeProperty('user-select');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F1F5F9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Fetching Data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F1F5F9] min-h-screen space-y-6">
      <div className="w-full 2xl:px-8 mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Loan Officer Dashboard</h1>
            <p className="text-sm text-gray-500">{loans.length} total applications</p>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
            title="Refresh Dashboard Data"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200 pb-[1px]">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === "dashboard"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("loan-applications")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === "loan-applications"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Loan Applications
          </button>
          <button
            onClick={() => setActiveTab("pending-tasks")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              activeTab === "pending-tasks"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-1.5">
              Pending Tasks
              {pendingTasks.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                  {pendingTasks.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("case-instances")}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${
              activeTab === "case-instances"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Case Instances Summary
            {caseInstancesLoading && (
              <span className="absolute -top-1 -right-1 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            )}
          </button>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Primary KPIs */}
             <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
               <StatBox label="Total Applications" value={loans.length} />
               <StatBox label="Tasks Pending" value={totalPendingTasks} color="text-amber-600" />
               <StatBox label="Scrutiny Pending" value={pendingTasks.filter(t => t.taskType.toLowerCase().includes("scrutiny")).length} color="text-purple-600" />
               <StatBox label="Submitted" value={submittedCount} color="text-blue-600" />
               <StatBox label="Approved" value={approvedCount} color="text-emerald-600" />
             </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Total Portfolio Value</p>
                <p className="text-2xl font-black mt-2">${(totalLoanAmount / 1000).toFixed(1)}K</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Avg Loan Size</p>
                <p className="text-2xl font-black mt-2">${Math.round(avgLoanAmount).toLocaleString()}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Application Trends */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xs font-bold text-gray-400 uppercase mb-6 tracking-widest">Application Trends (Weekly)</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData}>
                      <defs>
                        <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="requests" name="Applications" stroke="#4F46E5" strokeWidth={3} fill="url(#colorRequests)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Borrower Distribution */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xs font-bold text-gray-400 uppercase mb-6 tracking-widest">Application Count by Borrower</h2>
                <div className="h-64 w-full flex items-center">
                  <div style={{ width: '50%', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieDataWithColors} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2 overflow-y-auto max-h-48 px-4">
                    {pieData.map((b, idx) => (
                      <div key={b.name} className="flex justify-between text-[11px] font-medium border-b border-gray-50 pb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-gray-600 truncate max-w-[80px]">{b.name}</span>
                        </div>
                        <span className="text-indigo-600 font-bold">{b.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>


            {/* Quick Actions - Top Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-amber-600 flex justify-between items-center">
                  <div>
                    <h2 className="text-white font-bold tracking-wide">Quick Actions - Pending Tasks</h2>
                    <p className="text-amber-100 text-xs">{pendingTasks.length} tasks assigned to you</p>
                  </div>
                  <Button
                    onClick={() => setActiveTab("pending-tasks")}
                    className="bg-white text-amber-600 hover:bg-amber-50 text-xs font-bold px-4 py-2 rounded-lg"
                  >
                    View All →
                  </Button>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              task.priority === "high" ? "bg-red-100 text-red-700" :
                              task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                task.priority === "high" ? "bg-red-500" :
                                task.priority === "medium" ? "bg-amber-500" :
                                "bg-green-500"
                              }`}></span>
                              {task.priority}
                            </span>
                            <span className="text-xs text-gray-500">{task.daysPending} days</span>
                          </div>
                          <h3 className="font-bold text-gray-800">{task.taskType}</h3>
                          <p className="text-sm text-gray-600">
                            Case: <span className="font-mono">{task.caseId}</span> | {task.borrowerName}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold text-gray-900">${task.loanAmount.toLocaleString()}</p>
                          <Button
                            onClick={() => handleReview(task.loanId, task.borrowerId, task.caseId, task.caseInstanceId)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                          >
                            Review Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOAN APPLICATIONS TAB */}
        {activeTab === "loan-applications" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={worklistSearch}
                  onChange={(e) => setWorklistSearch(e.target.value)}
                  placeholder="Search Case ID or Borrower..."
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={worklistFilterStatus}
                  onChange={(e) => setWorklistFilterStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  {uniqueStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={worklistFilterCaseState}
                  onChange={(e) => setWorklistFilterCaseState(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Case States</option>
                  {uniqueCaseStates.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setWorklistSearch("");
                    setWorklistFilterStatus("all");
                    setWorklistFilterCaseState("all");
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 rounded-lg px-3 py-2"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-[#2D74B3] flex justify-between items-center">
                <h2 className="text-white font-bold tracking-wide">Officer Worklist</h2>
                <span className="text-[10px] bg-white/20 text-white px-3 py-1 rounded-full uppercase">
                  {filteredWorklist.length} of {loans.length} Records
                </span>
              </div>
              <div 
                className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
              >
                <table className="w-full text-left min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b">
                      <th className="p-4">Loan ID</th>
                      <th className="p-4">Borrower</th>
                      <th className="p-4">
                        <button
                          type="button"
                          onClick={() => setRequestedOnSort(prev => (prev === "desc" ? "asc" : "desc"))}
                          className="inline-flex items-center gap-1 uppercase hover:text-indigo-600 transition-colors"
                        >
                          REQUESTED ON
                          <span>{requestedOnSort === "desc" ? "↓" : "↑"}</span>
                        </button>
                      </th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Case Instance</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredWorklist.map((loan) => (
                      <tr key={loan.Id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-500">{loan.caseId}</td>
                        <td className="p-4 text-gray-600">{loan.borrowerName}</td>
                        <td className="p-4 text-gray-600">{formatDate(loan.CreateTime)}</td>
                        <td className="p-4 font-bold text-gray-900">${loan.loanAmount.toLocaleString()}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                            {loan.caseStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            loan.caseInstanceState === "Running" ? "bg-green-50 text-green-600 border border-green-100" :
                            loan.caseInstanceState === "Completed" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                            loan.caseInstanceState === "Paused" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            loan.caseInstanceState === "Faulted" ? "bg-red-50 text-red-600 border border-red-100" :
                            "bg-gray-50 text-gray-500 border border-gray-100"
                          }`}>
                            {loan.caseInstanceState || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            onClick={() => handleReview(loan.Id, loan.userId, loan.caseId, loan.caseInstanceId)}
                            className="bg-black text-white text-[10px] font-bold px-4 py-2 rounded shadow hover:bg-gray-800 transition-all"
                          >
                            REVIEW
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredWorklist.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-gray-400 italic">
                          No loan applications found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CASE INSTANCES SUMMARY TAB */}
        {activeTab === "case-instances" && (
          <div className="space-y-6">
            {/* Process Summary Cards - Dashboard Style */}
            {caseInstancesSummary.map((summary: any, idx: number) => {
              const total = (summary.pendingCount || 0) + (summary.runningCount || 0) + (summary.completedCount || 0) + (summary.pausedCount || 0) + (summary.cancelledCount || 0) + (summary.faultedCount || 0);
              return (
                <div key={summary.processKey || idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-indigo-600 flex justify-between items-center">
                    <div>
                      <h2 className="text-white font-bold tracking-wide">{summary.name || "Process"}</h2>
                      <p className="text-indigo-100 text-xs">{summary.processKey || "N/A"} • {summary.folderName || "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-100 text-xs">Total Instances</p>
                      <p className="text-2xl font-black text-white">{total}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-5">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                      <p className="text-2xl font-black text-slate-600 mt-1">{summary.pendingCount || 0}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Running</p>
                      <p className="text-2xl font-black text-blue-600 mt-1">{summary.runningCount || 0}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Completed</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">{summary.completedCount || 0}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Paused</p>
                      <p className="text-2xl font-black text-amber-600 mt-1">{summary.pausedCount || 0}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Cancelled</p>
                      <p className="text-2xl font-black text-red-600 mt-1">{summary.cancelledCount || 0}</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-200 text-center">
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Faulted</p>
                      <p className="text-2xl font-black text-rose-600 mt-1">{summary.faultedCount || 0}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {caseInstancesSummary.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-400 italic">
                No process summary found.
              </div>
            )}

            {/* Case Instances List - Individual instances with execution status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-slate-700 flex justify-between items-center">
                <div>
                  <h2 className="text-white font-bold tracking-wide">Case Instance Execution Status</h2>
                  <p className="text-slate-200 text-xs">Individual case instances with their execution status</p>
                </div>
              </div>
              <div 
                className="overflow-x-auto cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
              >
                <table className="w-full text-left min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b">
                      <th className="p-4">Instance ID</th>
                      <th className="p-4">Display Name</th>
                      <th className="p-4">Execution Status</th>
                      <th className="p-4">Started</th>
                      <th className="p-4">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {caseInstancesList.map((c: any) => (
                      <tr key={c.instanceId} className="hover:bg-gray-50/30 transition-colors">
                        <td className="p-4 font-mono text-xs text-gray-500">{c.instanceId?.slice(0, 8)}...</td>
                        <td className="p-4 text-gray-600">{c.instanceDisplayName || "N/A"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            (c.latestRunStatus || "").toLowerCase().includes("running") ? "bg-blue-50 text-blue-600 border border-blue-100" :
                            (c.latestRunStatus || "").toLowerCase().includes("completed") ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            (c.latestRunStatus || "").toLowerCase().includes("cancelled") || (c.latestRunStatus || "").toLowerCase().includes("canceled") ? "bg-red-50 text-red-600 border border-red-100" :
                            (c.latestRunStatus || "").toLowerCase().includes("paused") ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            (c.latestRunStatus || "").toLowerCase().includes("fault") || (c.latestRunStatus || "").toLowerCase().includes("error") ? "bg-rose-50 text-rose-600 border border-rose-100" :
                            "bg-gray-50 text-gray-500 border border-gray-100"
                          }`}>
                            {c.latestRunStatus || c.status || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{c.startedTime ? formatDate(c.startedTime) : "N/A"}</td>
                        <td className="p-4 text-gray-600">{c.completedTime ? formatDate(c.completedTime) : "N/A"}</td>
                      </tr>
                    ))}
                    {caseInstancesList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-gray-400 italic">
                          No case instances found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PENDING TASKS TAB */}
        {activeTab === "pending-tasks" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-amber-600 flex justify-between items-center">
                <div>
                  <h2 className="text-white font-bold tracking-wide">Pending Tasks</h2>
                  <p className="text-amber-100 text-xs">{pendingTasks.length} tasks assigned to you</p>
                </div>
              </div>
              
              {pendingTasks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              task.priority === "high" ? "bg-red-100 text-red-700" :
                              task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                task.priority === "high" ? "bg-red-500" :
                                task.priority === "medium" ? "bg-amber-500" :
                                "bg-green-500"
                              }`}></span>
                              {task.priority} Priority
                            </span>
                            <span className="text-xs text-gray-500">{task.daysPending} days pending</span>
                          </div>
                          <h3 className="font-bold text-gray-800">{task.taskType}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Case: <span className="font-mono">{task.caseId}</span> | Borrower: <span className="font-medium">{task.borrowerName}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-gray-900">${task.loanAmount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{formatDate(task.createdDate)}</p>
                          </div>
                          <Button
                            onClick={() => handleReview(task.loanId, task.borrowerId, task.caseId)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                          >
                            Review Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="font-medium">No pending tasks</p>
                  <p className="text-sm">All tasks have been completed</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color = "text-slate-900" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-xl md:text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}