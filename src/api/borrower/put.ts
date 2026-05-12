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

export const updateBorrrowerStages = async (
  borrowerId: string,
  stage: Number
): Promise<ApiResult> => {
  try {
    const res = await axios.put(
      `${baseUrl}/api/borrower/stages/update-stage/${borrowerId}`,
      { stage }
    );
    return { success: true, response: res.data };
  } catch {
    return { success: false, message: "Stage update failed" };
  }
};

export const updateLoanStatus = async (
  loanId: string,
  status: string
): Promise<ApiResult> => {
  try {
    const res = await axios.put(
      `${baseUrl}/api/lender/loan/update-status/${loanId}`,
      { status }
    );
    return { success: true, response: res.data };
  } catch (error) {
    return { success: false, message: "Loan status update failed" };
  }
}