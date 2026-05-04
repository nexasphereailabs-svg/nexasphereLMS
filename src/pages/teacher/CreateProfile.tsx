import React, { useState } from 'react';
import { User, Briefcase, AlignLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function CreateProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const { error: insertError } = await supabase
        .from('teacher_profiles')
        .insert({
          teacher_id: user.id,
          title,
          category,
          description
        });

      if (insertError) throw insertError;
      navigate('/teacher/dashboard');
    } catch (err: any) {
      console.error('Failed to create profile:', err);
      setError(err.message || 'Failed to create profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-700 font-sans">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-left">
          Create Subject Identity
        </h1>
        <p className="text-slate-500 text-sm text-left font-medium">Establish your specialized domain and professional teaching persona.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl">
          <p className="text-red-700 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Database Error
          </p>
          <p className="text-red-600 text-sm mt-1 font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/5 group text-left">
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2.5">
              <User className="w-3.5 h-3.5 text-indigo-500" /> Subject Display Name
            </label>
            <input 
              required
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-medium" 
              placeholder="e.g., Senior Frontend Instructor" 
            />
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Expertise Category
            </label>
            <input 
              required
              type="text" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-medium" 
              placeholder="e.g., Mathematics, Computer Science..." 
            />
          </div>
 
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2.5">
              <AlignLeft className="w-3.5 h-3.5 text-indigo-500" /> Subject Profile Bio
            </label>
            <textarea 
              required
              rows={5} 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700 leading-relaxed placeholder:text-slate-300" 
              placeholder="Describe your subject expertise..." 
            />
          </div>
        </div>
 
        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group-hover:shadow-indigo-500/20"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Publishing Persona...
            </>
          ) : (
            'Establish Subject Identity'
          )}
        </button>
      </form>
    </div>
  );
}
