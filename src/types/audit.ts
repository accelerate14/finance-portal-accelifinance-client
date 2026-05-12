/**
 * Audit Log Types for Lender-Side Actions
 * 
 * These types define the structure for audit log entries
 * that are stored in the UiPath Audit Log Entity.
 */

export type AuditSeverity = 'Info' | 'Warning' | 'Critical' | 'Low' | 'Medium' | 'High';

export type AuditUserRole = 'Loan Officer' | 'Underwriter' | 'Admin';

export type AuditEntityType = 
  | 'Loan' 
  | 'Document' 
  | 'Profile' 
  | 'Employment' 
  | 'Case' 
  | 'Task'
  | 'Agreement'
  | 'Note'
  | 'Evaluation'
  | 'User';

/**
 * Generic audit log action - captures any lender-side action
 */
export type AuditAction = string;

/**
 * Audit log entry structure matching the required schema
 */
export interface AuditLogEntry {
  /** Who performed the action */
  UserId: string;
  
  /** Role of the user (Loan Officer, Underwriter, Admin) */
  UserRole: AuditUserRole;
  
  /** What action was performed */
  Action: AuditAction;
  
  /** What type of entity was affected */
  EntityType: AuditEntityType;
  
  /** ID of the affected record */
  EntityId: string;
  
  /** Loan case reference for linking */
  CaseId: string;
  
  /** Previous state (for updates) - JSON string */
  OldValue?: string;
  
  /** New state (for updates) - JSON string */
  NewValue?: string;
  
  /** User's IP address */
  IpAddress: string;
  
  /** Browser/device info */
  UserAgent?: string;
  
  /** Human-readable description */
  Description: string;
  
  /** Importance level */
  Severity: AuditSeverity;
}

/**
 * Simplified input for the audit hook - auto-fills common fields
 */
export interface AuditLogInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  caseId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  description: string;
  severity?: AuditSeverity;
}