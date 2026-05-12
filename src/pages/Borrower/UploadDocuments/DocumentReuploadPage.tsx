import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getLoanById } from "../../../api/borrower/get";
import { uploadBorrowerDocuments } from "../../../api/borrower/post";
import { updateLoanStatus } from "../../../api/borrower/put";
import Button from "../../../components/UI/Button";
import DocumentUploadBox from "../../../components/Documents/DocumentUploadBox";

type LoanData = {
  Id: string;
  CaseId: string;
  CaseStatus: string;
  LoanAmount: number;
  TermOfLoan: number;
  InterestRate: number;
  PurposeOfLoan: string;
  MonthlyPayment: number;
  TotalPayment: number;
  LoanOfficerComments?: string;
  loanOfficerComments?: string;
  Comments?: string;
  comments?: string;
  RejectionReason?: string;
  rejectionReason?: string;
};

export default function DocumentReuploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loanId: urlLoanId } = useParams();
  
  const loanId = location.state?.loanId || urlLoanId;
  const loanFromState = location.state?.loan;

  const [loan, setLoan] = useState<LoanData | null>(loanFromState || null);
  const [loading, setLoading] = useState(false);
  const [fetchingLoan, setFetchingLoan] = useState(!loanFromState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [payStubFile, setPayStubFile] = useState<File | null>(null);

  const borrowerId = jwtDecode<{ guid: string }>(localStorage.getItem("borrower_token") || "").guid;

  useEffect(() => {
    if (loan) {
      setFetchingLoan(false);
      return;
    }

    const fetchLoan = async () => {
      if (!loanId) {
        navigate("/borrower/dashboard");
        return;
      }
      try {
        const result = await getLoanById(loanId);
        if (result.success) {
          setLoan(result.response.data);
        }
      } catch (err) {
        console.error("Error fetching loan:", err);
        setError("Failed to load loan details.");
      } finally {
        setFetchingLoan(false);
      }
    };

    fetchLoan();
  }, [loanId, loan, navigate]);

  const handleSubmit = async () => {
    if (!licenseFile || !payStubFile) {
      setError("Please upload both your Driver's License and Recent Pay Stub.");
      return;
    }

    if (!loan?.CaseId) {
      setError("Case ID not found. Please try again.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload documents (backend automatically links DocumentsStorageRecord to loan application)
      const uploadResult = await uploadBorrowerDocuments(
        borrowerId,
        loan.CaseId,
        licenseFile,
        payStubFile
      );

      // Update loan status to "Documents Reuploaded" after successful document upload
      if (loanId) {
        try {
          await updateLoanStatus(loanId, "Document Reuploaded");
          console.log(`Successfully updated loan ${loanId} status to "Document Reuploaded"`);
        } catch (statusError: any) {
          console.error("Error updating loan status:", statusError);
        }
      }

      setSuccess(true);
      
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate("/borrower/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Upload Error:", err);
      setError(err.response?.data?.message || "Failed to upload documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingLoan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <h2 className="text-lg font-medium text-gray-700">Loading document reupload details...</h2>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Documents Reuploaded!</h2>
          <p className="text-gray-600 mb-4">
            Your documents have been successfully reuploaded. The loan officer will review them shortly.
          </p>
          <p className="text-sm text-gray-500 italic">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const officerComments = loan?.LoanOfficerComments || loan?.loanOfficerComments || loan?.Comments || loan?.comments;
  const rejectionReason = loan?.RejectionReason || loan?.rejectionReason;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Document Reupload</h1>
            <p className="text-sm text-gray-500 mt-1">
              Please reupload the required documents to continue processing your application.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            ← Back to Loan Details
          </Button>
        </div>

        {/* Officer Comments Card - Only show if there are comments */}
        {officerComments && (
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-amber-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Loan Officer Comments</h2>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-gray-700 italic">{officerComments}</p>
            </div>
          </div>
        )}

        {/* Document Upload Section */}
        <div className="bg-white rounded-xl shadow p-6 md:p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Upload Documents</h2>
          <p className="text-sm text-gray-500 mb-6">
            Please upload updated copies of the following documents.
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DocumentUploadBox
              title="Driver's License"
              description="Upload a clear copy of your Driver's License"
              onChange={setLicenseFile}
            />
            <DocumentUploadBox
              title="Recent Pay Stub"
              description="Upload your most recent pay stub"
              onChange={setPayStubFile}
            />
          </div>

          <div className="flex justify-end mt-8">
            <Button
              onClick={handleSubmit}
              loading={loading}
              className="px-8"
            >
              Reupload Documents
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
