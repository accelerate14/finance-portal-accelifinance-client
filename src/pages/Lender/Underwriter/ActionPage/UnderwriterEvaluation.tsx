import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUiPathAuth } from "../../../../context/UiPathAuthContext";
import { useAuditLog } from "../../../../hooks/useAuditLog";
import { getBorrowerDocuments } from "../../../../api/borrower/get";
import { Entities } from '@uipath/uipath-typescript/entities';
import { DocusealForm } from "@docuseal/react";
import { jwtDecode } from "jwt-decode";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default function UnderwriterEvaluation() {
    const { loanId, userId } = useParams<{ loanId: string; userId: string }>();
    const navigate = useNavigate();
    const { sdk, isAuthenticated, user, roleLender } = useUiPathAuth();
    const { logAudit } = useAuditLog();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"details" | "actions">("details");

    const [signOpen, setSignOpen] = useState(false);
    const [loadingSubmission, setLoadingSubmission] = useState(false);
    const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);
    const [uploadingAgreement, setUploadingAgreement] = useState(false);
    const [signCompleted, setSignCompleted] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);
    const [lenderName, setLenderName] = useState("Lender");

    useEffect(() => {
        const lenderToken = localStorage.getItem(`uipath_sdk_user_token-${import.meta.env.VITE_UIPATH_CLIENT_ID}`);
        const decoded: any = lenderToken ? jwtDecode(lenderToken) : null;
        setLenderName(decoded?.name || "Lender");
    }, []);

    useEffect(() => {
        const fetchFullAuditData = async () => {
            if (!sdk || !isAuthenticated) return;
            setLoading(true);
            try {
                console.log("Fetching audit data for loan:", loanId, "and user:", userId);
                const entitiesService = new Entities(sdk);
                const allEntities = await entitiesService.getAll();

                const loanMeta = allEntities.find(e => e.name === "FLCMLoanApplications");
                const profileMeta = allEntities.find(e => e.name === "FLCMPersonalInfo");
                const employMeta = allEntities.find(e => e.name === "FLCMEmploymentData");

                const [loanRes, profileRes, employRes] = await Promise.all([
                    loanMeta ? entitiesService.getAllRecords(loanMeta.id) : { items: [] },
                    profileMeta ? entitiesService.getAllRecords(profileMeta.id) : { items: [] },
                    employMeta ? entitiesService.getAllRecords(employMeta.id) : { items: [] },
                ]);

                console.log("Fetched loans:", loanRes.items);
                console.log("Fetched profiles:", profileRes.items);
                console.log("Fetched employment data:", employRes.items);

                const activeLoan = (loanRes.items as any[]).find(r => r.Id === loanId);
                console.log("Fetched loan:", activeLoan);

                let docs = null;
                if (activeLoan?.CaseId) {
                    const docRes = await getBorrowerDocuments(activeLoan.CaseId);
                    if (docRes.success) docs = docRes.response.data;
                }

                setData({
                    loan: activeLoan,
                    profile: (profileRes.items as any[]).find(r => r.UserId === userId),
                    employment: (employRes.items as any[]).find(r => r.UserId === userId),
                    documents: docs
                });
            } catch (err) {
                console.error("Underwriter Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFullAuditData();
    }, [loanId, userId, sdk, isAuthenticated]);

    // ── Derived state — source of truth is the document, not just status ──
    const borrowerSigned = !!data?.documents?.LoanAgreement; // null = not signed
    const caseStatus = data?.loan?.CaseStatus?.toUpperCase() || "";
    const lenderAlreadySigned = caseStatus.includes("Agreement Signed by Underwriter");
    // Lender needs to sign if: borrower has signed AND lender hasn't yet
    const lenderActionNeeded = borrowerSigned && !lenderAlreadySigned;
    const pendingActionCount = lenderActionNeeded ? 1 : 0;

    // ── Open lender sign overlay ──────────────────────────────
    const openLenderSignOverlay = async () => {
        setLoadingSubmission(true);
        setSignOpen(true);
        setSignCompleted(false);
        setSignError(null);
        setSubmissionUrl(null);

        try {
            const response = await fetch(`${baseUrl}/api/borrower/documents/create-lender-submission`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    loanId: data?.loan?.Id,
                    caseId: data?.loan?.CaseId,
                    lenderEmail: import.meta.env.VITE_LENDER_EMAIL,
                    lenderName: "AcceliFinance",
                }),
            });

            const result = await response.json();
            if (!result.success || !result.url) throw new Error(result.message);
            setSubmissionUrl(result.url);
        } catch (err) {
            console.error("Lender submission error:", err);
            setSignError("Could not prepare the signing form. Please try again.");
        } finally {
            setLoadingSubmission(false);
        }
    };

    // ── On lender sign complete ───────────────────────────────
    const handleLenderSignComplete = async (docuData: any) => {
        setUploadingAgreement(true);
        setSignError(null);
        try {
            const submissionId = docuData?.submission_id || docuData?.submission?.id;
            if (!submissionId) throw new Error("No submission ID returned");

            const response = await fetch(`${baseUrl}/api/borrower/documents/upload-lender-agreement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId,
                    CaseNumber: data?.loan?.CaseId,
                }),
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            setSignCompleted(true);

            const docRes = await getBorrowerDocuments(data?.loan?.CaseId);
            if (docRes.success) {
                setData((prev: any) => ({ ...prev, documents: docRes.response.data }));
            }

            // Audit log - fire and forget
            logAudit({
                action: 'AgreementCounterSigned',
                entityType: 'Agreement',
                entityId: data?.loan?.Id || "",
                caseId: data?.loan?.CaseId || "",
                newValue: { submissionId, signedBy: user, role: roleLender },
                description: `Underwriter counter-signed loan agreement for case ${data?.loan?.CaseId}`,
                severity: 'Critical'
            });
        } catch (err: any) {
            console.error("Lender upload error:", err);
            setSignError("Signed but failed to save. Please contact support.");
        } finally {
            setUploadingAgreement(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                    Generating Audit Report...
                </p>
            </div>
        </div>
    );

    const { loan, profile, employment, documents } = data || {};

    return (
        <>
            <div className="min-h-screen bg-slate-50 font-sans">

                {/* ── TOP HEADER BAR ── */}
                <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        ← Back to Queue
                    </button>
                    <div className="text-center">
                        <h1 className="text-base font-black text-slate-900 uppercase tracking-widest">Underwriter Audit</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Case: {loan?.CaseId}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                            lenderAlreadySigned
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : borrowerSigned
                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                            {lenderAlreadySigned ? "✓ Agreement Approved" : borrowerSigned ? "⏳ Awaiting Lender Sign" : loan?.CaseStatus}
                        </span>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto p-8">

                    {/* ── TABS ── */}
                    <div className="flex border-b border-slate-200 mb-8">
                        {["details", "actions"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as "details" | "actions")}
                                className={`relative px-8 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab
                                        ? "border-b-2 border-indigo-600 text-indigo-600"
                                        : "text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                {tab === "details" ? "Audit Details" : "Actions"}
                                {tab === "actions" && pendingActionCount > 0 && (
                                    <span className="ml-2 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full">
                                        {pendingActionCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ── DETAILS TAB ── */}
                    {activeTab === "details" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left — Pillars 1 & 2 */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* Pillar 1 */}
                                <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-5">
                                        Pillar 1 — Identity & Employment
                                    </p>
                                    <div className="grid grid-cols-2 gap-6">
                                        <InfoBlock label="Legal Name" value={`${profile?.FirstName ?? ""} ${profile?.LastName ?? ""}`} />
                                        <InfoBlock label="SSN" value={profile?.SSN} />
                                        <InfoBlock label="Employment Status" value={employment?.EmploymentStatus} />
                                    </div>
                                </section>

                                {/* Pillar 2 */}
                                <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">
                                        Pillar 2 — Financial Terms
                                    </p>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { label: "Loan Amount", value: `$${loan?.LoanAmount?.toLocaleString()}` },
                                            { label: "Term", value: `${loan?.TermOfLoan} Mo` },
                                            { label: "Purpose", value: loan?.PurposeOfLoan || "N/A" },
                                        ].map(item => (
                                            <div key={item.label} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                                <p className="text-[9px] text-slate-500 font-black uppercase mb-1">{item.label}</p>
                                                <p className="text-lg font-black">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Right — Documents & Actions */}
                            <div className="space-y-5">

                                {/* Pillar 3 */}
                                <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">
                                        Pillar 3 — Evidence
                                    </p>
                                    <div className="space-y-2">
                                        <DocRow label="ID Verification" isUploaded={!!documents?.DriversLicense} url={documents?.DriversLicense} />
                                        <DocRow label="Income Proof" isUploaded={!!documents?.PayStub} url={documents?.PayStub} />
                                        <DocRow
                                            label="Loan Agreement"
                                            isUploaded={!!documents?.LoanAgreement}
                                            url={documents?.LoanAgreement}
                                            badge={
                                                documents?.LoanAgreement
                                                    ? lenderAlreadySigned
                                                        ? { label: "Both Signed", color: "emerald" }
                                                        : { label: "Borrower Signed", color: "amber" }
                                                    : undefined
                                            }
                                        />
                                    </div>
                                </section>

                                {/* Funding Actions */}
                                {/* <div className="flex flex-col gap-3">
                                    <button className="w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl shadow hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs">
                                        Approve for Funding
                                    </button>
                                    <button className="w-full bg-white border-2 border-slate-200 text-slate-500 font-black py-3.5 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">
                                        Deny Application
                                    </button>
                                </div> */}
                            </div>
                        </div>
                    )}

                    {/* ── ACTIONS TAB ── */}
                    {activeTab === "actions" && (
                        <div className="space-y-4 max-w-3xl">

                            {/* No actions needed */}
                            {!lenderActionNeeded && (
                                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
                                    <div className="text-5xl mb-4">
                                        {lenderAlreadySigned ? "✅" : "⏳"}
                                    </div>
                                    <p className="font-black text-slate-700 uppercase tracking-widest text-sm mb-2">
                                        {lenderAlreadySigned
                                            ? "Agreement Fully Executed"
                                            : "Awaiting Borrower Signature"}
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                        {lenderAlreadySigned
                                            ? "Both parties have signed. The loan agreement is complete and status has been updated to Agreement Approved."
                                            : "The borrower has not yet signed the loan agreement. The lender counter-signature option will appear here once the borrower completes signing."}
                                    </p>
                                </div>
                            )}

                            {/* Lender sign action */}
                            {lenderActionNeeded && (
                                <>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                        <span className="text-red-500">{pendingActionCount} action</span> requires your attention
                                    </p>

                                    <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shrink-0">
                                                    ✍️
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">
                                                        Counter-Sign Loan Agreement
                                                    </h3>
                                                    <p className="text-xs text-slate-500">
                                                        The borrower has completed their signature. Your counter-signature
                                                        is required to finalize and approve this loan for disbursement.
                                                    </p>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                                                            ✓ Borrower signed
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                                                            ⏳ Your signature pending
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={openLenderSignOverlay}
                                                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-xl uppercase tracking-widest text-xs transition-all shadow"
                                            >
                                                Sign Now →
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DocuSeal Full Screen Sign Overlay ── */}
            {signOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white">

                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-lg shrink-0">
                                ✍️
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                    Lender Counter-Signature
                                </h2>
                                <p className="text-[11px] text-slate-400">
                                    Case #{loan?.CaseId} &nbsp;·&nbsp;
                                    <span className="font-bold text-slate-600">${loan?.LoanAmount?.toLocaleString()}</span>
                                    &nbsp;·&nbsp; Signing as <span className="font-bold text-indigo-600">{lenderName}</span>
                                </p>
                            </div>
                        </div>
                        {!uploadingAgreement && !loadingSubmission && (
                            <button
                                onClick={() => setSignOpen(false)}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-300 px-3 py-2 rounded-lg transition-all font-bold"
                            >
                                ✕ Close
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto bg-slate-50">

                        {loadingSubmission && (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Loading signed document...
                                </p>
                            </div>
                        )}

                        {uploadingAgreement && !loadingSubmission && (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Saving agreement to records...
                                </p>
                            </div>
                        )}

                        {signError && !uploadingAgreement && !loadingSubmission && (
                            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                                <div className="text-5xl">⚠️</div>
                                <p className="text-red-600 font-bold text-center text-sm">{signError}</p>
                                <button
                                    onClick={() => setSignOpen(false)}
                                    className="bg-slate-800 text-white font-black px-6 py-2 rounded-xl uppercase tracking-widest text-xs"
                                >
                                    Close
                                </button>
                            </div>
                        )}

                        {signCompleted && !uploadingAgreement && !signError && (
                            <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
                                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl">
                                    🎉
                                </div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">
                                    Agreement Approved!
                                </h3>
                                <p className="text-xs text-slate-500 text-center max-w-sm">
                                    The loan agreement has been counter-signed. Case status updated to{" "}
                                    <span className="font-black text-emerald-600">Agreement Approved</span>.
                                </p>
                                <button
                                    onClick={() => { setSignOpen(false); window.location.reload(); }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest text-xs mt-2 transition-all"
                                >
                                    Back to Audit
                                </button>
                            </div>
                        )}

                        {!signCompleted && !uploadingAgreement && !signError && !loadingSubmission && submissionUrl && (
                            <div className="max-w-3xl mx-auto py-8 px-4">
                                <DocusealForm
                                    src={submissionUrl}
                                    onComplete={handleLenderSignComplete}
                                    withTitle={false}
                                    withDownloadButton={false}
                                    allowToResubmit={false}
                                    style={{ width: "100%" }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Sub-Components ── */
function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-bold text-slate-800">{value || "—"}</p>
        </div>
    );
}

function DocRow({ label, isUploaded, url, badge }: {
    label: string;
    isUploaded: boolean;
    url?: string;
    badge?: { label: string; color: "emerald" | "amber" };
}) {
    const badgeColors = {
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
        amber: "text-amber-600 bg-amber-50 border-amber-200"
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{label}</p>
                <div className="flex items-center gap-2">
                    <p className={`text-[9px] font-bold uppercase ${isUploaded ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {isUploaded ? 'Received' : 'Missing'}
                    </p>
                    {badge && (
                        <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full ${badgeColors[badge.color]}`}>
                            {badge.label}
                        </span>
                    )}
                </div>
            </div>
            {isUploaded && url && (
                <button
                    onClick={() => window.open(url, '_blank')}
                    className="bg-white p-2 rounded-lg border border-slate-200 hover:border-indigo-400 text-indigo-500 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            )}
        </div>
    );
}