import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUiPathAuth } from "../../../../context/UiPathAuthContext";
import { useAuditLog } from "../../../../hooks/useAuditLog";
import { getBorrowerDocuments } from "../../../../api/borrower/get";
import { Entities } from '@uipath/uipath-typescript/entities';
import { DocusealForm } from "@docuseal/react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DOCUMENT_ENTITY_ID = import.meta.env.VITE_DOCUMENT_ENTITY_ID;
const LOAN_ENTITY_ID = import.meta.env.VITE_LOAN_APPLICATION_ENTITY_ID;
const PROFILE_ENTITY_ID = import.meta.env.VITE_PERSONAL_INFO_ENTITY_ID;
const EMPLOYMENT_ENTITY_ID = import.meta.env.VITE_EMPLOYMENT_ENTITY_ID;
const AGREEMENT_SUBMISSION_ENTITY_ID = import.meta.env.VITE_AGREEMENT_SUBMISSION_ENTITY_ID;

export default function UnderwriterAgreementSignPage() {
    const { loanId, userId } = useParams<{ loanId: string; userId: string }>();
    const navigate = useNavigate();
    const { sdk, isAuthenticated, user, roleLender } = useUiPathAuth();
    const { logAudit } = useAuditLog();
    const [lenderEmail, setLenderEmail] = useState<string>("");

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [signOpen, setSignOpen] = useState(true);
    const [loadingSubmission, setLoadingSubmission] = useState(false);
    const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);
    const [uploadingAgreement, setUploadingAgreement] = useState(false);
    const [signCompleted, setSignCompleted] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);
    const [lenderName, setLenderName] = useState("Underwriter");

    useEffect(() => {
        const lenderToken = sessionStorage.getItem(`uipath_sdk_user_token-${import.meta.env.VITE_UIPATH_CLIENT_ID}`);
        const decoded: any = lenderToken ? jwtDecode(lenderToken) : null;
        setLenderName(decoded?.name || "Underwriter");
        setLenderEmail(decoded?.email);
    }, []);

    useEffect(() => {
        const fetchFullAuditData = async () => {
            if (!sdk || !isAuthenticated) return;
            setLoading(false);
            try {
                console.log("Fetching data for loan:", loanId, "and user:", userId);
                const entitiesService = new Entities(sdk);

                const [loanRes, profileRes, employRes] = await Promise.all([
                    LOAN_ENTITY_ID ? entitiesService.getAllRecords(LOAN_ENTITY_ID) : { items: [] },
                    PROFILE_ENTITY_ID ? entitiesService.getAllRecords(PROFILE_ENTITY_ID) : { items: [] },
                    EMPLOYMENT_ENTITY_ID ? entitiesService.getAllRecords(EMPLOYMENT_ENTITY_ID) : { items: [] },
                ]);

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

                // Immediately open the signing form
                await openUnderwriterSignOverlay(activeLoan?.CaseId, entitiesService);
            } catch (err) {
                console.error("Fetch Error:", err);
                setSignError("Failed to load loan data. Please try again.");
            }
        };
        fetchFullAuditData();
    }, [loanId, userId, sdk, isAuthenticated]);

    // ── Open underwriter sign overlay ──────────────────────────────
    const openUnderwriterSignOverlay = async (caseId: string, entitiesService: Entities) => {
        setLoadingSubmission(true);
        setSignCompleted(false);
        setSignError(null);
        setSubmissionUrl(null);

        try {
            // Step 1: Get SubmissionId from FLCMAgreementTransactions entity using entity ID
            if (!AGREEMENT_SUBMISSION_ENTITY_ID) {
                throw new Error("VITE_AGREEMENT_SUBMISSION_ENTITY_ID not configured in .env");
            }

            const submissionRecords = await entitiesService.getAllRecords(AGREEMENT_SUBMISSION_ENTITY_ID);
            const transaction = (submissionRecords.items as any[]).find(r => r.CaseId === caseId);

            if (!transaction || !transaction.SubmissionId) {
                throw new Error("No Submission ID found. Please ensure borrower has initiated signing first.");
            }

            const submissionId = transaction.SubmissionId;
            console.log("Found SubmissionId:", submissionId);

            // Step 2: Call backend to get lender signing URL
            const response = await fetch(`${API_BASE_URL}/api/borrower/documents/create-lender-submission`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caseId: caseId,
                    submissionId: submissionId,
                    lenderEmail: lenderEmail,
                    lenderName: lenderName,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to create lender submission");
            }

            const result = await response.json();
            if (!result.success || !result.url) {
                throw new Error(result.message || "No signing URL returned");
            }

            console.log("Lender signing URL:", result.url);
            setSubmissionUrl(result.url);
        } catch (err) {
            console.error("Submission error:", err);
            setSignError(err instanceof Error ? err.message : "Could not prepare the signing form. Please try again.");
        } finally {
            setLoadingSubmission(false);
        }
    };

    // ── On underwriter sign complete ───────────────────────────────
    const handleSignComplete = async (docuData: any) => {
        setUploadingAgreement(true);
        setSignError(null);
        try {
            const submissionId = docuData?.submission_id || docuData?.submission?.id;

            if (!submissionId) {
                throw new Error("No submission ID returned");
            }

            console.log("Sign complete, polling for signed document...");

            // Step 2: Call backend to upload signed agreement
            const response = await fetch(`${API_BASE_URL}/api/borrower/documents/upload-lender-agreement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: submissionId,
                    CaseNumber: data?.loan?.CaseId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to upload signed agreement");
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "Upload failed");
            }

            console.log("Signed agreement uploaded successfully");

            setSignCompleted(true);

            // Refresh documents
            const docRes = await getBorrowerDocuments(data?.loan?.CaseId);
            if (docRes.success) {
                setData((prev: any) => ({ ...prev, documents: docRes.response.data }));
            }

            // Audit log - fire and forget
            logAudit({
                action: 'AgreementSigned',
                entityType: 'Agreement',
                entityId: data?.loan?.Id || "",
                caseId: data?.loan?.CaseId || "",
                newValue: { submissionId, signedBy: user, role: roleLender },
                description: `Underwriter signed loan agreement for case ${data?.loan?.CaseId}`,
                severity: 'Critical'
            });
        } catch (err: any) {
            console.error("Upload error:", err);
            setSignError(err.message || "Signed but failed to save. Please contact support.");
        } finally {
            setUploadingAgreement(false);
        }
    };

    // ── Upload lender agreement to Data Fabric ─────────────────────
    const uploadLenderAgreementToDataFabric = async (caseId: string, pdfFile: File) => {
        if (!sdk) throw new Error("SDK not initialized");

        const entitiesService = new Entities(sdk);

        // Find existing document record for this case using entity ID
        if (!DOCUMENT_ENTITY_ID) {
            throw new Error("VITE_DOCUMENT_ENTITY_ID not configured in .env");
        }

        const docRecords = await entitiesService.getAllRecords(DOCUMENT_ENTITY_ID);
        const existingDoc = (docRecords.items as any[]).find(r => r.CaseNumber === caseId);

        if (!existingDoc) {
            throw new Error("No document record found for this case. Please ensure borrower has uploaded documents first.");
        }

        const recordId = existingDoc.Id;
        console.log("Found document record:", recordId);

        // Upload file to UiPath attachment endpoint
        const baseUrl = import.meta.env.VITE_UIPATH_BASE_URL;
        const orgName = import.meta.env.VITE_UIPATH_ORG_NAME;
        const tenantName = import.meta.env.VITE_UIPATH_TENANT_NAME;
        
        // Get auth token from session
        const token = sessionStorage.getItem(`uipath_sdk_user_token-${import.meta.env.VITE_UIPATH_CLIENT_ID}`);
        if (!token) throw new Error("Not authenticated");

        const form = new FormData();
        form.append("file", pdfFile);

        const attachmentUrl = `${baseUrl}/${orgName}/${tenantName}/Attachment/${DOCUMENT_ENTITY_ID}/${recordId}/LoanAgreement`;
        console.log("Uploading to:", attachmentUrl);

        const uploadResponse = await fetch(attachmentUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: form
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("Upload error response:", errorText);
            throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        console.log("File uploaded successfully");

        // Update loan status to "Agreement Signed by Underwriter" using entity ID
        if (!LOAN_ENTITY_ID) {
            throw new Error("VITE_LOAN_APPLICATION_ENTITY_ID not configured in .env");
        }

        const loanRecords = await entitiesService.getAllRecords(LOAN_ENTITY_ID);
        const targetLoan = (loanRecords.items as any[]).find(r => r.CaseId === caseId);

        if (targetLoan) {
            console.log("Updating loan status to Agreement Signed by Underwriter");
            await entitiesService.updateRecordsById(LOAN_ENTITY_ID, [{
                Id: targetLoan.Id,
                CaseStatus: "Agreement Signed by Underwriter"
            }]);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                        Loading Agreement...
                    </p>
                </div>
            </div>
        );
    }

    const { loan } = data || {};

    return (
        <>
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
                                    Underwriter Agreement Signature
                                </h2>
                                <p className="text-[11px] text-slate-400">
                                    Case #{loan?.CaseId} &nbsp;·&nbsp;
                                    <span className="font-bold text-slate-600">${loan?.LoanAmount?.toLocaleString()}</span>
                                    &nbsp;·&nbsp; Signing as <span className="font-bold text-indigo-600">{lenderName}</span>
                                </p>
                            </div>
                        </div>
                        {!uploadingAgreement && !loadingSubmission && !signCompleted && (
                            <button
                                onClick={() => { setSignOpen(false); navigate(-1); }}
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
                                    Loading agreement document...
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
                                    onClick={() => { setSignOpen(false); navigate(-1); }}
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
                                    Agreement Signed Successfully!
                                </h3>
                                <p className="text-xs text-slate-500 text-center max-w-sm">
                                    The loan agreement has been signed. The case status has been updated.
                                </p>
                                <button
                                    onClick={() => { navigate("/underwriter/dashboard"); }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest text-xs mt-2 transition-all"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        )}

                        {!signCompleted && !uploadingAgreement && !signError && !loadingSubmission && submissionUrl && (
                            <div className="max-w-3xl mx-auto py-8 px-4">
                                <DocusealForm
                                    src={submissionUrl}
                                    onComplete={handleSignComplete}
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