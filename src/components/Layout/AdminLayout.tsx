import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUiPathAuth } from "../../context/UiPathAuthContext";

const navItems = [
  {
    label: 'User Management',
    path: '/admin/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: 'Audit Logs',
    path: '/admin/audit-logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roleLender, isAdmin, refreshAdminStatus } = useUiPathAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // Check admin status on mount and when location changes
  useEffect(() => {
    let cancelled = false;
    const checkAdmin = async () => {
      setIsCheckingAdmin(true);
      await refreshAdminStatus();
      if (!cancelled) {
        setIsCheckingAdmin(false);
      }
    };
    checkAdmin();
    return () => { cancelled = true; };
  }, [location.pathname]);

  // Redirect if admin was disabled - check immediately after refreshAdminStatus
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      console.log('[AdminLayout] Admin disabled, redirecting to lender dashboard');
      navigate('/lender/dashboard', { replace: true });
    }
  }, [isAdmin, navigate, isCheckingAdmin]);

  const handleSwitchToLender = async () => {
    setIsSwitching(true);
    try {
      // Dynamically fetch the newest role values from the entity
      const result = await refreshAdminStatus();
      const currentRole = result?.role || roleLender;

      if (currentRole === "Loan Officer") {
        navigate('/lender/dashboard');
      } else {
        navigate('/underwriter/dashboard');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  // Show loading while checking admin status
  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
                <p className="text-xs text-gray-500">System Management</p>
              </div>
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer - Switch to Lender View */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSwitchToLender}
            disabled={isSwitching}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm ${isSwitching ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isSwitching ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            )}
            <span className="hidden sm:inline">{isSwitching ? 'Switching...' : 'Switch to Lender View'}</span>
            <span className="sm:hidden">{isSwitching ? '...' : 'Lender View'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {navItems.find(item => location.pathname.startsWith(item.path))?.label || 'Admin Dashboard'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Manage your system users and audit logs</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="flex items-center gap-2 px-2 sm:px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}