import { useEffect, useState } from "react";
import Button from "../../../components/UI/Button";
import { useUiPathAuth } from "../../../context/UiPathAuthContext";
import { useNavigate } from "react-router-dom";

export const LoginScreen = () => {
  const { isAuthenticated, login, error, isLoading, roleLender } = useUiPathAuth();
  const navigate = useNavigate();
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  const handleLogin = async () => {
    try {
      setHasAttemptedLogin(true);
      await login();
      console.log("Login initiated, waiting for authentication...");
    } catch (err) {
      console.error('Login failed:', err);
      setHasAttemptedLogin(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && roleLender && hasAttemptedLogin) {
      console.log("IsAuthenticated:", isAuthenticated);
      console.log("Authenticated with role:", roleLender);
      // Navigate to the correct routes defined in App.tsx
      if (roleLender === "Loan Officer") {
        navigate("/lender/dashboard", { replace: true });
      } else if (roleLender === "Underwriter") {
        navigate("/underwriter/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, roleLender, hasAttemptedLogin, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-200 to-black-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lender Login</h1>
          <p className="text-gray-600">Financial Lending Process Management Dashboard</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Please login</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gray-200 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-black-800 mb-2">Before you begin:</h3>
            <ul className="text-sm text-black-700 space-y-1">
              <li>• Ensure you have UiPath Cloud access</li>
              <li>• Configure OAuth app in Admin Center</li>
              <li>• Set correct redirect URI</li>
            </ul>
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isAuthenticated ? "Fetching role..." : "Connecting..."}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Sign in with UiPath
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You'll be redirected to UiPath Cloud for authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};