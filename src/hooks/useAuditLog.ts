/**
 * useAuditLog - React Hook for Audit Logging
 * 
 * This hook provides an easy way to log lender-side actions.
 * It automatically extracts user context from UiPathAuthContext
 * and uses fire-and-forget pattern to never block the main flow.
 * 
 * Usage:
 *   const { logAudit } = useAuditLog();
 *   logAudit({ action: 'StatusChanged', entityType: 'Loan', ... });
 */

import { useCallback } from 'react';
import { useUiPathAuth } from '../context/UiPathAuthContext';
import { fireAuditLog } from '../services/auditService';
import type { AuditLogInput } from '../types/audit';

interface UseAuditLogReturn {
  /**
   * Log an audit entry (fire-and-forget)
   * 
   * This function:
   * - Automatically fills UserId, UserRole from auth context
   * - Only logs for lender roles (Loan Officer, Underwriter, Admin)
   * - Never throws or blocks - errors are silently caught
   * 
   * @param input - Audit log input (action, entityType, entityId, caseId, description, etc.)
   */
  logAudit: (input: AuditLogInput) => void;
  
  /** Whether audit logging is available (user is authenticated) */
  isAuditAvailable: boolean;
}

export function useAuditLog(): UseAuditLogReturn {
  const { sdk, isAuthenticated, user, roleLender } = useUiPathAuth();

  const logAudit = useCallback(
    (input: AuditLogInput) => {
      // Fire-and-forget: don't await, don't catch
      fireAuditLog(sdk, user, roleLender, input).catch(() => {
        // Errors are already handled inside fireAuditLog
      });
    },
    [sdk, user, roleLender]
  );

  return {
    logAudit,
    isAuditAvailable: isAuthenticated && !!roleLender,
  };
}