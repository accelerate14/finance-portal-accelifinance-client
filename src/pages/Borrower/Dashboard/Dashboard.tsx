import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { getBorrowerProfile, getLoanApplication } from "../../../api/borrower/get";
import { jwtDecode } from "jwt-decode";
import Button from "../../../components/UI/Button";
import { useNavigate } from "react-router-dom";

ChartJS.register(ArcElement, Tooltip, Legend);

const getStatusBadge = (s: string) => {
    if (!s) return <span className="px-3 py-1 rounded-full text-xs font-bold border bg-gray-100 text-gray-800 border-gray-200">N/A</span>;
    let colors = "bg-gray-100 text-gray-800 border-gray-200";
    if (s.includes("Submitted") || s.includes("Pending")) colors = "bg-yellow-100 text-yellow-800 border-yellow-200";
    else if (s.includes("Approved")) colors = "bg-blue-100 text-blue-800 border-blue-200";
    else if (s.includes("Closed")) colors = "bg-green-100 text-green-800 border-green-200";
    return <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors}`}>{s}</span>;
};

// Statuses that require borrower action
const getPendingTaskCount = (s: string): number => {
    if (!s) return 0;
    if (
        s.includes("Borrower Agreement Sign Pending") ||
        (s.includes("Document Reupload Pending") && !s.includes("Reuploaded")) // Don't count "Documents Reuploaded" as pending
    ) return 1;
    // if (s === "Submitted") return 1; // new loan — docs pending
    return 0;
};

export default function BorrowerDashboard() {
    const navigate = useNavigate();
    const token = localStorage.getItem("borrower_token");
    const borrowerId = token ? jwtDecode<{ guid: string }>(token).guid : "";

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [loans, setLoans] = useState<any[]>([]);

    // Filter date: only show loans created after April 5th, 2026
    const FILTER_DATE = new Date("2026-04-05T00:00:00");

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [p, l] = await Promise.all([
                    getBorrowerProfile(borrowerId),
                    getLoanApplication(borrowerId),
                ]);
                if (p.success) setProfile(p.response.data);
                if (l.success && Array.isArray(l.response.data)) {
                    // Filter to only show loans created after April 5th, 2026
                    const filteredLoans = l.response.data.filter((loan: any) => {
                        const createTime = new Date(loan.CreateTime || loan.createdTime || loan.createdAt);
                        return createTime > FILTER_DATE;
                    });
                    setLoans(filteredLoans);
                }
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();

        // Refresh data when the window gains focus (e.g., after navigating back from reupload)
        const handleFocus = () => {
            loadDashboardData();
        };
        window.addEventListener('focus', handleFocus);
        
        // Also refresh when the component mounts (for navigation back)
        const unsubscribe = () => {
            window.removeEventListener('focus', handleFocus);
        };
        
        // Use visibilitychange as an additional trigger
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                loadDashboardData();
            }
        });

        return unsubscribe;
    }, [borrowerId]);


    if (loading) return <div className="p-10 text-center text-gray-500">Loading dashboard...</div>;

    // Collect all unique statuses
    const statusCounts: Record<string, number> = {};
    loans.forEach(l => {
        const status = l.CaseStatus || "Unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const statusLabels = Object.keys(statusCounts);
    const statusColors = [
        "#6366F1", "#10B981", "#F97316", "#F59E42", "#F43F5E", "#A21CAF", "#0EA5E9", "#FACC15", "#14B8A6", "#64748B"
    ];
    const pieData = {
        labels: statusLabels,
        datasets: [{
            data: statusLabels.map(label => statusCounts[label]),
            backgroundColor: statusLabels.map((_, i) => statusColors[i % statusColors.length]),
        }],
    };

    // Card counts
    const submittedCount = loans.length;
    const approvedCount = loans.filter(l => {
        const s = l.CaseStatus?.toLowerCase() || "";
        return s.includes("approved") || s.includes("case completed") || s.includes("agreement signed");
    }).length;
    const rejectedCount = loans.filter(l => l.CaseStatus?.toLowerCase().includes("reject")).length;
    // Review count: not submitted, draft, approved, rejected, and does not contain Agreement or Closure
    const reviewCount = loans.filter(l => {
        const s = (l.CaseStatus || "").toLowerCase();
        return (
            s !== "submitted" &&
            s !== "draft" &&
            !s.includes("approved") &&
            !s.includes("reject") &&
            !s.includes("agreement") &&
            !s.includes("closure")
        );
    }).length;

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6 font-sans">
            <div className="w-full 2xl:px-8 mx-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {profile?.FirstName}</h1>
                        <p className="text-sm text-gray-500">{loans.length} active applications</p>
                    </div>
                    <Button 
                        onClick={() => navigate("/borrower/loan-request-steps")}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg"
                    >
                        + Apply Loan
                    </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Submitted</p>
                        <p className="text-lg font-semibold text-gray-800">{submittedCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Approved</p>
                        <p className="text-lg font-semibold text-gray-800">{approvedCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Review</p>
                        <p className="text-lg font-semibold text-gray-800">{reviewCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Rejected</p>
                        <p className="text-lg font-semibold text-gray-800">{rejectedCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Average Value</p>
                        <p className="text-lg font-semibold text-gray-800">${submittedCount > 0 ? (loans.reduce((a, c) => a + c.LoanAmount, 0) / submittedCount).toLocaleString() : 0}</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-white rounded-xl shadow p-5 overflow-x-auto">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">Your Loan Submissions</h2>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">Loan ID</th>
                                    <th className="px-4 py-3 text-left">Amount</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loans.map((item) => {
                                    const pendingTasks = getPendingTaskCount(item.CaseStatus);
                                    return (
                                        <tr
                                            key={item.Id}
                                            className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                            onClick={() => navigate(`/borrower/loan-details/${item.Id}`, { state: { loan: item } })}
                                        >
                                            <td className="px-4 py-4 text-indigo-600 font-bold group-hover:underline">
                                                {item.CaseId || "N/A"}
                                            </td>
                                            <td className="px-4 py-4 font-medium">${item.LoanAmount?.toLocaleString()}</td>
                                            <td className="px-4 py-4">{getStatusBadge(item.CaseStatus)}</td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex gap-2 justify-end items-center">

                                                    {/* Pending Tasks Badge */}
                                                    {pendingTasks > 0 && (
                                                        <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-1 rounded-full">
                                                            <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px]">
                                                                {pendingTasks}
                                                            </span>
                                                            Pending
                                                        </span>
                                                    )}

                                                    {/* View Application Button */}
                                                    <Button
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            navigate(`/borrower/loan-details/${item.Id}`, {
                                                                state: {
                                                                    loan: item,
                                                                    // Auto-open actions tab if there are pending tasks
                                                                    defaultTab: pendingTasks > 0 ? "actions" : "details"
                                                                }
                                                            });
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-2 rounded"
                                                    >
                                                        View Application
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">Application Summary</h2>
                        <div className="w-48 h-48">
                            <Pie data={pieData} options={{ plugins: { legend: { display: false } } }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}