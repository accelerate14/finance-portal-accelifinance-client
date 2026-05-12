import { useQuery } from '@tanstack/react-query';
import { getLoanById } from '../api/borrower/get';

interface LoanData {
  CaseId?: string;
  [key: string]: unknown;
}

export function useLoanPolling(loanId: string | undefined, enabled = true) {
  return useQuery<LoanData | null>({
    queryKey: ['loan', loanId],
    queryFn: async () => {
      if (!loanId) return null;
      const result = await getLoanById(loanId);
      if (result.success) {
        return result.response?.data ?? null;
      }
      throw new Error(result.message);
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.CaseId) {
        return 3000;
      }
      return false;
    },
    enabled: !!loanId && enabled,
    staleTime: 0,
    gcTime: 60000,
  });
}