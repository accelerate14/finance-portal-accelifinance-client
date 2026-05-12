import axios from "axios";

const baseUrl =
  import.meta.env.VITE_API_BASE_URL;

interface ApiSuccess<T = any> {
  success: true;
  response: T;
}

interface ApiError {
  success: false;
  message: string;
}

type ApiResult<T = any> = ApiSuccess<T> | ApiError;

/* ================= PROFILE ================= */

export const getBorrowerProfile = async (
  borrowerId: string
): Promise<ApiResult> => {
  try {
    console.log("Fetching profile for borrowerId:", borrowerId);
    const res = await axios.get(
      `${baseUrl}/api/borrower/profile/${borrowerId}`
    );
    console.log("Profile data:", res.data);
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Failed to fetch profile" };
  }
};

/* ================= EMPLOYMENT ================= */

export const getEmploymentInfo = async (
  borrowerId: string
): Promise<ApiResult> => {
  try {
    console.log("Fetching employment info for borrowerId:", borrowerId);
    const res = await axios.get(
      `${baseUrl}/api/borrower/employment/${borrowerId}`
    );
    console.log("Employment info data:", res.data);
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Failed to fetch employment info" };
  }
};

/* ================= LOAN ================= */

export const getLoanApplication = async (
  borrowerId: string
): Promise<ApiResult> => {
  try {
    console.log("Fetching loan application for borrowerId:", borrowerId);
    const res = await axios.get(
      `${baseUrl}/api/borrower/loans/${borrowerId}`
    );
    console.log("Loan application data:", res.data);
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Failed to fetch loan application" };
  }
};


export const getLoanById = async (
  loanId: string
): Promise<ApiResult> => {
  try {
    console.log("Fetching loan application for loanId:", loanId);
    const res = await axios.get(
      `${baseUrl}/api/borrower/loan/${loanId}`
    );
    console.log("Loan application data:", res.data);
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Failed to fetch loan application" };
  }
};

/* ================= PROGRESS (RESUME WIZARD) ================= */

export const getBorrowerProgress = async (
  borrowerId: string
): Promise<ApiResult> => {
  try {
    console.log("Fetching progress for borrowerId: ", borrowerId);
    const res = await axios.get(
      `${baseUrl}/api/borrower/progress/${borrowerId}`
    );
    console.log("Progress API response: ", res.data);
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Failed to fetch progress" };
  }
};

/* ================= DOCUMENTS ================= */

export const getBorrowerDocuments = async (CaseId: string): Promise<ApiResult> => {
  try {
    const res = await axios.get(`${baseUrl}/api/borrower/documents/${CaseId}`);

    // Transform relative URLs to absolute ones
    const docs = res.data.data;
    console.log("Raw documents data:", docs);
    
    Object.keys(docs).forEach(key => {
      if (docs[key]) docs[key] = `${baseUrl}${docs[key]}`;
    });
    console.log("Fetched borrower documents:", docs);

    return { success: true, response: { data: docs } };
  } catch (err) {
    return { success: false, message: "Failed to fetch docs" };
  }
};

/* ================= BORROWER STAGE ================= */

export const getBorrowerStage = async (
  borrowerId: string
): Promise<ApiResult> => {
  try {
    console.log("Fetching stage for borrowerId: ", borrowerId);
    const res = await axios.get(
      `${baseUrl}/api/borrower/stages/${borrowerId}`
    );
    console.log("Stage API response: ", res.data);
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Failed to fetch stage" };
  }
};

export const getAllLoansLender = async (): Promise<ApiResult> => {
  try {
    console.log("Fetching all loans for lender");
    const res = await axios.get(
      `${baseUrl}/api/lender/loans`
    );
    console.log("All loans data:", res.data);
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Failed to fetch loans" };
  }
};

export const getLenderRoleByEmail = async (
  email: string
): Promise<ApiResult> => {
  try {
    console.log("Fetching role for lender email:", email);
    const res = await axios.get(
      `${baseUrl}/api/lender/role/${email}`
    );
    console.log("Lender role data:", res.data);
    return { success: true, response: res.data };
  }
  catch (err) {
    return { success: false, message: "Failed to fetch lender role" };
  }
};
