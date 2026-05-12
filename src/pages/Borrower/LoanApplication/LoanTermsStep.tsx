import { useState } from "react";
import Input from "../../../components/UI/Input";
import Button from "../../../components/UI/Button";
import Select from "../../../components/UI/Select";
import { submitLoanApplication } from "../../../api/borrower/post";
import { jwtDecode } from "jwt-decode";
import { loanSubmissionSchema } from "../../../validations/loan.validation";

interface LoanPayload {
  UserId: string;
  RequestedOn: string;
  BorrowerEmail: string;
  LoanAmount: number;
  // TermOfLoan: number;
  PersonalInfo: string,
  EmploymentDetails: string,
  PurposeOfLoan: string;
  CaseStatus: string;
  RequesterEmailID: string;
  [key: string]: any;
}

export default function LoanTermsStep({
  defaultValues,
  onSubmit,
  onBack,
}: any) {
  const [data, setData] = useState(defaultValues || {});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (e.target.name === "loanAmount") {
      const onlyNums = e.target.value.replace(/[^0-9]/g, "");
      if (onlyNums.length <= 5) {
        setData({ ...data, [e.target.name]: onlyNums });
      }
      return;
    }
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setApiError(null);

    // Kept exactly as requested
    const token = localStorage.getItem("borrower_token");
    const borrowerId = jwtDecode<{ guid: string }>(token || "")?.guid;
    const borrowerEmail = jwtDecode<{ email: string }>(token || "")?.email;

    if (!borrowerId) {
      setApiError("Borrower session not found. Please login again.");
      return;
    }

    const payload: LoanPayload = {
      RequestedOn: new Date().toISOString(),
      BorrowerEmail: borrowerEmail || "",
      LoanAmount: Number(data.loanAmount),
      // TermOfLoan: Number(data.tenureMonths),
      // CHANGED: Removed "Personal Loan" default. User must select a value.
      PurposeOfLoan: data.loanType,
      CaseStatus: "Draft",
      PersonalInfo: localStorage.getItem("profileId") || "",
      EmploymentDetails: localStorage.getItem("employmentId") || "",
      UserId: borrowerId,
      RequesterEmailID: borrowerEmail || "",
    };

    // Joi Validation - This will now catch if PurposeOfLoan is empty/missing
    const { error } = loanSubmissionSchema.validate(payload, { abortEarly: true });
    if (error) {
      setApiError(error.details[0].message);
      return;
    }

    try {
      setLoading(true);
      const res = await submitLoanApplication(payload);

      if (!res.success) {
        setApiError(res.message || "Loan submission failed");
        return;
      }

      console.log("Loan submission successful with res:", res);
      console.log("Loan submission successful with response:", res.response);

      const newLoanId = res.response?.data?.id || res.response?.data?.Id;
      onSubmit(newLoanId);

      // onSubmit(payload);
    } catch {
      setApiError("Something went wrong while submitting loan request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Loan Terms</h2>

      {apiError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Loan Type*"
          name="loanType"
          // If using a generic Select component, ensure it has a placeholder 
          // like <option value="">Select a type</option> inside it.
          value={data.loanType || ""}
          onChange={handleChange}
          options={[
            "Personal Loan",
            "Education Loan",
            "Home Loan",
            "Business Loan",
            "Medical Loan",
          ]}
        />

        <Input
          label="Loan Amount (Min $1,000 - Max $10,000)*"
          name="loanAmount"
          type="number"
          value={data.loanAmount || ""}
          onChange={handleChange}
        />

        {/* <Input
          label="Tenure (3 - 360 Months)*"
          name="tenureMonths"
          type="number"
          value={data.tenureMonths || ""}
          onChange={handleChange}
        /> */}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          Submit Loan Request
        </Button>
      </div>
    </>
  );
}