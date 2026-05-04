import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UserCircle, 
  FolderOpen, 
  UploadCloud, 
  Search, 
  BookOpen,
  Shield,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

const teacherLinks = [
  { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { name: 'Create Subject', path: '/teacher/create-profile', icon: UserCircle },
  { name: 'My Subjects', path: '/teacher/my-profiles', icon: FolderOpen },
  { name: 'My Curricula', path: '/teacher/my-courses', icon: BookOpen },
  { name: 'Upload Course', path: '/teacher/upload-course', icon: UploadCloud },
];

const studentLinks = [
  { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Browse Subjects', path: '/student/browse-profiles', icon: Search },
  { name: 'My Courses', path: '/student/view-courses', icon: BookOpen },
];

const adminLinks = [
  { name: 'User Management', path: '/admin/dashboard', icon: Shield },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  let links = studentLinks;
  if (user.role === 'teacher') links = teacherLinks;
  else if (user.role === 'admin') links = adminLinks;

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:h-[calc(100vh-64px)] md:bg-white",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Mobile Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 md:hidden">
          <span className="font-semibold text-slate-900">Menu</span>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500')} />
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* User context info for mobile sidebar footer */}
        <div className="p-4 border-t border-slate-100 md:hidden">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-2xl">
            <div className="w-9 h-9 rounded-full bg-white shadow-sm text-indigo-600 flex items-center justify-center text-xs font-bold uppercase border border-slate-100">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate tracking-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
