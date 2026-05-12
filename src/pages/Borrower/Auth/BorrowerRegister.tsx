import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerBorrower } from "../../../api/borrower/post";
import { useAuth } from "../../../context/useAuth";
import Button from "../../../components/UI/Button";
import { registerSchema } from "../../../validations/auth.validation";

export default function BorrowerRegister() {
  const navigate = useNavigate();
  const { borrowerLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Joi Validation
    const { error: validationError } = registerSchema.validate(
      { email, password, confirmPassword },
      { abortEarly: true }
    );

    if (validationError) {
      setError(validationError.details[0].message);
      return;
    }

    setLoading(true);

    const result = await registerBorrower(email, password);

    if (!result.success) {
      setError(result.message || "Registration failed");
      setLoading(false);
      return;
    }

    borrowerLogin(result.response.token);
    setLoading(false);
    navigate("/borrower/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">

        <h2 className="text-2xl font-bold text-center mb-6">
          Borrower Registration
        </h2>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleRegister}>
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

          <div>
            <label className="block text-gray-600 mb-1">
              Confirm Password*
            </label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Centered Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Creating account..." : "Register"}
            </Button>
          </div>
        </form>

        {/* Login Link */}
        <p className="text-sm text-center text-gray-600 mt-4">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/borrower/login")}
            className="text-black font-medium cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}