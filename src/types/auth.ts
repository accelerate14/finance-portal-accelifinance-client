export type UserRole = "borrower" | "officer" | null;

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  token: string | null;
}
