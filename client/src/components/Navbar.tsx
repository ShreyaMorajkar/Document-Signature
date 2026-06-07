import React from 'react';
import { FileSignature, LogOut, LayoutDashboard, UploadCloud, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage }) => {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentPage('login');
  };

  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-lg mb-8">
      {/* Brand logo */}
      <div 
        className="flex items-center space-x-3 cursor-pointer select-none"
        onClick={() => setCurrentPage(token ? 'dashboard' : 'login')}
      >
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/20">
          <FileSignature size={24} />
        </div>
        <span className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          SignFlow
        </span>
      </div>

      {/* Navigation items */}
      {token && (
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setCurrentPage('builder')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentPage === 'builder'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UploadCloud size={16} />
            <span>Upload & Place</span>
          </button>
        </div>
      )}

      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {token ? (
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm font-medium text-indigo-400">{user?.name || 'User'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-400 hover:text-rose-400 bg-slate-900/40 hover:bg-rose-950/20 p-2 rounded-lg border border-slate-800 hover:border-rose-900/50 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline text-sm">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCurrentPage('login')}
            className="flex items-center space-x-2 text-indigo-400 hover:text-white bg-indigo-950/20 hover:bg-indigo-600 px-4 py-2 rounded-lg border border-indigo-900/50 hover:border-indigo-500 transition-all cursor-pointer text-sm font-medium"
          >
            <ShieldCheck size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
