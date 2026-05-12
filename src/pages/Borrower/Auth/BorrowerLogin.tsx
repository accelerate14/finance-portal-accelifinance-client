import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginBorrower } from "../../../api/borrower/post";
import { getBorrowerProfile } from "../../../api/borrower/get";
import { useAuth } from "../../../context/useAuth";
import Button from "../../../components/UI/Button";
import { jwtDecode } from "jwt-decode";
import { getBorrowerProgress } from "../../../api/borrower/get";
import { loginSchema } from "../../../validations/auth.validation";

export default function BorrowerLogin() {
  const navigate = useNavigate();
  const { borrowerLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If borrower is already logged in, redirect to dashboard
    const token = localStorage.getItem("borrower_token");
    if (token) {
      navigate("/borrower/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error: validationError } = loginSchema.validate({ email, password });
    if (validationError) {
      setError(validationError.details[0].message);
      return;
    }

    setLoading(true);

    const result = await loginBorrower(email, password);

    if (!result.success) {
      setError(result.message || "Login failed");
      setLoading(false);
      return;
    }

    // Get userId from token without storing it yet
    const token = result.response.token;
    const decoded = jwtDecode<{ guid: string }>(token);
    const userId = decoded.guid;

    // Check if borrower is active BEFORE logging them in
    const profileRes = await getBorrowerProfile(userId);
    if (profileRes.success && profileRes.response && profileRes.response.isActive === false) {
      setError("Your account has been disabled. Please contact an administrator.");
      setLoading(false);
      return;
    }

    // Only login if user is active
    borrowerLogin(token);

    const res = await getBorrowerProgress(userId);
    if (!res.success) {
      setError(res.message || "Failed to load borrower state");
      return;
    }

    const { data } = res.response;

    localStorage.setItem("borrowerId", userId || "");
    setLoading(false);
    navigate("/borrower/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">
          Borrower Login
        </h2>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-gray-600 mb-1">Email*</label>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Password*</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </form>

        {/* Register Link */}
        <p className="text-sm text-center text-gray-600 mt-6">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/borrower/register")}
            className="text-black font-medium cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}