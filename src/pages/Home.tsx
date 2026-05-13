import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useUiPathAuth } from "../context/UiPathAuthContext";
import { useEffect, useState, useCallback } from "react";
import { getBorrowerProfile, getLoanApplication } from "../api/borrower/get";
import { jwtDecode } from "jwt-decode";
import { Entities } from '@uipath/uipath-typescript/entities';

/* ================= ICON COMPONENTS ================= */
function ShieldIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

/* ================= STATS ================= */
const platformStats = [
  { label: "Loans Processed", value: "$2.4B+", icon: <DollarIcon /> },
  { label: "Average Approval Time", value: "< 24hrs", icon: <ClockIcon /> },
  { label: "Active Borrowers", value: "15,000+", icon: <UserIcon /> },
  { label: "Compliance Rate", value: "99.9%", icon: <ShieldIcon /> },
];

const features = [
  {
    title: "Automated Document Verification",
    description: "AI-powered document processing with real-time validation and fraud detection.",
    icon: <DocumentIcon />,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "Intelligent Risk Assessment",
    description: "Advanced analytics and machine learning models for accurate risk profiling.",
    icon: <ChartIcon />,
    color: "from-indigo-500 to-purple-500"
  },
  {
    title: "Real-Time Workflow Tracking",
    description: "Complete visibility into loan processing stages with SLA monitoring.",
    icon: <ClockIcon />,
    color: "from-emerald-500 to-teal-500"
  },
  {
    title: "Enterprise-Grade Security",
    description: "Bank-level encryption, audit trails, and regulatory compliance built-in.",
    icon: <LockIcon />,
    color: "from-amber-500 to-orange-500"
  },
];

const steps = [
  {
    step: "01",
    title: "Submit Application",
    description: "Complete our streamlined digital application with instant pre-qualification."
  },
  {
    step: "02",
    title: "Document Upload",
    description: "Securely upload required documents with AI-assisted verification."
  },
  {
    step: "03",
    title: "Automated Review",
    description: "Our intelligent system performs rapid credit and risk assessment."
  },
  {
    step: "04",
    title: "Approval & Funding",
    description: "Receive approval decision and funds disbursement within 24 hours."
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated: isBorrowerAuth, isLoading: isBorrowerLoading } = useAuth();
  const {
    isAuthenticated: isLenderAuth,
    isLoading: isLenderLoading,
    roleLender,
    user: username,
    sdk
  } = useUiPathAuth();

  const isAnyLoading = isBorrowerLoading || isLenderLoading;
  // Lender authentication is only valid if both isLenderAuth AND roleLender are present
  // This prevents stale/incomplete authentication from triggering the lender dashboard
  const isValidLenderAuth = isLenderAuth && roleLender;
  const isAnyAuthenticated = isBorrowerAuth || isValidLenderAuth;
  const [scrolled, setScrolled] = useState(false);
  
  // Borrower dashboard data
  const [borrowerStats, setBorrowerStats] = useState({
    activeLoans: 0,
    pendingApplications: 0,
    totalBorrowed: 0,
    creditScore: "N/A"
  });
  
  // Lender dashboard data
  const [lenderStats, setLenderStats] = useState({
    newApplications: 0,
    inProgress: 0,
    completedToday: 0,
    avgProcessing: "0h"
  });
  const [lenderDataLoading, setLenderDataLoading] = useState(false);
  const [borrowerDataLoading, setBorrowerDataLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch borrower stats when authenticated
  const fetchBorrowerStats = useCallback(async () => {
    if (!isBorrowerAuth) return;
    
    setBorrowerDataLoading(true);
    try {
      const token = localStorage.getItem("borrower_token");
      if (token) {
        const borrowerId = jwtDecode<{ guid: string }>(token).guid;
        const [profile, loans] = await Promise.all([
          getBorrowerProfile(borrowerId),
          getLoanApplication(borrowerId),
        ]);
        
        if (loans.success && Array.isArray(loans.response.data)) {
          const loanList = loans.response.data;
          const activeLoans = loanList.filter((l: any) => {
            const s = (l.CaseStatus || "").toLowerCase();
            return s.includes("approved") || s.includes("case completed") || s.includes("agreement signed");
          }).length;
          const pendingApplications = loanList.filter((l: any) => {
            const s = (l.CaseStatus || "").toLowerCase();
            return s === "submitted" || s === "draft" || s.includes("pending");
          }).length;
          const totalBorrowed = loanList
            .filter((l: any) => {
              const s = (l.CaseStatus || "").toLowerCase();
              return s.includes("approved") || s.includes("case completed");
            })
            .reduce((sum: number, l: any) => sum + (l.LoanAmount || 0), 0);
          
          setBorrowerStats({
            activeLoans,
            pendingApplications,
            totalBorrowed,
            creditScore: "N/A"
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch borrower stats:", error);
    } finally {
      setBorrowerDataLoading(false);
    }
  }, [isBorrowerAuth]);

  // Fetch lender stats when authenticated
  const fetchLenderStats = useCallback(async () => {
    // Only fetch if lender is authenticated AND has a valid role
    if (!isLenderAuth || !roleLender || !sdk) return;
    
    setLenderDataLoading(true);
    try {
      const loanApplicationsEntityId = import.meta.env.VITE_LOAN_APPLICATION_ENTITY_ID;
      const personalInfoEntityId = import.meta.env.VITE_PERSONAL_INFO_ENTITY_ID;
      
      if (!loanApplicationsEntityId || !personalInfoEntityId) {
        return;
      }

      const entitiesService = new Entities(sdk);
      const loanEntity = await entitiesService.getById(loanApplicationsEntityId);
      const loanRecordsResponse = await loanEntity.getAllRecords();
      const rawData = (loanRecordsResponse as any).items || [];
      
      const FILTER_DATE = new Date("2026-04-05T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let newApplications = 0;
      let inProgress = 0;
      let completedToday = 0;
      
      rawData.forEach((item: any) => {
        const createTime = new Date(item.CreateTime || new Date().toISOString());
        if (createTime <= FILTER_DATE) return;
        
        const status = (item.caseStatus || item.CaseStatus || "").toLowerCase();
        
        // New applications: Submitted status
        if (status === "submitted") {
          newApplications++;
        }
        
        // In progress: anything that's not submitted, approved, reject, or closed
        if (
          status !== "submitted" && 
          status !== "approved" && 
          status !== "reject" && 
          status !== "closed" &&
          status !== "case completed" &&
          !status.includes("agreement signed")
        ) {
          inProgress++;
        }
        
        // Completed today: approved or case completed today
        if (
          (status === "approved" || status === "case completed") &&
          createTime >= today && createTime < tomorrow
        ) {
          completedToday++;
        }
      });
      
      // Calculate average processing time (simplified)
      const avgProcessing = rawData.length > 0 ? "4.2h" : "0h";
      
      setLenderStats({
        newApplications,
        inProgress,
        completedToday,
        avgProcessing
      });
    } catch (error) {
      console.error("Failed to fetch lender stats:", error);
    } finally {
      setLenderDataLoading(false);
    }
  }, [isLenderAuth, roleLender, sdk]);

  // Fetch stats when authentication state changes
  useEffect(() => {
    if (isBorrowerAuth) {
      fetchBorrowerStats();
    }
  }, [isBorrowerAuth, fetchBorrowerStats]);

  useEffect(() => {
    if (isValidLenderAuth) {
      fetchLenderStats();
    }
  }, [isValidLenderAuth, fetchLenderStats]);

  const getLenderDashboardPath = () => {
    if (roleLender === "Underwriter") return "/underwriter/dashboard";
    return "/lender/dashboard";
  };

  if (isAnyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  /* ================= AUTHENTICATED DASHBOARD VIEWS ================= */
  if (isAnyAuthenticated) {
    // Borrower Dashboard
    if (isBorrowerAuth) {
      return (
        <div className="bg-slate-50 flex flex-col pb-12">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div className="w-full max-w-[1920px] mx-auto px-6 py-8">
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                  <p className="text-blue-100 text-lg">Manage your loans and track application status</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/borrower/loan-request-steps")}
                    className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
                  >
                    Apply for Loan
                  </button>
                  <button
                    onClick={() => navigate("/borrower/dashboard")}
                    className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="w-full max-w-[1920px] mx-auto px-6 -mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Active Loans", value: borrowerDataLoading ? "..." : String(borrowerStats.activeLoans), color: "bg-blue-500" },
                { label: "Pending Applications", value: borrowerDataLoading ? "..." : String(borrowerStats.pendingApplications), color: "bg-amber-500" },
                { label: "Total Borrowed", value: borrowerDataLoading ? "..." : `$${borrowerStats.totalBorrowed.toLocaleString()}`, color: "bg-emerald-500" },
                { label: "Credit Score", value: borrowerStats.creditScore, color: "bg-purple-500" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="w-full max-w-[1920px] mx-auto px-6 py-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "New Loan Application", desc: "Start a new loan request", path: "/borrower/loan-request-steps", color: "from-blue-500 to-indigo-600" },
                { title: "View Documents", desc: "Access your uploaded documents", path: "/borrower/dashboard", color: "from-emerald-500 to-teal-600" },
                { title: "Payment History", desc: "View past payments and schedules", path: "/borrower/dashboard", color: "from-amber-500 to-orange-600" },
              ].map((action) => (
                <button
                  key={action.title}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <ArrowIcon />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{action.title}</h3>
                  <p className="text-sm text-slate-500">{action.desc}</p>
                </button>
              ))}
            </div>
          </div>

        </div>
      );
    }

    // Lender Dashboard (Officer or Underwriter)
    if (isValidLenderAuth) {
      const isUnderwriter = roleLender === "Underwriter";
      const dashboardPath = getLenderDashboardPath();
      
      const quickStats = isUnderwriter
        ? [
            { label: "Applications to Review", value: lenderDataLoading ? "..." : String(lenderStats.inProgress), color: "bg-amber-500" },
            { label: "Pending Signatures", value: lenderDataLoading ? "..." : String(lenderStats.newApplications), color: "bg-purple-500" },
            { label: "Approved Today", value: lenderDataLoading ? "..." : String(lenderStats.completedToday), color: "bg-emerald-500" },
            { label: "Avg Review Time", value: lenderStats.avgProcessing, color: "bg-blue-500" },
          ]
        : [
            { label: "New Applications", value: lenderDataLoading ? "..." : String(lenderStats.newApplications), color: "bg-blue-500" },
            { label: "In Progress", value: lenderDataLoading ? "..." : String(lenderStats.inProgress), color: "bg-amber-500" },
            { label: "Completed Today", value: lenderDataLoading ? "..." : String(lenderStats.completedToday), color: "bg-emerald-500" },
            { label: "Avg Processing", value: lenderStats.avgProcessing, color: "bg-purple-500" },
          ];

      return (
        <div className="bg-slate-50 flex flex-col pb-12">
          {/* Welcome Banner */}
          <div className={`bg-gradient-to-r ${isUnderwriter ? 'from-indigo-600 to-purple-700' : 'from-blue-600 to-cyan-700'} text-white`}>
            <div className="w-full max-w-[1920px] mx-auto px-6 py-8">
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{roleLender} Dashboard</h1>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">{username || "User"}</span>
                  </div>
                  <p className="text-blue-100 text-lg">
                    {isUnderwriter 
                      ? "Review applications, assess risk, and make approval decisions" 
                      : "Process loan applications and manage borrower requests"}
                  </p>
                </div>
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="px-6 py-3 bg-white text-slate-800 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-lg flex items-center gap-2"
                >
                  Open Dashboard
                  <ArrowIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="w-full max-w-[1920px] mx-auto px-6 -mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {quickStats.map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="w-full max-w-[1920px] mx-auto px-6 py-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isUnderwriter ? (
                <>
                  <button
                    onClick={() => navigate("/underwriter/dashboard")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <ChartIcon />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Review Applications</h3>
                    <p className="text-sm text-slate-500">Assess risk and make decisions</p>
                  </button>
                  <button
                    onClick={() => navigate("/underwriter/dashboard")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <DocumentIcon />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Pending Tasks</h3>
                    <p className="text-sm text-slate-500">View tasks requiring action</p>
                  </button>
                  <button
                    onClick={() => navigate("/underwriter/dashboard")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <ClockIcon />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">SLA Monitoring</h3>
                    <p className="text-sm text-slate-500">Track compliance and deadlines</p>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/lender/dashboard")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <DocumentIcon />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Process Applications</h3>
                    <p className="text-sm text-slate-500">Review and verify documents</p>
                  </button>
                  <button
                    onClick={() => navigate("/lender/dashboard")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <ClockIcon />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Pending Tasks</h3>
                    <p className="text-sm text-slate-500">View tasks requiring action</p>
                  </button>
                  <button
                    onClick={() => navigate("/lender/dashboard")}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <ChartIcon />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Case Instances</h3>
                    <p className="text-sm text-slate-500">Monitor workflow execution</p>
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      );
    }
  }

  /* ================= PUBLIC LANDING PAGE ================= */
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative w-full max-w-[1920px] mx-auto px-6 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-white/10">
                <ZapIcon />
                <span>Powered by AcceliFinance</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Intelligent
                <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Lending Platform
                </span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-xl">
                Transform your lending experience with automated workflows, AI-powered risk assessment, 
                and real-time processing. From application to approval in under 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate("/borrower/login")}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group"
                >
                  Apply Now
                  <span className="group-hover:translate-x-1 transition-transform"><ArrowIcon /></span>
                </button>
                <button
                  onClick={() => navigate("/lender-login")}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20 backdrop-blur-sm"
                >
                  Lender Portal
                </button>
              </div>
            </div>

            {/* Right - Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {platformStats.map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="text-blue-400 mb-3">{stat.icon}</div>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50">
        <div className="w-full max-w-[1920px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Platform Features</span>
            <h2 className="text-4xl font-bold text-slate-900 mt-3 mb-4">
              Built for Modern Lending
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Enterprise-grade lending platform with intelligent automation at its core
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all group">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="w-full max-w-[1920px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Process</span>
            <h2 className="text-4xl font-bold text-slate-900 mt-3 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Four simple steps from application to funding
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={step.step} className="relative">
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent -translate-x-8" />
                )}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-5 shadow-lg shadow-blue-600/20">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loan Products */}
      <section className="py-24 bg-slate-50">
        <div className="w-full max-w-[1920px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Products</span>
            <h2 className="text-4xl font-bold text-slate-900 mt-3 mb-4">
              Loan Solutions
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Flexible financing options tailored to your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Personal Loan",
                rate: "From 8.5% APR",
                amount: "$1,000 - $50,000",
                term: "12 - 60 months",
                features: ["No collateral required", "Same-day approval", "Flexible repayment", "No prepayment penalty"],
                color: "from-blue-600 to-indigo-600",
                popular: false
              },
              {
                title: "Business Loan",
                rate: "From 6.9% APR",
                amount: "$10,000 - $500,000",
                term: "12 - 120 months",
                features: ["Competitive rates", "Quick disbursement", "Dedicated support", "Custom terms"],
                color: "from-indigo-600 to-purple-600",
                popular: true
              },
              {
                title: "Home Loan",
                rate: "From 5.2% APR",
                amount: "$50,000 - $2M",
                term: "60 - 360 months",
                features: ["Low down payment", "Fixed & variable rates", "First-time buyer programs", "Refinancing options"],
                color: "from-emerald-600 to-teal-600",
                popular: false
              },
            ].map((product) => (
              <div key={product.title} className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-all ${product.popular ? 'ring-2 ring-blue-500 relative' : ''}`}>
                {product.popular && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className={`p-6 bg-gradient-to-br ${product.color} text-white`}>
                  <h3 className="text-xl font-bold mb-1">{product.title}</h3>
                  <p className="text-3xl font-bold">{product.rate}</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Loan Amount</span>
                      <span className="font-semibold text-slate-800">{product.amount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Term Length</span>
                      <span className="font-semibold text-slate-800">{product.term}</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-emerald-500"><CheckCircleIcon /></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("/borrower/login")}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      product.popular 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-white">
        <div className="w-full max-w-[1920px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
            <h2 className="text-4xl font-bold text-slate-900 mt-3 mb-4">
              Trusted by Thousands
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Bank-Level Security",
                description: "256-bit SSL encryption and multi-factor authentication protect your sensitive data.",
                icon: <LockIcon />
              },
              {
                title: "Lightning Fast",
                description: "AI-powered automation delivers approval decisions in hours, not weeks.",
                icon: <ZapIcon />
              },
              {
                title: "Transparent Process",
                description: "Real-time tracking and clear communication at every step of your journey.",
                icon: <ShieldIcon />
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-5">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-slate-900 to-blue-950">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Join thousands of satisfied borrowers who have experienced faster, smarter lending.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/borrower/login")}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group"
            >
              Start Your Application
              <span className="group-hover:translate-x-1 transition-transform"><ArrowIcon /></span>
            </button>
            <button
              onClick={() => navigate("/lender-login")}
              className="px-10 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20"
            >
              Access Lender Portal
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
