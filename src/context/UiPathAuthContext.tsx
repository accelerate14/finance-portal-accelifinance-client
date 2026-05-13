import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
} from 'react';

import {
  UiPath,
  UiPathError,
} from '@uipath/uipath-typescript/core';

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
  refreshAdminStatus: () => Promise<{
    role: string | null;
    isAdmin: boolean;
  } | null>;
}

const UiPathAuthContext =
  createContext<UiPathAuthContextType | undefined>(undefined);

export const UiPathAuthProvider: React.FC<{
  children: React.ReactNode;
  config: UiPathSDKConfig;
}> = ({ children, config }) => {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedRole, setLenderRole] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] =
    useState<'admin' | 'lender'>('lender');

  const [hasLoggedOut, setHasLoggedOut] = useState(() => {
    return (
      sessionStorage.getItem('lender_has_logged_out') === 'true'
    );
  });

  const sdkRef = useRef<UiPath | null>(null);
  const oauthCallbackHandledRef = useRef(false);

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
      sessionStorage.setItem(
        'lender_has_logged_out',
        'true'
      );
    } else {
      sessionStorage.removeItem(
        'lender_has_logged_out'
      );
    }

    setHasLoggedOut(flag);
  };

  const getAuthErrorMessage = (
    err: unknown,
    fallback: string
  ) => {
    return err instanceof UiPathError ||
      err instanceof Error
      ? err.message
      : fallback;
  };

  const mapLenderRole = (
    role: unknown
  ): 'Loan Officer' | 'Underwriter' | 'Admin' | null => {

    const normalizedRole =
      String(role ?? '')
        .trim()
        .toLowerCase();

    if (normalizedRole === 'loan officer') {
      return 'Loan Officer';
    }

    if (normalizedRole === 'underwriter') {
      return 'Underwriter';
    }

    if (normalizedRole === 'admin') {
      return 'Admin';
    }

    return null;
  };

  const fetchLenderRole = async (
    sdk: UiPath
  ): Promise<boolean> => {

    const tokenKey =
      `uipath_sdk_user_token-${config.clientId}`;

    const lenderProfileEntityId =
      import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;

    try {

      const lenderToken =
        sessionStorage.getItem(tokenKey);

      if (!lenderToken) {
        resetAuthState();
        setError('Missing lender session token');
        return false;
      }

      let decodedToken: any;

      try {
        decodedToken = jwtDecode<any>(lenderToken);
      } catch (tokenErr) {
        console.log('Token decode failed', tokenErr);

        resetAuthState();
        setError('Invalid lender session token');

        return false;
      }

      // TOKEN EXPIRY CHECK
      if (decodedToken.exp) {

        const now =
          Math.floor(Date.now() / 1000);

        if (decodedToken.exp < now) {

          resetAuthState();

          setError(
            'Lender session has expired'
          );

          return false;
        }
      }

      const userEmail =
        decodedToken?.email ||
        decodedToken?.upn ||
        decodedToken?.name;

      setUser(userEmail || null);

      if (!lenderProfileEntityId) {

        resetAuthState();

        setError(
          'Lender profile entity is not configured'
        );

        return false;
      }

      const entitiesService = new Entities(sdk);

      const entityInstance =
        await entitiesService.getById(
          lenderProfileEntityId
        );

      const lenderRes =
        await entityInstance.getAllRecords();

      const lenderRecord =
        (lenderRes.items as any[]).find(
          (record: any) => {

            const recordEmail =
              String(
                record.email ||
                record.Email ||
                ''
              )
                .toLowerCase()
                .trim();

            const currentUserEmail =
              String(userEmail || '')
                .toLowerCase()
                .trim();

            return (
              recordEmail !== '' &&
              recordEmail === currentUserEmail
            );
          }
        );

      if (!lenderRecord) {

        resetAuthState();

        setError(
          'User profile not found in lender entity'
        );

        return false;
      }

      const isActive =
        lenderRecord.isActive ??
        lenderRecord.IsActive ??
        true;

      if (!isActive) {

        resetAuthState();

        setError(
          'Your account has been disabled.'
        );

        setTimeout(() => {
          window.location.reload();
        }, 2000);

        return false;
      }

      const resolvedRole =
        mapLenderRole(
          lenderRecord.role ||
          lenderRecord.Role
        );

      if (!resolvedRole) {

        resetAuthState();

        setError(
          'User role is not authorized'
        );

        return false;
      }

      setLenderRole(resolvedRole);

      const userIsAdmin =
        lenderRecord.IsAdmin ??
        lenderRecord.isAdmin ??
        false;

      setIsAdmin(userIsAdmin);

      setIsAuthenticated(true);

      return true;

    } catch (err) {

      console.error(
        'Failed to fetch lender role:',
        err
      );

      resetAuthState();

      setError(
        getAuthErrorMessage(
          err,
          'Failed to fetch lender role'
        )
      );

      return false;
    }
  };

  // OAuth callback + session restore
  useEffect(() => {

    if (hasLoggedOut) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const sdk = getSdk();

    const initializeAuth = async () => {

      try {

        setIsLoading(true);

        const tokenKey =
          `uipath_sdk_user_token-${config.clientId}`;

        const existingToken =
          sessionStorage.getItem(tokenKey);

        // OAUTH CALLBACK
        if (
          sdk.isInOAuthCallback() &&
          !oauthCallbackHandledRef.current
        ) {

          oauthCallbackHandledRef.current = true;

          console.log(
            'OAuth callback detected'
          );

          // IMPORTANT
          await sdk.initialize();

          await sdk.completeOAuth();

          if (
            mounted &&
            sdk.isAuthenticated()
          ) {
            await fetchLenderRole(sdk);
          }
        }

        // SESSION RESTORE
        else if (existingToken) {

          try {

            const decoded =
              jwtDecode<any>(existingToken);

            const now =
              Math.floor(Date.now() / 1000);

            if (
              decoded.exp &&
              decoded.exp > now
            ) {

              console.log(
                'Restoring existing session'
              );

              await sdk.initialize();

              if (
                mounted &&
                sdk.isAuthenticated()
              ) {
                await fetchLenderRole(sdk);
              }

            } else {

              console.log(
                'Stored token expired'
              );

              resetAuthState();
            }

          } catch (tokenErr) {

            console.log(
              'Stored token invalid',
              tokenErr
            );

            resetAuthState();
          }

        } else {

          resetAuthState();
        }

      } catch (err) {

        console.error(
          'Authentication init failed:',
          err
        );

        if (mounted) {

          resetAuthState();

          setError(
            getAuthErrorMessage(
              err,
              'Authentication failed'
            )
          );
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

  const login = async (
    role?: string
  ) => {

    const sdk = getSdk();

    setError(null);

    setIsLoading(true);

    try {

      setLoggedOutFlag(false);

      if (role) {
        sessionStorage.setItem(
          'intended_role',
          role
        );
      }

      console.log(
        'Initializing SDK on login click'
      );

      await sdk.initialize();

    } catch (err) {

      console.error('Login failed:', err);

      setError(
        getAuthErrorMessage(
          err,
          'Login failed'
        )
      );

      setIsLoading(false);
    }
  };

  const logout = () => {

    const sdk = getSdk();

    sdk.logout();

    resetAuthState();

    setError(null);

    setLoggedOutFlag(true);

    oauthCallbackHandledRef.current = false;

    sdkRef.current = new UiPath(config);

    window.location.href = '/';
  };

  const switchToAdmin = () => {
    setViewMode('admin');
  };

  const switchToLender = () => {
    setViewMode('lender');
  };

  const refreshAdminStatus = async () => {

    if (!isAuthenticated) {
      return null;
    }

    const sdk = getSdk();

    const tokenKey =
      `uipath_sdk_user_token-${config.clientId}`;

    const lenderProfileEntityId =
      import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;

    try {

      const lenderToken =
        sessionStorage.getItem(tokenKey);

      if (
        !lenderToken ||
        !lenderProfileEntityId
      ) {
        return null;
      }

      const decodedToken =
        jwtDecode<any>(lenderToken);

      const userEmail =
        decodedToken?.email ||
        decodedToken?.name;

      const entitiesService =
        new Entities(sdk);

      const entityInstance =
        await entitiesService.getById(
          lenderProfileEntityId
        );

      const lenderRes =
        await entityInstance.getAllRecords();

      const lenderRecord =
        (lenderRes.items as any[]).find(
          (record: any) => {

            const recordEmail =
              String(
                record.email ||
                record.Email ||
                ''
              )
                .toLowerCase()
                .trim();

            const currentUserEmail =
              String(userEmail || '')
                .toLowerCase()
                .trim();

            return (
              recordEmail !== '' &&
              recordEmail === currentUserEmail
            );
          }
        );

      if (lenderRecord) {

        const isActive =
          lenderRecord.isActive ??
          lenderRecord.IsActive ??
          true;

        if (!isActive) {

          logout();

          return null;
        }

        const resolvedRole =
          mapLenderRole(
            lenderRecord.role ||
            lenderRecord.Role
          );

        if (resolvedRole) {
          setLenderRole(resolvedRole);
        }

        const userIsAdmin =
          lenderRecord.IsAdmin ??
          lenderRecord.isAdmin ??
          false;

        setIsAdmin(userIsAdmin);

        if (
          !userIsAdmin &&
          viewMode === 'admin'
        ) {
          setViewMode('lender');
        }

        return {
          role: resolvedRole,
          isAdmin: userIsAdmin,
        };
      }

    } catch (err) {

      console.error(
        '[refreshAdminStatus] Failed:',
        err
      );
    }

    return null;
  };

  return (
    <UiPathAuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </UiPathAuthContext.Provider>
  );
};

export const useUiPathAuth = () => {

  const ctx =
    useContext(UiPathAuthContext);

  if (!ctx) {
    throw new Error(
      'useUiPathAuth must be used inside UiPathAuthProvider'
    );
  }

  return ctx;
};