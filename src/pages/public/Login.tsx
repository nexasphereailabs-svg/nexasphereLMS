import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Cpu, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login, error, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'teacher') navigate('/teacher/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/student/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      await login(email, password);
    } catch (err) {
      console.error('Login failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans animate-in fade-in duration-700">
      <div className="max-w-md w-full space-y-10 bg-white p-10 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/5">
        <div className="text-center space-y-6">
          <div className="mx-auto h-20 w-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200 p-2 overflow-hidden">
            <img 
              src="https://files.catbox.moe/n96mwl.png" 
              alt="Nexasphere Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">
              Sign in to your Nexasphere account
            </p>
          </div>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-medium animate-in slide-in-from-top-2 duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-medium animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-slate-700"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-4 px-4 rounded-2xl shadow-lg shadow-indigo-100 text-xs font-bold text-white bg-indigo-600 hover:bg-slate-900 focus:outline-none transition-all transform active:scale-95 disabled:opacity-50 tracking-widest uppercase"
          >
            {isSubmitting ? (
               <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
               </div>
            ) : 'Access Account'}
          </button>

          <div className="pt-2">
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Please contact info@nexasphereailabs.com for account access.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
