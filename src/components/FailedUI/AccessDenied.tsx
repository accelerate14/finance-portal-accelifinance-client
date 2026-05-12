import { useNavigate } from "react-router-dom";
import Button from "../UI/Button";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow p-8 text-center space-y-4 max-w-md">

        <h1 className="text-2xl font-bold text-red-600">
          Access Denied
        </h1>

        <p className="text-gray-600">
          You do not have permission to access this page.
        </p>

        <Button
          variant="secondary"
          onClick={() => navigate("/")}
        >
          Go Back Home
        </Button>
      </div>
    </div>
  );
}
