import { Link, useNavigate, useLocation } from "react-router-dom";
import accelirateLogo from "./AcceliFinanace Logo 1.3.png";
import { useAuth } from "../../context/useAuth";
import { useUiPathAuth } from "../../context/UiPathAuthContext";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated: isBorrowerAuth, borrowerLogout, role: borrowerRole, borrowerId } = useAuth();
  const {
    isAuthenticated: isLenderAuth,
    logout: lenderLogout,
    roleLender: lenderRole,
    user: username,
    isAdmin,
    refreshAdminStatus
  } = useUiPathAuth();
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const anyAuthenticated = isBorrowerAuth || isLenderAuth;
  const isAdminPage = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    if (isBorrowerAuth) borrowerLogout();
    if (isLenderAuth) lenderLogout();

    setName("");
    setRole("");
    navigate("/");
  };

  // Smart toggle: navigates between admin and lender view
  const handlePortalSwitch = async () => {
    setIsSwitching(true);
    try {
      if (isAdminPage) {
        // Re-fetch the role dynamically from the entity when switching
        const result = await refreshAdminStatus();
        const currentRole = result?.role || lenderRole;

        if (currentRole === "Loan Officer") {
          navigate('/lender/dashboard');
        } else {
          navigate('/underwriter/dashboard');
        }
      } else {
        navigate('/admin/users');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    const lenderToken = localStorage.getItem(`uipath_sdk_user_token-${import.meta.env.VITE_UIPATH_CLIENT_ID}`);
    if (lenderToken) {
      setRole('Lender');
    }
  }, [isLenderAuth]);

  useEffect(() => {
    const borrowerToken = localStorage.getItem("borrower_token");
    if (isBorrowerAuth && borrowerToken) {
      try {
        const decoded = jwtDecode<any>(borrowerToken);
        setName(decoded?.email || "");
        setRole('Borrower');
      } catch (e) {
        console.error("Token decode failed", e);
      }
    } else {
      setName("");
      setRole("");
    }
  }, [isBorrowerAuth, borrowerId]);

  const getPortalBadge = () => {
    if (isAdminPage) {
      return { label: 'ADMIN PANEL', color: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    if (lenderRole) {
      return { label: `${lenderRole.toUpperCase()} PORTAL`, color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (borrowerRole) {
      return { label: `${borrowerRole.toUpperCase()} PORTAL`, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
    return null;
  };

  const portalBadge = getPortalBadge();

  return (
    <nav className="w-full bg-white shadow-sm border-b border-slate-100 sticky top-0 z-50">
      <div className="w-full 2xl:px-8 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Left Section - Logo & Portal Badge */}
          <div className="flex items-center gap-2 sm:gap-5 min-w-0 flex-shrink">
            <Link to="/" className="flex items-center flex-shrink-0">
              <div className="h-12 sm:h-16 flex items-center overflow-hidden">
                <img
                  src={accelirateLogo}
                  alt="Accelirate Logo"
                  className="h-full w-36 sm:w-48 md:w-56 object-fill"
                />
              </div>
            </Link>
            {portalBadge && (
              <span className={`inline-flex px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider border sm:border-2 shadow-sm whitespace-nowrap overflow-hidden text-ellipsis flex-shrink ${portalBadge.color}`}>
                <span className="truncate">{portalBadge.label}</span>
              </span>
            )}
          </div>

          {/* Right Section - User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* User Info - Desktop Only */}
            {(username || name) && (
              <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(username || name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 max-w-[150px]">
                  <p className="text-sm font-semibold text-slate-800 truncate">{username || name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{role}</p>
                </div>
              </div>
            )}

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-3">
              <Link
                to="/"
                className="px-3 xl:px-4 py-2 xl:py-2.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="hidden xl:inline">Home</span>
                </span>
              </Link>

              {/* Smart Toggle Button for Admin - Single button */}
              {isAdmin && (
                <button
                  onClick={handlePortalSwitch}
                  disabled={isSwitching}
                  className={`px-3 xl:px-4 py-2 xl:py-2.5 text-sm font-medium rounded-lg transition-all border ${isSwitching ? 'opacity-70 cursor-wait' : ''} ${isAdminPage
                    ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200'
                    : 'text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-transparent shadow-sm'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    {isSwitching ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isAdminPage ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    {isAdminPage ? (
                      <>
                        <span className="hidden xl:inline">{isSwitching ? 'Switching...' : 'Lender Dashboard'}</span>
                        <span className="xl:hidden">Lender</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden xl:inline">{isSwitching ? 'Switching...' : 'Admin Panel'}</span>
                        <span className="xl:hidden">Admin</span>
                      </>
                    )}
                  </span>
                </button>
              )}

              {anyAuthenticated || isLenderAuth ? (
                <button
                  onClick={handleLogout}
                  className="px-3 xl:px-4 py-2 xl:py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all border border-red-200"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden xl:inline">Logout</span>
                  </span>
                </button>
              ) : (
                <>
                  <Link
                    to="/borrower/login"
                    className="px-3 xl:px-4 py-2 xl:py-2.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
                  >
                    <span className="hidden sm:inline">Borrower Login</span>
                    <span className="sm:hidden">Borrower</span>
                  </Link>
                  <Link
                    to="/lender-login"
                    className="px-3 xl:px-4 py-2 xl:py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm"
                  >
                    <span className="hidden sm:inline">Lender Login</span>
                    <span className="sm:hidden">Lender</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-screen opacity-100 border-t border-slate-100 py-4' : 'max-h-0 opacity-0 py-0'
            }`}
        >
          <div className="flex flex-col gap-3 px-2 sm:px-0">
            {/* User Info - Mobile */}
            {(username || name) && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(username || name).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{username || name}</p>
                  <p className="text-xs text-slate-500 uppercase">{role}</p>
                </div>
              </div>
            )}

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>

            {/* Smart Toggle Button for Mobile */}
            {isAdmin && (
              <button
                onClick={() => { handlePortalSwitch(); setMobileMenuOpen(false); }}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-all text-center ${isAdminPage
                  ? 'text-blue-600 hover:bg-blue-50 border border-blue-200'
                  : 'text-white bg-gradient-to-r from-purple-600 to-indigo-600'
                  }`}
              >
                {isAdminPage ? 'Switch to Lender Dashboard' : 'Switch to Admin Panel'}
              </button>
            )}

            {anyAuthenticated || isLenderAuth ? (
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/borrower/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 text-center"
                >
                  Borrower Login
                </Link>
                <Link
                  to="/lender-login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg transition-all text-center"
                >
                  Lender Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}