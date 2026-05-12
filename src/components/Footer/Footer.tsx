import { Link } from "react-router-dom";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-black text-white pt-16 pb-8">
            <div className="w-full 2xl:px-8 mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

                    {/* Brand Section */}
                    <div className="col-span-1 md:col-span-1">
                        <h2 className="text-xl font-bold text-white mb-4">Finance Portal</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Empowering financial growth through automated lending solutions and
                            intelligent underwriter workflows. Fast, secure, and transparent.
                        </p>
                    </div>

                    {/* Borrower Links */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Borrowers</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/borrower/login" className="hover:text-blue-400 transition-colors">Apply for Loan</Link></li>
                            <li><Link to="/borrower/dashboard" className="hover:text-blue-400 transition-colors">Track Application</Link></li>
                            <li><Link to="/borrower/view-documents" className="hover:text-blue-400 transition-colors">Document Center</Link></li>
                            <li><Link to="/" className="hover:text-blue-400 transition-colors">Loan Calculator</Link></li>
                        </ul>
                    </div>

                    {/* Internal Staff Links */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Staff Portal</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/lender-login" className="hover:text-blue-400 transition-colors">Officer Login</Link></li>
                            <li><Link to="/lender/dashboard" className="hover:text-blue-400 transition-colors">Officer Dashboard</Link></li>
                            <li><Link to="/underwriter/dashboard" className="hover:text-blue-400 transition-colors">Underwriter Panel</Link></li>
                            <li><Link to="/access-denied" className="hover:text-blue-400 transition-colors">Access Policies</Link></li>
                        </ul>
                    </div>

                    {/* Contact & Support */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Support</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-center gap-2">
                                <span className="font-medium text-gray-200">Email:</span> support@financeportal.com
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="font-medium text-gray-200">Phone:</span> +1 (555) 000-0000
                            </li>
                            <li className="mt-4 flex gap-4">
                                {/* Social Icons Placeholders */}
                                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer text-xs transition-colors">in</div>
                                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer text-xs transition-colors">X</div>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">
                        © {currentYear} Finance Lending Portal. Powered by AcceliFinance.
                    </p>
                    <div className="flex gap-6 text-xs text-gray-500 font-medium">
                        <Link to="/" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
                        <Link to="/" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
                        <Link to="/" className="hover:text-gray-300 transition-colors">Cookie Settings</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}