import axios from "axios";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

interface ApiSuccess<T = any> {
  success: true;
  response: T;
}

interface ApiError {
  success: false;
  message: string;
}

type ApiResult<T = any> = ApiSuccess<T> | ApiError;

/* ================= AUTH ================= */

export const registerBorrower = async (
  email: string,
  password: string
): Promise<ApiResult> => {
  try {
    const res = await axios.post(`${baseUrl}/api/borrower/register`, {
      email,
      password,
    });
    return { success: true, response: res.data };
  } catch (error: any) {
    // 1. Check if the server sent a specific error response
    if (error.response && error.response.data) {
      return {
        success: false,
        message: error.response.data.message || "Registration failed"
      };
    }

    // 2. Fallback for network errors (server down, no internet)
    return {
      success: false,
      message: "Network error. Please try again later."
    };
  }
};

export const loginBorrower = async (
  email: string,
  password: string
): Promise<ApiResult> => {
  try {
    const res = await axios.post(`${baseUrl}/api/borrower/login`, {
      email,
      password,
    });
    return { success: true, response: res.data };
  } catch (error: any) {
    // 1. Check if the server sent a specific error response
    if (error.response && error.response.data) {
      return {
        success: false,
        message: error.response.data.message || "Registration failed"
      };
    }

    // 2. Fallback for network errors (server down, no internet)
    return {
      success: false,
      message: "Network error. Please try again later."
    };
  }
};

/* ================= PROFILE (STEP 1) ================= */

export const submitBorrowerProfile = async (
  payload: {
    FirstName: string;
    LastName: string;
    DateOfBirth: string;
    SSN: string;
    Address: string;
    City: string;
    State: string;
    ZipCode: string;
    Email: string;
    Unit: string;
    PhoneNumber: string;
    profileCompleted: boolean;
    UserId: string;
  }
): Promise<ApiResult> => {
  try {
    const res = await axios.post(
      `${baseUrl}/api/borrower/profile/submit`,
      payload
    );
    console.log("API RESPONSE for submitborrowerprofile:", res.data);
    return { success: true, response: res.data.data };
  } catch {
    console.log("API ERROR for submitborrowerprofile");
    return { success: false, message: "Profile submission failed" };
  }
};

/* ================= EMPLOYMENT (STEP 2) ================= */

export const submitEmploymentInfo = async (
  payload: {
    UserId: string;
    EmploymentStatus: string;
    EmployerName?: string;
    YearsAtEmployer: number;
    MonthlyIncome: number;
    CompensationType: string;
    EmployerAddress: string;
    EmployerCity: string;
    EmployerState: string;
    EmployerZipCode: string;
  }
): Promise<ApiResult> => {
  try {
    const res = await axios.post(
      `${baseUrl}/api/borrower/employment/submit`,
      payload
    );
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Employment submission failed" };
  }
};

/* ================= LOAN APPLICATION (STEP 3) ================= */

export const getLoanApplicationById = async (
  loanApplicationId: string
): Promise<ApiResult> => {
  try {
    const res = await axios.get(
      `${baseUrl}/api/borrower/loan/${loanApplicationId}`
    );
    return { success: true, response: res.data };
  } catch (error: any) {
    return { 
      success: false, 
      message: error.response?.data?.message || "Failed to fetch loan application" 
    };
  }
};

export const submitLoanApplication = async (
  payload: {
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
  }
): Promise<ApiResult> => {
  try {
    const res = await axios.post(
      `${baseUrl}/api/borrower/loan/submit`,
      payload
    );
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Loan submission failed" };
  }
};

export const uploadBorrowerDocuments = async (
  UserId: string,
  CaseNumber: string | null,
  DriversLicense?: File,
  PayStub?: File
) => {
  const formData = new FormData();
  formData.append("UserId", UserId);
  formData.append("CaseNumber", CaseNumber || "");

  if (DriversLicense) {
    formData.append("DriversLicense", DriversLicense);
  }

  if (PayStub) {
    formData.append("PayStub", PayStub);
  }

  // IMPORTANT: Remove the headers object entirely. 
  // Axios will see FormData and set the boundary automatically.
  return axios.post(
    `${baseUrl}/api/borrower/documents/upload`,
    formData
  );
};


export const uploadLoanAgreement = async (
    CaseNumber: string,
    LoanAgreement: File
) => {
    const formData = new FormData();
    formData.append("CaseNumber", CaseNumber);
    formData.append("LoanAgreement", LoanAgreement);

    return axios.post(
        `${baseUrl}/api/borrower/documents/upload-agreement`,
        formData
    );
};


/* ================= STAGE MANAGEMENT (STEP 5) ================= */
export const createBorrowerStages = async (
  payload: {
    borrowerId: string;
    stage: Number;
    comments: string;
    isDocumentUploaded: boolean;
  }
): Promise<ApiResult> => {
  try {
    const res = await axios.post(
      `${baseUrl}/api/borrower/stages/create-stage`,
      payload
    );
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Stage creation failed" };
  }
};