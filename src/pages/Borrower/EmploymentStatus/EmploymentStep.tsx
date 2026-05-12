import { useState, useEffect, useRef } from "react"; // Added useRef
import Button from "../../../components/UI/Button";
import Select from "../../../components/UI/Select";
import Input from "../../../components/UI/Input";
import { submitEmploymentInfo } from "../../../api/borrower/post";
import { useAuth } from "../../../context/useAuth";
import { jwtDecode } from "jwt-decode";
import { employmentInfoSchema } from "../../../validations/employment.validation";

interface EmploymentData {
  employmentStatus?: string;
  employerName?: string;
  yearsAtEmployer?: string | number;
  monthlyIncome?: string | number;
  compensationType?: string;
  employerAddress?: string;
  employerCity?: string;
  employerState?: string;
  employerZipCode?: string;
  Id?: string;
  employmentCompleted?: boolean;
  employmentId?: string;
  [key: string]: string | number | boolean | undefined;
}

interface EmploymentStepProps {
  defaultValues?: EmploymentData;
  onNext: (data: EmploymentData) => void;
  onBack: () => void;
}

export default function EmploymentStep({ defaultValues, onNext, onBack }: EmploymentStepProps) {
  const { borrowerId } = useAuth();
  const [data, setData] = useState(defaultValues || {});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Ref to prevent API call on initial data load
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      localStorage.setItem("employmentId", defaultValues.Id || "");
      setData(defaultValues);
    }
  }, [defaultValues]);

  // Zip Code Auto-fill Logic
  useEffect(() => {
    const fetchZipData = async () => {
      // Only run if not initial mount and zip is exactly 5 digits
      if (!isInitialMount.current && data.employerZipCode?.length === 5) {
        try {
          setLoading(true);
          const response = await fetch(`https://api.zippopotam.us/us/${data.employerZipCode}`);
          const result = await response.json();

          if (!result.places || result.places.length === 0) {
            setApiError("Invalid Employer Zip Code. Please enter a valid US Zip Code.");
            setData((prev: any) => ({ ...prev, employerCity: "", employerState: "" }));
          } else {
            const place = result.places[0];
            setApiError(null);
            setData((prev: any) => ({
              ...prev,
              employerCity: place["place name"],
              employerState: place["state"]
            }));
          }
        } catch (error) {
          console.error("Employer Zip lookup failed", error);
        } finally {
          setLoading(false);
        }
      } else if (data.employerZipCode?.length !== 5) {
          // Reset mount ref if user clears the field or it's the first render
          isInitialMount.current = false;
      }
    };

    fetchZipData();
  }, [data.employerZipCode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "employmentStatus") {
      setData({
        employmentStatus: value,
        employerName: "",
        yearsAtEmployer: "",
        monthlyIncome: "",
        compensationType: "",
        employerAddress: "",
        employerCity: "",
        employerState: "",
        employerZipCode: "",
        Id: data.Id
      });
      setApiError(null);
    } else {
      // Handle numeric fields and block 'e'
      if (["employerZipCode", "monthlyIncome", "yearsAtEmployer"].includes(name)) {
        const onlyNums = value.replace(/[^0-9]/g, "");
        
        let max = 999999999;
        if (name === "employerZipCode") {
            max = 5;
            setApiError(null); // Clear error while typing
        }

        if (onlyNums.length <= max) {
          setData({ ...data, [name]: onlyNums });
        }
      } else {
        setData({ ...data, [name]: value });
      }
    }
  };

  const handleNext = async () => {
    setApiError(null);

    // Block progression if Zip is entered but City/State couldn't be found
    if (data.employmentStatus !== "Unemployed" && data.employerZipCode?.length === 5 && (!data.employerCity || !data.employerState)) {
      setApiError("Please enter a valid Employer Zip Code before proceeding.");
      return;
    }

    const token = localStorage.getItem("borrower_token");
    const decodedUserId = token ? jwtDecode<{ guid: string }>(token).guid : borrowerId;

    const payload = {
      UserId: decodedUserId,
      EmploymentStatus: data.employmentStatus || "",
      EmployerName: data.employerName || "",
      YearsAtEmployer: data.yearsAtEmployer ? Number(data.yearsAtEmployer) : 0,
      MonthlyIncome: data.monthlyIncome ? Number(data.monthlyIncome) : 0,
      CompensationType: data.compensationType || "",
      EmployerAddress: data.employerAddress || "",
      EmployerCity: data.employerCity || "",
      EmployerState: data.employerState || "",
      EmployerZipCode: data.employerZipCode || "",
    };

    const { error } = employmentInfoSchema.validate(payload, { abortEarly: true });
    if (error) {
      setApiError(error.details[0].message);
      return;
    }

    // Change detection logic
    const hasChanges = Object.keys(payload).some((key) => {
      if (key === "UserId") return false;
      const dataKeyMap: { [key: string]: string } = {
        EmploymentStatus: "employmentStatus",
        EmployerName: "employerName",
        YearsAtEmployer: "yearsAtEmployer",
        MonthlyIncome: "monthlyIncome",
        CompensationType: "compensationType",
        EmployerAddress: "employerAddress",
        EmployerCity: "employerCity",
        EmployerState: "employerState",
        EmployerZipCode: "employerZipCode",
      };
      const dataKey = dataKeyMap[key];
      return String(payload[key as keyof typeof payload] || "") !== String(defaultValues?.[dataKey] || "");
    });

    if (data.Id && !hasChanges) {
      onNext(data);
      return;
    }

    setLoading(true);
    const result = await submitEmploymentInfo(payload);

    if (!result.success) {
      setLoading(false);
      setApiError(result.message || "Employment submission failed");
      return;
    }

    const responseData = result.response?.data;
    const empId = responseData?.successRecords?.[0]?.id || result.response?.id || responseData?.id;

    if (!empId) {
      setLoading(false);
      setApiError("Server returned a success but no record ID was found.");
      return;
    }

    localStorage.setItem("employmentId", empId);

    setLoading(false);

    onNext({
      ...data,
      ...payload,
      employmentCompleted: true,
      employmentId: empId,
      Id: result.response?.Id
    });
  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Employment Information</h2>

      {apiError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Employment Status*"
          name="employmentStatus"
          options={["Salaried", "Self-Employed", "Unemployed"]}
          value={data.employmentStatus || ""}
          onChange={handleChange}
        />

        <Input
          label="Employer Name*"
          name="employerName"
          value={data.employerName || ""}
          onChange={handleChange}
          disabled={data.employmentStatus === "Unemployed"}
        />

        <Select
          label="Compensation Type*"
          name="compensationType"
          options={["Salary", "Hourly"]}
          value={data.compensationType || ""}
          onChange={handleChange}
          disabled={data.employmentStatus === "Unemployed"}
        />

        <Input
          label="Monthly Gross Income*"
          name="monthlyIncome"
          type="tel"
          value={data.monthlyIncome || ""}
          onChange={handleChange}
          disabled={data.employmentStatus === "Unemployed"}
        />

        <Input
          label="Years at this Employer*"
          name="yearsAtEmployer"
          type="tel"
          value={data.yearsAtEmployer || ""}
          onChange={handleChange}
          disabled={data.employmentStatus === "Unemployed"}
        />

        <Input
          label="Employer Address*"
          name="employerAddress"
          value={data.employerAddress || ""}
          onChange={handleChange}
          disabled={data.employmentStatus === "Unemployed"}
        />

        <Input
          label="Employer City*"
          name="employerCity"
          value={data.employerCity || ""}
          onChange={handleChange}
          disabled={data.employmentStatus === "Unemployed"}
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Employer State*"
            name="employerState"
            value={data.employerState || ""}
            onChange={handleChange}
            disabled={data.employmentStatus === "Unemployed"}
          />
          <Input
            label="Employer Zip Code*"
            name="employerZipCode"
            type="tel"
            value={data.employerZipCode || ""}
            onChange={handleChange}
            disabled={data.employmentStatus === "Unemployed"}
          />
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleNext} loading={loading}>
          Next
        </Button>
      </div>
    </>
  );
}

// import { useState, useEffect } from "react";
// import Button from "../../../components/UI/Button";
// import Select from "../../../components/UI/Select";
// import Input from "../../../components/UI/Input";
// import { submitEmploymentInfo } from "../../../api/borrower/post";
// import { useAuth } from "../../../context/useAuth";
// import { jwtDecode } from "jwt-decode";
// import { employmentInfoSchema } from "../../../validations/employment.validation";

// export default function EmploymentStep({ defaultValues, onNext, onBack }: any) {
//   const { borrowerId } = useAuth();
//   const [data, setData] = useState(defaultValues || {});
//   const [loading, setLoading] = useState(false);
//   const [apiError, setApiError] = useState<string | null>(null);

//   useEffect(() => {
//     if (defaultValues && Object.keys(defaultValues).length > 0) {
//       console.log("Setting default values for EmploymentStep:", defaultValues);
//       localStorage.setItem("employmentId", defaultValues.Id || "");
//       setData(defaultValues);
//     }
//   }, [defaultValues]);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target;

//     // Check if the user is changing the Employment Status
//     if (name === "employmentStatus") {
//       // Reset all fields and only set the new status
//       setData({
//         employmentStatus: value,
//         employerName: "",
//         yearsAtEmployer: "",
//         monthlyIncome: "",
//         compensationType: "",
//         employerAddress: "",
//         employerCity: "",
//         employerState: "",
//         employerZipCode: "",
//         // Preserve the internal ID if it exists so we don't lose the DB reference
//         Id: data.Id
//       });

//       // Clear any existing errors when status changes
//       setApiError(null);
//     } else {
//       // General case for all other inputs
//       setData({ ...data, [name]: value });
//     }
//   };

//   const handleNext = async () => {
//     setApiError(null);

//     const token = localStorage.getItem("borrower_token");
//     const decodedUserId = token ? jwtDecode<{ guid: string }>(token).guid : borrowerId;

//     // 1. Prepare payload with NEW FIELDS
//     const payload = {
//       UserId: decodedUserId,
//       EmploymentStatus: data.employmentStatus,
//       EmployerName: data.employerName || "",
//       YearsAtEmployer: data.yearsAtEmployer ? Number(data.yearsAtEmployer) : 0,
//       MonthlyIncome: data.monthlyIncome ? Number(data.monthlyIncome) : 0,
//       // New Fields added here
//       CompensationType: data.compensationType || "",
//       EmployerAddress: data.employerAddress || "",
//       EmployerCity: data.employerCity || "",
//       EmployerState: data.employerState || "",
//       EmployerZipCode: data.employerZipCode || "",
//     };

//     // 2. Joi Validation
//     const { error } = employmentInfoSchema.validate(payload, { abortEarly: true });
//     if (error) {
//       setApiError(error.details[0].message);
//       return;
//     }

//     // 3. Updated Change Detection (Includes new fields)
//     const hasChanges = Object.keys(payload).some((key) => {
//       if (key === "UserId") return false;
//       const dataKeyMap: { [key: string]: string } = {
//         EmploymentStatus: "employmentStatus",
//         EmployerName: "employerName",
//         YearsAtEmployer: "yearsAtEmployer",
//         MonthlyIncome: "monthlyIncome",
//         CompensationType: "compensationType",
//         EmployerAddress: "employerAddress",
//         EmployerCity: "employerCity",
//         EmployerState: "employerState",
//         EmployerZipCode: "employerZipCode",
//       };
//       const dataKey = dataKeyMap[key];
//       return String(payload[key as keyof typeof payload] || "") !== String(defaultValues[dataKey] || "");
//     });

//     if (data.Id && !hasChanges) {
//       onNext(data);
//       return;
//     }

//     setLoading(true);
//     const result = await submitEmploymentInfo(payload);
//     setLoading(false);

//     if (!result.success) {
//       setApiError(result.message || "Employment submission failed");
//       return;
//     }

//     console.log("Employment submission successful for id:", result.response);

//     const responseData = result.response?.data;
//     const empId = responseData?.successRecords?.[0]?.id || result.response?.id || responseData?.id;

//     if (!empId) {
//       console.error("No ID found in response", result.response);
//       setApiError("Server returned a success but no record ID was found.");
//       return;
//     }

//     localStorage.setItem("employmentId", empId);

//     onNext({
//       ...data,
//       ...payload,
//       employmentCompleted: true,
//       employmentId: empId,
//       Id: result.response?.Id
//     });
//   };

//   return (
//     <>
//       <h2 className="text-xl font-semibold mb-4">Employment Information</h2>

//       {apiError && (
//         <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
//           {apiError}
//         </div>
//       )}

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <Select
//           label="Employment Status*"
//           name="employmentStatus"
//           options={["Salaried", "Self-Employed", "Unemployed"]}
//           value={data.employmentStatus || ""}
//           onChange={handleChange}
//         />

//         <Input
//           label="Employer Name"
//           name="employerName"
//           value={data.employerName || ""}
//           onChange={handleChange}
//           disabled={data.employmentStatus === "Unemployed"}
//         />

//         <Select
//           label="Compensation Type*"
//           name="compensationType"
//           options={["Salary", "Hourly"]}
//           value={data.compensationType || ""}
//           onChange={handleChange}
//           disabled={data.employmentStatus === "Unemployed"}
//         />

//         <Input
//           label="Monthly Gross Income*"
//           name="monthlyIncome"
//           type="number"
//           value={data.monthlyIncome || ""}
//           onChange={handleChange}
//           disabled={data.employmentStatus === "Unemployed"}
//         />

//         <Input
//           label="Years at this Employer*"
//           name="yearsAtEmployer"
//           type="number"
//           value={data.yearsAtEmployer || ""}
//           onChange={handleChange}
//           disabled={data.employmentStatus === "Unemployed"}
//         />

//         <Input
//           label="Employer Address"
//           name="employerAddress"
//           value={data.employerAddress || ""}
//           onChange={handleChange}
//           disabled={data.employmentStatus === "Unemployed"}
//         />

//         <Input
//           label="Employer City"
//           name="employerCity"
//           value={data.employerCity || ""}
//           onChange={handleChange}
//           disabled={data.employmentStatus === "Unemployed"}
//         />

//         <div className="grid grid-cols-2 gap-2">
//           <Input
//             label="State"
//             name="employerState"
//             value={data.employerState || ""}
//             onChange={handleChange}
//             disabled={data.employmentStatus === "Unemployed"}
//           />
//           <Input
//             label="Zip Code"
//             name="employerZipCode"
//             type="tel"
//             value={data.employerZipCode || ""}
//             onChange={handleChange}
//             disabled={data.employmentStatus === "Unemployed"}
//           />
//         </div>
//       </div>

//       <div className="flex justify-between mt-6">
//         <Button variant="secondary" onClick={onBack} disabled={loading}>
//           Back
//         </Button>
//         <Button onClick={handleNext} loading={loading}>
//           Next
//         </Button>
//       </div>
//     </>
//   );
// }