import { Suspense, lazy } from "react";
import Home from "./pages/Home";
import BorrowerLogin from "./pages/Borrower/Auth/BorrowerLogin";
import BorrowerDashboard from "./pages/Borrower/Dashboard/Dashboard";

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { LoginScreen as LenderLogin } from "./pages/Lender/Auth/LenderLogin";

import Navbar from "./components/Header/Navbar";
import { AuthProvider } from "./context/useAuth";
import { UiPathAuthProvider } from "./context/UiPathAuthContext";

import type { UiPathSDKConfig } from "@uipath/uipath-typescript";
import BorrowerHome from "./pages/Borrower/Home/BorrowerHome";
import BorrowerRegister from "./pages/Borrower/Auth/BorrowerRegister";
import LoanApplicationWizard from "./pages/Borrower/LoanSteps/LoanApplicationWizard";
import BorrowerReviewPage from "./pages/Borrower/ReviewPage/BorrowerReviewPage";
import UploadDocumentsPage from "./pages/Borrower/UploadDocuments/UploadDocumentsPage";
import DocumentReuploadPage from "./pages/Borrower/UploadDocuments/DocumentReuploadPage";
import ViewDocumentsPage from "./pages/Borrower/ViewDocumentsPage/ViewDocumentsPage";
import LoanDetailsPage from "./pages/Borrower/LoanDetails/LoanDetailsPage";

// Lazy load heavy dashboard components for code-splitting
const LoanOfficerDashbaord = lazy(() => import("./pages/Lender/LoanOfficer/LoanOfficerDashbaord"));
const LenderLoanDetailsPage = lazy(() => import("./pages/Lender/LoanOfficer/LoanDetailsPage"));
const UnderwriterDashboard = lazy(() => import("./pages/Lender/Underwriter/Dashboard/UnderwriterDashboard"));
const UnderwriterLoanDetailsPage = lazy(() => import("./pages/Lender/Underwriter/LoanDetailsPage/UnderwriterLoanDetailsPage"));
const UnderwriterAgreementSignPage = lazy(() => import("./pages/Lender/Underwriter/ActionPage/UnderwriterAgreementSignPage"));

// Lazy load admin components
const AdminLayout = lazy(() => import("./components/Layout/AdminLayout"));
const UserManagementPage = lazy(() => import("./pages/Admin/UserManagement/UserManagementPage"));
const AuditLogViewerPage = lazy(() => import("./pages/Admin/AuditLog/AuditLogViewerPage"));

import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import AccessDenied from "./components/FailedUI/AccessDenied";
import Footer from "./components/Footer/Footer";
import UnderwriterEvaluation from "./pages/Lender/Underwriter/ActionPage/UnderwriterEvaluation";
import UnderwriterLayout from "./components/Layout/UnderwriterLayout";

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F1F5F9]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Loading page...</p>
      </div>
    </div>
  );
}

const authConfig: UiPathSDKConfig = {
  clientId: import.meta.env.VITE_UIPATH_CLIENT_ID,
  orgName: import.meta.env.VITE_UIPATH_ORG_NAME,
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME,
  baseUrl: import.meta.env.VITE_UIPATH_BASE_URL,
  redirectUri: import.meta.env.VITE_UIPATH_REDIRECT_URI,
  scope: import.meta.env.VITE_UIPATH_SCOPE,
};

export default function App() {
  return (
    <UiPathAuthProvider config={authConfig}>
      <AuthProvider>
        <Router>
          <Navbar />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/borrower/login" element={<BorrowerLogin />} />
            <Route path="/borrower/register" element={<BorrowerRegister />} />
            <Route path="/lender-login" element={<LenderLogin />} />
            <Route path="/access-denied" element={<AccessDenied />} />

            {/* Restricted to: BORROWER */}
            <Route element={<ProtectedRoute allowedRole="Borrower" />}>
              <Route path="/borrower/dashboard" element={<BorrowerDashboard />} />
              <Route path="/borrower/home" element={<BorrowerHome />} />
              <Route path="/borrower/loan-request-steps" element={<LoanApplicationWizard />} />
              <Route path="/borrower/review" element={<BorrowerReviewPage />} />
              <Route path="/borrower/upload-documents" element={<UploadDocumentsPage />} />
              <Route path="/borrower/reupload-documents" element={<DocumentReuploadPage />} />
              <Route path="/borrower/reupload-documents/:loanId" element={<DocumentReuploadPage />} />
              <Route path="/borrower/view-documents" element={<ViewDocumentsPage />} />
              <Route path="/borrower/loan-details/:loanId" element={<LoanDetailsPage />} />
              <Route path="/borrower/dashboard?event=signing_complete" element={<BorrowerDashboard />} />
            </Route>

            {/* Restricted to: OFFICER */}
            <Route element={<ProtectedRoute allowedRole="Officer" />}>
              <Route path="/lender/dashboard" element={
                <Suspense fallback={<PageLoader />}>
                  <LoanOfficerDashbaord />
                </Suspense>
              } />
              <Route path="/lender/loan-details/:loanId/:borrowerId/:caseNumber" element={
                <Suspense fallback={<PageLoader />}>
                  <LenderLoanDetailsPage />
                </Suspense>
              } />
            </Route>

            {/* Restricted to: UNDERWRITER */}
            <Route element={<ProtectedRoute allowedRole="Underwriter" />}>
              <Route element={<UnderwriterLayout />}>
                <Route path="/underwriter/dashboard" element={
                  <Suspense fallback={<PageLoader />}>
                    <UnderwriterDashboard />
                  </Suspense>
                } />
                <Route path="/underwriter/loan-details/:loanId/:borrowerId/:caseNumber" element={
                  <Suspense fallback={<PageLoader />}>
                    <UnderwriterLoanDetailsPage />
                  </Suspense>
                } />
                <Route path="/underwriter/agreement-sign/:loanId/:userId" element={
                  <Suspense fallback={<PageLoader />}>
                    <UnderwriterAgreementSignPage />
                  </Suspense>
                } />
                <Route
                  path="/lender/loan-action/:loanId/:userId"
                  element={<UnderwriterEvaluation />}
                />
              </Route>
            </Route>

            {/* Restricted to: ADMIN */}
            <Route element={<ProtectedRoute allowedRole="Admin" />}>
              <Route element={
                <Suspense fallback={<PageLoader />}>
                  <AdminLayout />
                </Suspense>
              }>
                <Route path="/admin/users" element={
                  <Suspense fallback={<PageLoader />}>
                    <UserManagementPage />
                  </Suspense>
                } />
                <Route path="/admin/audit-logs" element={
                  <Suspense fallback={<PageLoader />}>
                    <AuditLogViewerPage />
                  </Suspense>
                } />
              </Route>
            </Route>

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </Router>
      </AuthProvider>
    </UiPathAuthProvider>
  );
}