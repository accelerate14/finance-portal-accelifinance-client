import { useState, useEffect, useCallback, Fragment } from "react";
import { useUiPathAuth } from "../../../context/UiPathAuthContext";
import { getAuditLogs, exportAuditLogsToCSV } from "../../../services/adminService";
import type { AuditLogFilter } from "../../../types/admin";

const SEVERITY_OPTIONS = ['Info', 'Warning', 'Critical'];
const ENTITY_TYPES = ['Loan', 'Document', 'Profile', 'Employment', 'Case', 'Task', 'Agreement', 'Note', 'Evaluation'];
const USER_ROLES = ['Loan Officer', 'Underwriter', 'Admin'];

export default function AuditLogViewerPage() {
  const { sdk } = useUiPathAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilter>({});
  const [searchInput, setSearchInput] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!sdk) return;
    setLoading(true);
    try {
      const data = await getAuditLogs(sdk, filters);
      // Sort logs descending by default (newest first)
      const sortedData = data.sort((a, b) => new Date(b.CreatedOn).getTime() - new Date(a.CreatedOn).getTime());
      setLogs(sortedData);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [sdk, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput }));
  };

  const handleFilterChange = (key: keyof AuditLogFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput("");
  };

  const handleExport = () => {
    exportAuditLogsToCSV(logs);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'Warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getEntityTypeIcon = (entityType: string) => {
    const icons: Record<string, React.ReactNode> = {
      Loan: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      Document: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />,
      Profile: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
      Task: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    };
    return (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[entityType] || <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-200">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-medium text-purple-700">{logs.length} entries</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all border ${showFilters ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              <span className="hidden sm:inline">Filters</span>
            </span>
          </button>
          <button onClick={handleExport} disabled={logs.length === 0} className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden sm:inline">Export CSV</span>
            </span>
          </button>
          <button onClick={fetchLogs} className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all shadow-sm">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span className="hidden sm:inline">Refresh</span>
            </span>
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" placeholder="Search by user, action, description..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full pl-10 sm:pl-12 pr-20 sm:pr-24 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm" />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">Search</button>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Filter Options</h3>
            <button onClick={clearFilters} className="text-sm text-purple-600 hover:text-purple-700 font-medium">Clear All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date From</label>
              <input type="date" value={filters.dateFrom || ''} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date To</label>
              <input type="date" value={filters.dateTo || ''} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">User Role</label>
              <select value={filters.userRole || ''} onChange={(e) => handleFilterChange('userRole', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Roles</option>
                {USER_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Severity</label>
              <select value={filters.severity || ''} onChange={(e) => handleFilterChange('severity', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Severities</option>
                {SEVERITY_OPTIONS.map(sev => <option key={sev} value={sev}>{sev}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Entity Type</label>
              <select value={filters.entityType || ''} onChange={(e) => handleFilterChange('entityType', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">All Types</option>
                {ENTITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entity</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">Entity ID</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">Case ID</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <p>No audit logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <Fragment key={index}>
                    <tr className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedRow === index ? 'bg-purple-50' : ''}`} onClick={() => setExpandedRow(expandedRow === index ? null : index)}>
                      <td className="px-3 py-3">
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRow === index ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-500 font-mono whitespace-nowrap">{log.CreatedOn ? new Date(log.CreatedOn).toLocaleString() : 'N/A'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{(log.User || '?').charAt(0).toUpperCase()}</div>
                          <span className="text-xs font-medium text-gray-900 truncate max-w-[100px]">{log.User || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3"><span className="text-xs text-gray-600">{log.UserRole || 'N/A'}</span></td>
                      <td className="px-3 py-3"><span className="text-xs font-medium text-gray-700">{log.Action || 'N/A'}</span></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {getEntityTypeIcon(log.EntityType)}
                          <span className="text-xs text-gray-600">{log.EntityType || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell"><span className="text-xs font-mono text-gray-500">{log.EntityId || 'N/A'}</span></td>
                      <td className="px-3 py-3 hidden xl:table-cell"><span className="text-xs font-mono text-gray-500">{log.CaseId || 'N/A'}</span></td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(log.Severity)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${log.Severity === 'Critical' ? 'bg-red-500' : log.Severity === 'Warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                          {log.Severity || 'Info'}
                        </span>
                      </td>
                    </tr>
                    {/* Inline Expanded Row */}
                    {expandedRow === index && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="p-0">
                          <div className="p-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
                                <p className="text-sm font-mono text-gray-900">{log.UserId || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Entity ID</label>
                                <p className="text-sm font-mono text-gray-900">{log.EntityId || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Case ID</label>
                                <p className="text-sm font-mono text-gray-900">{log.CaseId || 'N/A'}</p>
                              </div>
                              <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                <p className="text-sm text-gray-900">{log.Description || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">IP Address</label>
                                <p className="text-sm font-mono text-gray-900">{log.IpAddress || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Old Value</label>
                                <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-x-auto max-h-24">{log.OldValue || 'N/A'}</pre>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">New Value</label>
                                <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-x-auto max-h-24">{log.NewValue || 'N/A'}</pre>
                              </div>
                              <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">User Agent</label>
                                <p className="text-xs font-mono text-gray-700 break-all">{log.UserAgent || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}