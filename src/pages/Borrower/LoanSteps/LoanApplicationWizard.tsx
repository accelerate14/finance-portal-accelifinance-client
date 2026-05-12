import { useEffect, useState } from "react";
import PersonalInfoStep from "../PersonalInfo/PersonalInfoStep";
import EmploymentStep from "../EmploymentStatus/EmploymentStep";
import LoanTermsStep from "../LoanApplication/LoanTermsStep";
import { getBorrowerProgress } from "../../../api/borrower/get";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

export default function LoanApplicationWizard() {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<any>({
    personalInfo: {},
    employmentInfo: {},
    loanTerms: {},
  });

  useEffect(() => {
    const loadState = async () => {
      try {
        const res = await getBorrowerProgress(jwtDecode<{ guid: string }>(localStorage.getItem("borrower_token") || "").guid);


        console.log("Borrower progress response:", res);
        
        if (!res.success) {
          setApiError(res.message || "Failed to load borrower state");
          return;
        }

        const { nextStep, completed, data } = res.response;

        localStorage.setItem("borrowerId", jwtDecode<{ guid: string }>(localStorage.getItem("borrower_token") || "").guid || "");

        setFormData({
          personalInfo: data?.profile || {},
          employmentInfo: data?.employment || {},
          loanTerms: {},
        });

        // 🔒 STEP COMES FROM BACKEND
        setStep(1);

      } catch (err: any) {
        setApiError("Unable to initialize application");
      } finally {
        setLoading(false);
      }
    };

    loadState();
  }, []);

  if (loading) {
    return <div className="p-10 text-center">Loading application...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6">

        {/* Step Indicator */}
        <div className="flex justify-between mb-6 text-sm">
          {["Borrower", "Employment", "Loan Terms"].map((label, i) => (
            <div
              key={label}
              className={`flex-1 text-center ${step === i + 1
                  ? "font-semibold text-black"
                  : "text-gray-400"
                }`}
            >
              {label}
            </div>
          ))}
        </div>

        {apiError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
            {apiError}
          </div>
        )}

        {step === 1 && (
          <PersonalInfoStep
            defaultValues={formData.personalInfo}
            allowNextWithoutValidation={false}
            onSuccess={(data: any) => {
              setFormData((prev: any) => ({
                ...prev,
                personalInfo: data,
              }));
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <EmploymentStep
            defaultValues={formData.employmentInfo}
            onBack={() => setStep(1)} // 🔒 locked
            onNext={(data: any) => {
              setFormData((prev: any) => ({
                ...prev,
                employmentInfo: data,
              }));
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <LoanTermsStep
            defaultValues={formData.loanTerms}
            onBack={() => setStep(2)}
            // onSubmit={() => {navigate("/borrower/review", { replace: true });}}
            onSubmit={(id: string) => {
              console.log("Loan application submitted with ID:", id);
              navigate("/borrower/upload-documents", {
                state: { loanId: id },
                replace: true
              });
            }}
            loading={false}
          />
        )}
      </div>
    </div>
  );
}