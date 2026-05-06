import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Cpu, Menu } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 shadow-sm shadow-slate-100/50">
      <div className="flex items-center gap-3 md:gap-4">
        {isAuthenticated && (
          <button 
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-50 rounded-lg md:hidden text-slate-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-indigo-600 group">
          <div className="p-1 bg-white rounded-lg group-hover:bg-indigo-50 transition-colors">
            <img 
              src="https://trpzsatfjbludokxelfh.supabase.co/storage/v1/object/public/LOGO/WhatsApp_Image_2026-04-25_at_23.22.39-removebg-preview.png" 
              alt="Logo" 
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="hidden sm:inline tracking-tight text-slate-900">Nexasphere AI Labs</span>
          <span className="sm:hidden text-slate-900">Nexasphere</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        {isAuthenticated ? (
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden xs:flex items-center gap-3 pr-4 border-r border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold uppercase">
                {user?.name.charAt(0)}
              </div>
              <div className="text-left leading-tight">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-red-600 transition-all rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              to="/login"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition-all shadow-md shadow-indigo-100"
            >
              Sign In
            </Link>
          </div>
        ) }
      </div>
    </nav>
  );
}
