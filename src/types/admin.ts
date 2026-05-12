/**
 * Admin Panel Types
 */

export type LenderRole = 'Loan Officer' | 'Underwriter' | 'Admin';

export interface LenderUser {
  id: string;
  email: string;
  role: LenderRole;
  isActive: boolean;
  isAdmin: boolean;
}

export interface BorrowerUser {
  id: string; // Entity Guid for API operations
  userId: string; // Display userId
  emailAddress: string;
  isActive: boolean;
  name?: string;
}

export type UserTab = 'lenders' | 'borrowers';

export interface AuditLogFilter {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  userRole?: string;
  action?: string;
  entityType?: string;
  severity?: string;
  search?: string;
}