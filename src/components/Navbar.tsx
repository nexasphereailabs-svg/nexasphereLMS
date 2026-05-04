import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, GraduationCap, Menu } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 shadow-sm shadow-slate-100/50">
      <div className="flex items-center gap-3 md:gap-4">
        {isAuthenticated && user?.role !== 'admin' && (
          <button 
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-50 rounded-lg md:hidden text-slate-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-indigo-600 group">
          <div className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
            <GraduationCap className="w-7 h-7" />
          </div>
          <span className="hidden sm:inline tracking-tight text-slate-900">EduPlatform</span>
          <span className="sm:hidden text-slate-900">EP</span>
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
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Log In
            </Link>
            <Link
              to="/register"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              Get Started
            </Link>
          </div>
        ) }
      </div>
    </nav>
  );
}
