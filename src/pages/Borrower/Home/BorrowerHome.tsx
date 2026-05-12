import { useNavigate } from "react-router-dom";
import Button from "../../../components/UI/Button";
import { jwtDecode } from "jwt-decode";

export default function BorrowerHome() {
  const navigate = useNavigate();

  const username = jwtDecode<{ email: string }>(localStorage.getItem("borrower_token") || "").email;
//   const username = "Shivansh"; // later from auth context

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow p-8 space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Hi {username} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome to Accelifinance, your trusted lending partner.
          </p>
        </div>

        {/* About Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">
            Who We Are
          </h2>

          <p className="text-gray-600 leading-relaxed">
            We are a modern financial lending platform connecting borrowers
            with trusted lenders. Our portal serves thousands of users by
            providing quick, transparent, and secure loan processing.
          </p>

          <p className="text-gray-600 leading-relaxed">
            Whether you're looking for a personal loan, education funding,
            or short-term financial support, we make borrowing simple,
            reliable, and fast.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/borrower/loan-request-steps")}
          >
            Make a Loan Request
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/borrower/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
