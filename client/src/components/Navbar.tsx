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
    <nav className="w-full bg-[#050508]/80 border-b-2 border-[#1f1f2e] sticky top-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md mb-8">
      {/* Brand logo */}
      <div 
        className="flex items-center space-x-3 cursor-pointer select-none"
        onClick={() => setCurrentPage(token ? 'dashboard' : 'login')}
      >
        <div className="bg-[#f97316] p-2 rounded-lg text-black border border-[#ea580c] shadow-sm">
          <FileSignature size={20} />
        </div>
        <span className="font-display text-xl font-black tracking-tight text-white uppercase">
          Sign<span className="text-[#f97316]">Flow</span>
        </span>
      </div>

      {/* Navigation items */}
      {token && (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              currentPage === 'dashboard'
                ? 'bg-[#f97316] text-black border border-[#ea580c] font-black'
                : 'text-slate-400 hover:text-white border border-transparent hover:border-[#1f1f2e] hover:bg-slate-900/50'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setCurrentPage('builder')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              currentPage === 'builder'
                ? 'bg-[#f97316] text-black border border-[#ea580c] font-black'
                : 'text-slate-400 hover:text-white border border-transparent hover:border-[#1f1f2e] hover:bg-slate-900/50'
            }`}
          >
            <UploadCloud size={14} />
            <span>Upload & Place</span>
          </button>
        </div>
      )}

      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {token ? (
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Signed in as</p>
              <p className="text-xs font-bold text-[#f97316] tech-font">{user?.name || 'User'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-400 hover:text-black bg-black hover:bg-[#f97316] p-2 rounded-lg border border-[#1f1f2e] hover:border-[#ea580c] transition-all cursor-pointer text-xs uppercase font-bold tracking-wider"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCurrentPage('login')}
            className="flex items-center space-x-2 text-[#f97316] hover:text-black bg-black hover:bg-[#f97316] px-4 py-2 rounded-lg border border-[#1f1f2e] hover:border-[#ea580c] transition-all cursor-pointer text-xs font-bold uppercase tracking-wider"
          >
            <ShieldCheck size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
