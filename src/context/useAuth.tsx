import React, { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { jwtDecode } from "jwt-decode";

type Role = "borrower" | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string;
  borrowerId: string;
  isLoading: boolean;
  role: Role;
  handleBorrowerId: (id: string) => void;
  borrowerLogin: (token: string) => void;
  borrowerLogout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [borrowerId, setBorrowerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<Role>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = () => {
      try {
        const borrowerToken = localStorage.getItem("borrower_token");
        if (borrowerToken) {
          const decoded = jwtDecode<{ guid: string }>(borrowerToken);
          setIsAuthenticated(true);
          setRole("borrower");
          setUserId(decoded.guid);
          setBorrowerId(decoded.guid || "");
        }
      } catch (err) {
        console.error("Borrower session restore failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, [borrowerId]);

  const borrowerLogin = (token: string) => {
    localStorage.setItem("borrower_token", token);
    const decoded = jwtDecode<{ guid: string }>(token);
    localStorage.setItem('borrowerId', decoded.guid.toString());
    console.log("Borrower logged in with ID:", decoded.guid);
    setUserId(decoded.guid.toString());
    setIsAuthenticated(true);
    setRole("borrower");
  };

  const borrowerLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setRole(null);
    setUserId("");
    setBorrowerId("");
  };

  const handleBorrowerId = (id: string) => {
    setBorrowerId(id);
    localStorage.setItem('borrowerId', id.toString());
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        borrowerId,
        isLoading,
        role,
        borrowerLogin,
        borrowerLogout,
        handleBorrowerId,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};