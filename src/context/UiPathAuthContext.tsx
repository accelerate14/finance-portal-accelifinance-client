import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';
import { jwtDecode } from 'jwt-decode';
import { Entities } from '@uipath/uipath-typescript/entities';
 
 interface UiPathAuthContextType {
   isAuthenticated: boolean;
   isLoading: boolean;
   sdk: UiPath;
   login: (role?: string) => Promise<void>;
   logout: () => void;
   user: string | null;
   error: string | null;
   roleLender: string | null;
   isAdmin: boolean;
   switchToAdmin: () => void;
   switchToLender: () => void;
   refreshAdminStatus: () => Promise<void>;
 }
 
const UiPathAuthContext = createContext<UiPathAuthContextType | undefined>(undefined);
 
export const UiPathAuthProvider: React.FC<{ children: React.ReactNode; config: UiPathSDKConfig }> = ({ children, config }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedRole, setLenderRole] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'lender'>('lender');
  // Use sessionStorage to persist logout state across page reloads
  const [hasLoggedOut, setHasLoggedOut] = useState(() => {
    return sessionStorage.getItem('lender_has_logged_out') === 'true';
  });
  const sdkRef = useRef<UiPath | null>(null);
  
  const getSdk = () => {
    if (!sdkRef.current) {
      sdkRef.current = new UiPath(config);
    }
    return sdkRef.current;
  };

  const resetAuthState = () => {
    setIsAuthenticated(false);
    setLenderRole(null);
    setUser(null);
    setIsAdmin(false);
    setViewMode('lender');
  };

  const setLoggedOutFlag = (flag: boolean) => {
    if (flag) {
      sessionStorage.setItem('lender_has_logged_out', 'true');
    } else {
      sessionStorage.removeItem('lender_has_logged_out');
    }
    setHasLoggedOut(flag);
  };

  const getAuthErrorMessage = (err: unknown, fallback: string) => {
    return err instanceof UiPathError || err instanceof Error ? err.message : fallback;
  };

  const mapLenderRole = (role: unknown): "Loan Officer" | "Underwriter" | "Admin" | null => {
    const normalizedRole = String(role ?? "").trim().toLowerCase();

    if (normalizedRole === "loan officer") return "Loan Officer";
    if (normalizedRole === "underwriter") return "Underwriter";
    if (normalizedRole === "admin") return "Admin";

    return null;
  };

  // Fetch lender role and set authenticated state (called after SDK is initialized)
  const fetchLenderRole = async (sdk: UiPath): Promise<boolean> => {
    const tokenKey = `uipath_sdk_user_token-${config.clientId}`;
      const lenderProfileEntityId =
        import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;

    try {
      console.log('SDK is authenticated, fetching token...');
      const lenderToken = sessionStorage.getItem(tokenKey);
      if (!lenderToken) {
        console.log('No lender token found in session storage');
        resetAuthState();
        setError('Missing lender session token');
        return false;
      }

      const decodedToken = jwtDecode<any>(lenderToken);
      const userEmail = decodedToken?.email || decodedToken?.name;
      console.log('User email from token:', userEmail);
      setUser(decodedToken?.name || null);

      if (!lenderProfileEntityId) {
        resetAuthState();
        setError('Lender profile entity is not configured');
        return false;
      }

      console.log('Fetching lender profile from entity:', lenderProfileEntityId);
      const entitiesService = new Entities(sdk);
      const entityInstance = await entitiesService.getById(lenderProfileEntityId);
      const lenderRes = await entityInstance.getAllRecords();
      console.log('Lender records found:', lenderRes.items?.length);

      const lenderRecord = (lenderRes.items as any[]).find((record: any) => {
        const recordEmail = String(record.email || record.Email || '').toLowerCase().trim();
        const currentUserEmail = String(userEmail || '').toLowerCase().trim();

        return recordEmail !== '' && recordEmail === currentUserEmail;
      });

      if (!lenderRecord) {
        resetAuthState();
        setError('User profile not found in lender entity');
        return false;
      }

      // Check if user is disabled
      const isActive = lenderRecord.isActive ?? lenderRecord.IsActive ?? true;
      if (!isActive) {
        resetAuthState();
        setError('Your account has been disabled. Please contact an administrator.');
        // Refresh the page after a short delay to clear any stale state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return false;
      }

      console.log('Lender record found, role:', lenderRecord.role || lenderRecord.Role);
      const resolvedRole = mapLenderRole(lenderRecord.role || lenderRecord.Role);
      if (!resolvedRole) {
        resetAuthState();
        setError('User role is not authorized for lender login');
        return false;
      }

      console.log('Setting authenticated with role:', resolvedRole);
      setLenderRole(resolvedRole);
      
      // Check if user is admin
      const userIsAdmin = lenderRecord.IsAdmin ?? lenderRecord.isAdmin ?? false;
      setIsAdmin(userIsAdmin);
      console.log('User isAdmin:', userIsAdmin);
      
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Failed to fetch lender role:', err);
      resetAuthState();
      setError(getAuthErrorMessage(err, 'Failed to fetch lender role'));
      return false;
    }
  };

  // Initialize SDK and handle OAuth callback on mount
  useEffect(() => {
    // Skip initialization if user has explicitly logged out
    if (hasLoggedOut) {
      console.log('User has logged out, skipping re-authentication');
      setIsLoading(false);
      return;
    }

    const sdk = getSdk();
    let mounted = true;
    let oauthCompleted = false;

    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Handle OAuth callback if present (only once)
        if (sdk.isInOAuthCallback() && !oauthCompleted) {
          console.log('OAuth callback detected, completing OAuth...');
          oauthCompleted = true;
          await sdk.completeOAuth();
          console.log('OAuth completed successfully');
        }

        // Initialize the SDK
        await sdk.initialize();
        console.log('SDK initialized, checking authentication...');
        console.log('sdk.isAuthenticated() result:', sdk.isAuthenticated());

        // Check authentication status
        if (sdk.isAuthenticated()) {
          if (mounted) {
            await fetchLenderRole(sdk);
          }
        } else {
          if (mounted) {
            console.log('SDK not authenticated');
            resetAuthState();
          }
        }
      } catch (err) {
        // Only log error if it's not the typical OAuth double-invocation issue
        const errorMsg = getAuthErrorMessage(err, 'Authentication failed');
        if (!errorMsg.includes('invalid_grant') || !oauthCompleted) {
          console.error('Authentication initialization failed:', err);
        }
        if (mounted) {
          resetAuthState();
          setError(getAuthErrorMessage(err, 'Authentication failed'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [config.clientId, hasLoggedOut]);
 
  const login = async (role?: string) => {
    const sdk = getSdk();
    setError(null);
    setIsLoading(true);

    try {
      // Clear the logout flag when user tries to log in again
      setLoggedOutFlag(false);

      if (role) {
        sessionStorage.setItem('intended_role', role);
      }

      // Initialize the SDK which will trigger OAuth if not authenticated
      await sdk.initialize();
      
      // After initialize, the SDK will handle the OAuth redirect
      // When the callback returns, the useEffect will re-run and handle the callback
    } catch (err) {
      console.error('Login failed:', err);
      setError(getAuthErrorMessage(err, 'Login failed'));
      setIsLoading(false);
    }
  };
 
  const logout = () => {
    console.log('=== LOGOUT INITIATED ===');
    const sdk = getSdk();
    console.log('Calling sdk.logout()...');
    sdk.logout();
    console.log('Resetting auth state...');
    resetAuthState();
    setError(null);
    console.log('Setting hasLoggedOut flag to true (persisted in sessionStorage)...');
    setLoggedOutFlag(true);
    console.log('Creating new SDK instance...');
    sdkRef.current = new UiPath(config);
    console.log('Redirecting to home page...');
    window.location.href = '/';
  };

  const switchToAdmin = () => {
    setViewMode('admin');
  };

  const switchToLender = () => {
    setViewMode('lender');
  };

  // Re-fetch lender record to get latest admin status
  const refreshAdminStatus = async () => {
    if (!isAuthenticated) return;
    const sdk = getSdk();
    const tokenKey = `uipath_sdk_user_token-${config.clientId}`;
    const lenderProfileEntityId = import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;

    try {
      const lenderToken = sessionStorage.getItem(tokenKey);
      if (!lenderToken || !lenderProfileEntityId) return;

      const decodedToken = jwtDecode<any>(lenderToken);
      const userEmail = decodedToken?.email || decodedToken?.name;

      const entitiesService = new Entities(sdk);
      const entityInstance = await entitiesService.getById(lenderProfileEntityId);
      const lenderRes = await entityInstance.getAllRecords();

      const lenderRecord = (lenderRes.items as any[]).find((record: any) => {
        const recordEmail = String(record.email || record.Email || '').toLowerCase().trim();
        const currentUserEmail = String(userEmail || '').toLowerCase().trim();
        return recordEmail !== '' && recordEmail === currentUserEmail;
      });

      if (lenderRecord) {
        // Check if user is disabled
        const isActive = lenderRecord.isActive ?? lenderRecord.IsActive ?? true;
        if (!isActive) {
          console.log('[refreshAdminStatus] User is disabled, logging out');
          logout();
          return;
        }

        const userIsAdmin = lenderRecord.IsAdmin ?? lenderRecord.isAdmin ?? false;
        setIsAdmin(userIsAdmin);
        console.log('[refreshAdminStatus] Updated isAdmin:', userIsAdmin);
        
        // If admin was disabled, switch to lender view
        if (!userIsAdmin && viewMode === 'admin') {
          setViewMode('lender');
        }
      }
    } catch (err) {
      console.error('[refreshAdminStatus] Failed to refresh admin status:', err);
    }
  };
 
  return (
    <UiPathAuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      sdk: getSdk(),
      login,
      logout,
      user,
      error,
      roleLender: fetchedRole,
      isAdmin,
      switchToAdmin,
      switchToLender,
      refreshAdminStatus,
    }}>
      {children}
    </UiPathAuthContext.Provider>
  );
};
 
export const useUiPathAuth = () => {
  const ctx = useContext(UiPathAuthContext);
  if (!ctx) throw new Error("useUiPathAuth must be used inside UiPathAuthProvider");
  return ctx;
};