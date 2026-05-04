import React, { useState, useEffect } from 'react';
import { supabase, createAdminAuthClient } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  GraduationCap, 
  BookOpen, 
  Search, 
  Filter, 
  MoreVertical,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Profile {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  full_name: string;
  updated_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Status states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'teacher'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        // Handle the specific recursion error gracefully in the UI if it still happens
        if (error.code === '42P17') {
          throw new Error('Infinite recursion detected in database policies. Please run this in Supabase SQL Editor: \n\nDROP POLICY IF EXISTS "Admins can select all" ON users; \nCREATE POLICY "Admins can select all" ON users FOR SELECT USING ( (auth.jwt() -> \'user_metadata\' ->> \'role\') = \'admin\' OR auth.uid() = id );');
        }
        throw error;
      }
      
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Could not fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const adminAuth = createAdminAuthClient();
      const { error: signUpError } = await adminAuth.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name,
            role: newUser.role
          }
        }
      });

      if (signUpError) throw signUpError;

      setSuccess(`Account for ${newUser.name} created successfully!`);
      setShowAddModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'student' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Safeguard: Prevent deleting itself
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user?.id === userId) {
      setError('You cannot delete your own administrator account.');
      setConfirmDeleteId(null);
      return;
    }

    try {
      setIsDeleting(userId);
      setError(null);
      setSuccess(null);
      
      console.log('Attempting to delete user:', userId);
      
      // Use .select() to verify if the deletion actually occurred (RLS verification)
      const { data, error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .select();
      
      if (deleteError) {
        if (deleteError.code === '42P17') {
          throw new Error('Infinite recursion detected. Please run this in Supabase SQL Editor: \n\nDROP POLICY IF EXISTS "Admins can delete users" ON users; \nCREATE POLICY "Admins can delete users" ON users FOR DELETE USING ( (auth.jwt() -> \'user_metadata\' ->> \'role\') = \'admin\' );');
        }
        throw deleteError;
      }
      
      // If data is empty after a delete with .select(), it means RLS blocked the operation silently
      if (!data || data.length === 0) {
        console.warn('Delete operation returned success but 0 rows were deleted. Checking RLS...');
        throw new Error('Deletion failed. This is likely a database permission (RLS) issue. Please ensure your "Admins can delete users" policy is correctly applied in the Supabase dashboard.');
      }
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess('User account removed successfully.');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(null);
      setConfirmDeleteId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    teachers: users.filter(u => u.role === 'teacher').length,
    students: users.filter(u => u.role === 'student').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {user?.name}!</h1>
          <p className="text-slate-500 text-sm">Oversee accounts, roles, and platform activity.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          Create New Account
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Instructors', value: stats.teachers, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Students', value: stats.students, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Administrators', value: stats.admins, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 mr-2 hidden sm:block" />
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              {(['all', 'student', 'teacher', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={cn(
                    "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                    roleFilter === role 
                      ? "bg-white text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">User</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Joined</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                          {user.full_name?.charAt(0) || user.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm leading-tight">
                            {user.full_name || user.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        user.role === 'admin' ? "bg-amber-100 text-amber-700" :
                        user.role === 'teacher' ? "bg-indigo-100 text-indigo-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500">
                        {new Date(user.updated_at).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {confirmDeleteId === user.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={isDeleting === user.id}
                              className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting === user.id}
                              className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(user.id)}
                            disabled={isDeleting !== null}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              isDeleting !== null
                                ? "text-slate-300 cursor-not-allowed" 
                                : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            )}
                            title="Remove Account"
                          >
                            <Trash2 className={cn("w-4 h-4", isDeleting === user.id && "animate-pulse")} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No users found</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                Try adjusting your search criteria or role filters to find what you're looking for.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Username / Full Name</label>
                      <input
                        required
                        type="text"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        placeholder="Enter account username"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                      <input
                        required
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="john@example.com"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Temporary Password</label>
                      <input
                        required
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Minimum 6 characters"
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Account Role</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        {(['student', 'teacher'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setNewUser({...newUser, role: r})}
                            className={cn(
                              "py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                              newUser.role === r 
                                ? "bg-white text-indigo-600 shadow-sm" 
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isSubmitting}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-8 right-8 z-[60] bg-white border-l-4 border-rose-500 pl-4 pr-12 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button onClick={() => setError(null)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-8 right-8 z-[60] bg-white border-l-4 border-emerald-500 pl-4 pr-12 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-800">{success}</p>
            <button onClick={() => setSuccess(null)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
