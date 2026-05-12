import { useState, useEffect, useCallback } from "react";
import { useUiPathAuth } from "../../../context/UiPathAuthContext";
import { getLenderUsers, getBorrowerUsers, updateLenderUser, updateBorrowerUser, exportUsersToCSV, createLenderUser } from "../../../services/adminService";
import { useAuditLog } from "../../../hooks/useAuditLog";
import type { LenderUser, BorrowerUser, UserTab } from "../../../types/admin";

export default function UserManagementPage() {
  const { sdk } = useUiPathAuth();
  const { logAudit } = useAuditLog();
  const [activeTab, setActiveTab] = useState<UserTab>('lenders');
  const [lenderUsers, setLenderUsers] = useState<LenderUser[]>([]);
  const [borrowerUsers, setBorrowerUsers] = useState<BorrowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Loan Officer");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      if (sdk) {
        const [lenders, borrowers] = await Promise.all([
          getLenderUsers(sdk),
          getBorrowerUsers(sdk),
        ]);
        setLenderUsers(lenders);
        setBorrowerUsers(borrowers);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleLenderStatus = async (user: LenderUser) => {
    if (!sdk) return;
    const currentStatus = user.isActive;
    const success = await updateLenderUser(sdk, user.id, { isActive: !currentStatus });
    if (success) {
      logAudit({
        action: 'UserUpdated',
        entityType: 'User',
        entityId: user.id,
        oldValue: { isActive: currentStatus },
        newValue: { isActive: !currentStatus },
        description: `Toggled lender user status for ${user.email} from ${currentStatus ? 'Active' : 'Inactive'} to ${!currentStatus ? 'Active' : 'Inactive'}`,
        severity: 'Medium'
      });
      fetchUsers();
    }
  };

  const handleToggleBorrowerStatus = async (user: BorrowerUser) => {
    if (!sdk) return;
    const currentStatus = user.isActive;
    const success = await updateBorrowerUser(sdk, user.id, { isActive: !currentStatus });
    if (success) {
      logAudit({
        action: 'UserUpdated',
        entityType: 'User',
        entityId: user.id,
        oldValue: { isActive: currentStatus },
        newValue: { isActive: !currentStatus },
        description: `Toggled borrower user status for ${user.emailAddress} from ${currentStatus ? 'Active' : 'Inactive'} to ${!currentStatus ? 'Active' : 'Inactive'}`,
        severity: 'Medium'
      });
      fetchUsers();
    }
  };

  const handleDeleteBorrower = async (user: BorrowerUser) => {
    if (!sdk) return;
    if (!window.confirm('Are you sure you want to delete this borrower? This action cannot be undone.')) {
      return;
    }
    try {
      const entity = import.meta.env.VITE_BORROWER_PROFILE_ENTITY_ID;
      if (!entity) return;
      const { Entities } = await import('@uipath/uipath-typescript/entities');
      const entitiesService = new Entities(sdk);
      const entityInstance = await entitiesService.getById(entity);
      await (entityInstance as any).deleteRecords([user.id]);
      logAudit({
        action: 'UserDeleted',
        entityType: 'User',
        entityId: user.id,
        oldValue: { email: user.emailAddress, name: user.name },
        description: `Deleted borrower user profile for ${user.emailAddress} (${user.name || 'Unknown'})`,
        severity: 'Critical'
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete borrower:', error);
      alert('Failed to delete borrower. Please try again.');
    }
  };

  const handleDeleteLender = async (user: LenderUser) => {
    if (!sdk) return;
    if (!window.confirm('Are you sure you want to delete this lender? This action cannot be undone.')) {
      return;
    }
    try {
      const entity = import.meta.env.VITE_LENDER_PROFILE_ENTITY_ID;
      if (!entity) return;
      const { Entities } = await import('@uipath/uipath-typescript/entities');
      const entitiesService = new Entities(sdk);
      const entityInstance = await entitiesService.getById(entity);
      await (entityInstance as any).deleteRecords([user.id]);
      logAudit({
        action: 'UserDeleted',
        entityType: 'User',
        entityId: user.id,
        oldValue: { email: user.email, role: user.role },
        description: `Deleted lender user profile for ${user.email} (Role: ${user.role})`,
        severity: 'Critical'
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete lender:', error);
      alert('Failed to delete lender. Please try again.');
    }
  };

  const handleRoleChange = async (user: LenderUser, newRole: string) => {
    if (!sdk) return;
    const success = await updateLenderUser(sdk, user.id, { role: newRole });
    if (success) {
      logAudit({
        action: 'UserUpdated',
        entityType: 'User',
        entityId: user.id,
        oldValue: { role: user.role },
        newValue: { role: newRole },
        description: `Changed lender user role for ${user.email} from ${user.role} to ${newRole}`,
        severity: 'Medium'
      });
      fetchUsers();
    }
  };

  const handleAdminToggle = async (user: LenderUser) => {
    if (!sdk) return;
    const currentAdmin = user.isAdmin;
    const success = await updateLenderUser(sdk, user.id, { isAdmin: !currentAdmin });
    if (success) {
      logAudit({
        action: 'UserUpdated',
        entityType: 'User',
        entityId: user.id,
        oldValue: { isAdmin: currentAdmin },
        newValue: { isAdmin: !currentAdmin },
        description: `Toggled lender user admin status for ${user.email} from ${currentAdmin} to ${!currentAdmin}`,
        severity: 'High'
      });
      fetchUsers();
    }
  };

  const handleAddLender = async () => {
    if (!sdk || !newUserEmail) return;
    
    // Check for duplicate email
    const existingUser = lenderUsers.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());
    if (existingUser) {
      setAddError("A lender with this email address already exists.");
      return;
    }
    
    setAddLoading(true);
    setAddError("");
    try {
      const success = await createLenderUser(sdk, { 
        email: newUserEmail, 
        role: newUserRole, 
        isAdmin: newUserIsAdmin 
      });
      if (success) {
        logAudit({
          action: 'UserCreated',
          entityType: 'User',
          entityId: newUserEmail,
          description: `Created new lender user with role ${newUserRole}`,
          severity: 'High'
        });
        setShowAddModal(false);
        setNewUserEmail("");
        setNewUserRole("Loan Officer");
        setNewUserIsAdmin(false);
        // Add delay to allow entity sync before fetching
        await new Promise(resolve => setTimeout(resolve, 1500));
        await fetchUsers();
      } else {
        setAddError("Failed to create lender. Please try again.");
      }
    } catch (error) {
      console.error('Failed to create lender:', error);
      setAddError("Failed to create lender. Please try again.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleExport = () => {
    if (activeTab === 'lenders') {
      exportUsersToCSV(lenderUsers, 'lenders');
    } else {
      exportUsersToCSV(borrowerUsers, 'borrowers');
    }
  };

  const filteredLenders = lenderUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBorrowers = borrowerUsers.filter(user =>
    user.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 bg-white p-1.5 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('lenders'); setSearchTerm(""); }}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'lenders'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Lender Management</span>
              <span className="sm:hidden">Lenders</span>
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('borrowers'); setSearchTerm(""); }}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'borrowers'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">Borrower Management</span>
              <span className="sm:hidden">Borrowers</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'lenders' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-purple-600 rounded-lg sm:rounded-xl hover:bg-purple-700 transition-all shadow-sm"
            >
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Add Lender</span>
                <span className="sm:hidden">Add</span>
              </span>
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={`Search ${activeTab === 'lenders' ? 'lenders' : 'borrowers'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Lender Users */}
      {activeTab === 'lenders' && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLenders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p>No lender users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLenders.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 lg:w-9 lg:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-bold flex-shrink-0">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[150px] lg:max-w-none">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className="px-2 lg:px-3 py-1.5 text-xs lg:text-sm font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="Loan Officer">Loan Officer</option>
                          <option value="Underwriter">Underwriter</option>
                        </select>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-full text-xs font-semibold ${
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <button
                          onClick={() => handleAdminToggle(user)}
                          className={`relative inline-flex h-5 lg:h-6 w-9 lg:w-11 items-center rounded-full transition-colors ${
                            user.isAdmin ? 'bg-purple-600' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-3 lg:h-4 w-3 lg:w-4 transform rounded-full bg-white transition-transform ${
                            user.isAdmin ? 'translate-x-5 lg:translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleLenderStatus(user)}
                            className={`px-2 lg:px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                              user.isActive
                                ? 'text-orange-600 hover:bg-orange-50 border border-orange-200'
                                : 'text-green-600 hover:bg-green-50 border border-green-200'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteLender(user)}
                            className="px-2 lg:px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredLenders.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p>No lender users found</p>
                </div>
              </div>
            ) : (
              filteredLenders.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                      user.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Admin:</span>
                      <button
                        onClick={() => handleAdminToggle(user)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          user.isAdmin ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          user.isAdmin ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLenderStatus(user)}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        user.isActive
                          ? 'text-orange-600 hover:bg-orange-50 border border-orange-200'
                          : 'text-green-600 hover:bg-green-50 border border-green-200'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteLender(user)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Borrower Users */}
      {activeTab === 'borrowers' && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User ID</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBorrowers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p>No borrower users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBorrowers.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 lg:w-9 lg:h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-bold flex-shrink-0">
                            {(user.name || user.emailAddress).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <span className="text-xs lg:text-sm font-mono text-gray-600">{user.userId}</span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <span className="text-xs lg:text-sm font-medium text-gray-900 truncate max-w-[150px] lg:max-w-none">{user.emailAddress}</span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-full text-xs font-semibold ${
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleBorrowerStatus(user)}
                            className={`px-2 lg:px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                              user.isActive
                                ? 'text-orange-600 hover:bg-orange-50 border border-orange-200'
                                : 'text-green-600 hover:bg-green-50 border border-green-200'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteBorrower(user)}
                            className="px-2 lg:px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredBorrowers.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p>No borrower users found</p>
                </div>
              </div>
            ) : (
              filteredBorrowers.map((user) => (
                <div key={user.userId} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(user.name || user.emailAddress).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'N/A'}</p>
                        <p className="text-xs font-mono text-gray-500">{user.userId}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                      user.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 truncate">{user.emailAddress}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleBorrowerStatus(user)}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        user.isActive
                          ? 'text-orange-600 hover:bg-orange-50 border border-orange-200'
                          : 'text-green-600 hover:bg-green-50 border border-green-200'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteBorrower(user)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Lender Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Lender</h3>
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); }}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="lender@example.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Loan Officer">Loan Officer</option>
                  <option value="Underwriter">Underwriter</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNewUserIsAdmin(!newUserIsAdmin)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    newUserIsAdmin ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    newUserIsAdmin ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm font-medium text-gray-700">Is Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLender}
                disabled={addLoading || !newUserEmail}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addLoading ? 'Adding...' : 'Add Lender'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}