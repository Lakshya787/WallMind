import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, LogOut, User, PlusCircle, LayoutDashboard } from 'lucide-react';
import CreditsManager from './CreditsManager';
import AccountLinker from './AccountLinker';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Show truncated public key as subtitle when user signed up via wallet (no email)
  const userSubtitle = user?.email
    ? user.email
    : user?.publicKey
      ? `${user.publicKey.slice(0, 6)}...${user.publicKey.slice(-4)}`
      : null;

  return (
    <nav className="glass sticky top-0 z-50 border-b border-slate-800/60 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg group-hover:bg-blue-500/40 transition-all duration-500"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight font-display">
              WallMind
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {user && (
              <>
                <Link to="/dashboard" className="text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800/50 font-medium text-sm flex items-center transition-all duration-200">
                  <LayoutDashboard className="w-4 h-4 mr-2 text-indigo-400" />
                  Dashboard
                </Link>
                <Link to="/upload" className="text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800/50 font-medium text-sm flex items-center transition-all duration-200">
                  <PlusCircle className="w-4 h-4 mr-2 text-blue-400" />
                  New Analysis
                </Link>
              </>
            )}
          </div>

          {/* Auth Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Wallet: link wallet / add email controls */}
                <AccountLinker />

                {/* Credits badge + buy button */}
                <CreditsManager />

                {/* Vertical divider */}
                <div className="h-8 w-px bg-slate-700/60" />

                {/* User identity */}
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-white leading-none tracking-wide">{user.username}</span>
                  {userSubtitle && (
                    <span className="text-xs text-slate-400 mt-1 font-mono">{userSubtitle}</span>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] border border-slate-700/50 hover:border-indigo-500/50 transition-colors cursor-default">
                  <User className="h-5 w-5" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-full transition-all duration-200 border border-transparent hover:border-red-900/30"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-white font-medium text-sm px-4 py-2 hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-full text-white overflow-hidden group border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity"></span>
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></span>
                  <span className="relative font-semibold">Get Started</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
