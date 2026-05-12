/**
 * Admin Service - User Management via UiPath Entities
 * 
 * This service handles all admin panel operations for managing
 * lender and borrower users through UiPath Entities.
 */

import { Entities } from '@uipath/uipath-typescript/entities';
import type { UiPath } from '@uipath/uipath-typescript/core';
import type { LenderUser, BorrowerUser } from '../types/admin';

/**
 * Get all lender users from UiPath Entities
 */
export async function getLenderUsers(sdk: UiPath): Promise<LenderUser[]> {
  try {
    const entity = import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;
    if (!entity) {
      console.error('[AdminService] Lender Profile Entity ID not configured');
      return [];
    }

    const entitiesService = new Entities(sdk);
    const entityInstance = await entitiesService.getById(entity);
    const result = await entityInstance.getAllRecords();

    if (!result.items || result.items.length === 0) {
      return [];
    }

    return (result.items as any[]).map((item: any) => ({
      id: item.Id || item.id || '',
      email: item.email || item.Email || '',
      role: item.role || item.Role || 'Loan Officer',
      isActive: item.isActive ?? item.IsActive ?? true,
      isAdmin: item.IsAdmin ?? item.isAdmin ?? false,
    }));
  } catch (error) {
    console.error('[AdminService] Failed to fetch lender users:', error);
    return [];
  }
}

/**
 * Update a lender user's role or status
 */
export async function updateLenderUser(
  sdk: UiPath,
  userId: string,
  updates: { role?: string; isActive?: boolean; isAdmin?: boolean }
): Promise<boolean> {
  try {
    const entity = import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;
    if (!entity) {
      console.error('[AdminService] Lender Profile Entity ID not configured');
      return false;
    }

    const entitiesService = new Entities(sdk);
    const entityInstance = await entitiesService.getById(entity);
    
    // Build update payload
    const payload: Record<string, any> = {};
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.isActive !== undefined) payload.isActive = updates.isActive;
    if (updates.isAdmin !== undefined) payload.IsAdmin = updates.isAdmin;

    console.log('[AdminService] Updating lender user:', userId, 'with payload:', payload);

    // Use entity instance's updateRecord method
    await entityInstance.updateRecord(userId, payload);
    return true;
  } catch (error) {
    console.error('[AdminService] Failed to update lender user:', error);
    return false;
  }
}

/**
 * Create a new lender user
 */
export async function createLenderUser(
  sdk: UiPath,
  user: { email: string; role: string; isAdmin?: boolean }
): Promise<boolean> {
  try {
    const entity = import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;
    if (!entity) {
      console.error('[AdminService] Lender Profile Entity ID not configured');
      return false;
    }

    const entitiesService = new Entities(sdk);

    // Use the entity's method to create a record (API may vary by SDK version)
    const recordData = {
      email: user.email,
      role: user.role,
      isActive: true,
      IsAdmin: user.isAdmin ?? false,
    };

    console.log('[AdminService] Creating lender user with data:', recordData);

    // Use insertRecordById from SDK
    const result = await entitiesService.insertRecordById(entity, recordData);
    console.log('[AdminService] insertRecordById result:', result);

    return true;
  } catch (error) {
    console.error('[AdminService] Failed to create lender user:', error);
    return false;
  }
}

/**
 * Get all borrower users from UiPath Entities
 */
export async function getBorrowerUsers(sdk: UiPath): Promise<BorrowerUser[]> {
  try {
    const borrowerEntity = import.meta.env.VITE_BORROWER_PROFILE_ENTITY_ID;
    const personalInfoEntity = import.meta.env.VITE_PERSONAL_INFO_ENTITY_ID;
    
    if (!borrowerEntity) {
      console.error('[AdminService] Borrower Profile Entity ID not configured');
      return [];
    }

    console.log('[AdminService] Fetching borrower users from entity:', borrowerEntity);
    const entitiesService = new Entities(sdk);
    const borrowerInstance = await entitiesService.getById(borrowerEntity);
    const borrowerResult = await borrowerInstance.getAllRecords();

    console.log('[AdminService] Borrower items count:', borrowerResult.items?.length);

    if (!borrowerResult.items || borrowerResult.items.length === 0) {
      console.warn('[AdminService] No borrower records found');
      return [];
    }

    // Fetch personal info to map names
    let personalInfoMap = new Map<string, { firstName: string; lastName: string }>();
    
    if (personalInfoEntity) {
      try {
        console.log('[AdminService] Fetching personal info from entity:', personalInfoEntity);
        const personalInfoInstance = await entitiesService.getById(personalInfoEntity);
        const personalInfoResult = await personalInfoInstance.getAllRecords();
        
        if (personalInfoResult.items && personalInfoResult.items.length > 0) {
          console.log('[AdminService] Personal info items count:', personalInfoResult.items.length);
          
          // Build a map of userId -> name
          (personalInfoResult.items as any[]).forEach((item: any) => {
            const userId = String(item.UserId ?? item.userId ?? item.Id ?? '');
            const firstName = item.FirstName ?? item.firstName ?? item.firstname ?? '';
            const lastName = item.LastName ?? item.lastName ?? item.lastname ?? '';
            
            if (userId) {
              personalInfoMap.set(userId, { firstName, lastName });
            }
          });
          
          console.log('[AdminService] Personal info map size:', personalInfoMap.size);
        }
      } catch (error) {
        console.warn('[AdminService] Failed to fetch personal info (continuing without names):', error);
      }
    }

    return (borrowerResult.items as any[]).map((item: any) => {
      // Field names from UiPath entity: Id (Guid), userId (number), isActive, emailAddress
      const userId = item.userId ?? '';
      const emailAddress = item.emailAddress ?? '';
      const isActive = item.isActive ?? true;
      const id = item.Id ?? ''; // Entity Guid for deletion
      
      // Get name from personal info map
      const personalInfo = personalInfoMap.get(String(userId));
      const name = personalInfo 
        ? `${personalInfo.firstName} ${personalInfo.lastName}`.trim()
        : undefined;

      return {
        id: String(id), // Entity Guid for API operations
        userId: String(userId), // Display userId
        emailAddress: String(emailAddress),
        isActive: Boolean(isActive),
        name: name || undefined,
      };
    });
  } catch (error) {
    console.error('[AdminService] Failed to fetch borrower users:', error);
    return [];
  }
}

/**
 * Update a borrower user's status
 */
export async function updateBorrowerUser(
  sdk: UiPath,
  recordId: string,
  updates: { isActive?: boolean }
): Promise<boolean> {
  try {
    const entity = import.meta.env.VITE_BORROWER_PROFILE_ENTITY_ID;
    if (!entity) {
      console.error('[AdminService] Borrower Profile Entity ID not configured');
      return false;
    }

    const entitiesService = new Entities(sdk);
    
    const payload: Record<string, any> = {};
    if (updates.isActive !== undefined) payload.isActive = updates.isActive;

    console.log('[AdminService] Updating borrower user:', recordId, 'with payload:', payload);

    // Use the recordId directly (it's the entity record ID)
    await entitiesService.updateRecordById(entity, recordId, payload);
    return true;
  } catch (error) {
    console.error('[AdminService] Failed to update borrower user:', error);
    return false;
  }
}

/**
 * Get audit logs from UiPath Audit Log Entity using SDK
 */
export async function getAuditLogs(
  sdk: UiPath,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    userRole?: string;
    action?: string;
    entityType?: string;
    severity?: string;
    search?: string;
  }
): Promise<any[]> {
  try {
    const entity = import.meta.env.VITE_AUDIT_LOG_ENTITY_ID;
    if (!entity) {
      console.error('[AdminService] Audit Log Entity ID not configured');
      return [];
    }

    console.log('[AdminService] Fetching audit logs from entity:', entity);
    const entitiesService = new Entities(sdk);
    const entityInstance = await entitiesService.getById(entity);
    const result = await entityInstance.getAllRecords();

    console.log('[AdminService] Audit log items count:', result.items?.length);

    if (!result.items || result.items.length === 0) {
      console.warn('[AdminService] No audit log records found');
      return [];
    }

    let logs = (result.items as any[]).map((item: any) => ({
      Id: item.Id || item.id || '',
      UserId: item.UserId || item.userId || '',
      User: item.User || item.user || '',
      UserRole: item.UserRole || item.userRole || '',
      Action: item.Action || item.action || '',
      EntityType: item.EntityType || item.entityType || '',
      EntityId: item.EntityId || item.entityId || '',
      CaseId: item.CaseId || item.caseId || '',
      Description: item.Description || item.description || '',
      Severity: item.Severity || item.severity || 'Info',
      CreatedOn: item.CreatedOn || item.CreateTime || item.createTime || '',
      OldValue: item.OldValue || item.oldValue || '',
      NewValue: item.NewValue || item.newValue || '',
      IpAddress: item.IpAddress || item.ipAddress || item.IPAddress || '',
      UserAgent: item.UserAgent || item.userAgent || '',
    }));

    // Apply client-side filters
    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.UserId?.toLowerCase().includes(filters.userId!.toLowerCase()));
      }
      if (filters.userRole) {
        logs = logs.filter(log => log.UserRole === filters.userRole);
      }
      if (filters.action) {
        logs = logs.filter(log => log.Action?.toLowerCase().includes(filters.action!.toLowerCase()));
      }
      if (filters.entityType) {
        logs = logs.filter(log => log.EntityType === filters.entityType);
      }
      if (filters.severity) {
        logs = logs.filter(log => log.Severity === filters.severity);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        logs = logs.filter(log => 
          log.UserId?.toLowerCase().includes(search) ||
          log.Action?.toLowerCase().includes(search) ||
          log.Description?.toLowerCase().includes(search) ||
          log.EntityId?.toLowerCase().includes(search)
        );
      }
      if (filters.dateFrom) {
        logs = logs.filter(log => log.CreatedOn >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        logs = logs.filter(log => log.CreatedOn <= filters.dateTo!);
      }
    }

    return logs;
  } catch (error) {
    console.error('[AdminService] Failed to fetch audit logs:', error);
    return [];
  }
}

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCSV(logs: any[], filename?: string): void {
  if (!logs || logs.length === 0) {
    console.warn('[AdminService] No logs to export');
    return;
  }

  const headers = ['UserId', 'UserRole', 'Action', 'EntityType', 'EntityId', 'CaseId', 'Description', 'Severity', 'Timestamp'];
  
  const csvRows = [
    headers.join(','),
    ...logs.map((log) => 
      [
        log.UserId || '',
        log.UserRole || '',
        `"${(log.Action || '').replace(/"/g, '""')}"`,
        log.EntityType || '',
        log.EntityId || '',
        log.CaseId || '',
        `"${(log.Description || '').replace(/"/g, '""')}"`,
        log.Severity || '',
        log.Timestamp || new Date().toISOString(),
      ].join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export users to CSV
 */
export function exportUsersToCSV(
  users: LenderUser[] | BorrowerUser[],
  type: 'lenders' | 'borrowers',
  filename?: string
): void {
  if (!users || users.length === 0) {
    console.warn('[AdminService] No users to export');
    return;
  }

  let headers: string[];
  let rows: string[][];

  if (type === 'lenders') {
    const lenderUsers = users as LenderUser[];
    headers = ['ID', 'Email', 'Role', 'IsActive', 'IsAdmin'];
    rows = lenderUsers.map((u) => [
      u.id,
      u.email,
      u.role,
      u.isActive.toString(),
      u.isAdmin.toString(),
    ]);
  } else {
    const borrowerUsers = users as BorrowerUser[];
    headers = ['UserId', 'EmailAddress', 'IsActive', 'Name'];
    rows = borrowerUsers.map((u) => [
      u.userId,
      u.emailAddress,
      u.isActive.toString(),
      u.name || '',
    ]);
  }

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename || `${type}-users-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}