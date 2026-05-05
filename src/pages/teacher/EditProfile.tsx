import React, { useState, useEffect } from 'react';
import { User, Briefcase, AlignLeft, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DeleteConfirmationModal } from '../../components/shared/DeleteConfirmationModal';
import { deleteFilesFromUrls } from '../../lib/storage';

export default function EditProfile() {
  const { user } = useAuth();
  const { profileId } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user || !profileId) return;
      try {
        if (!title) {
          setLoading(true);
        }
        const { data, error } = await supabase
          .from('teacher_profiles')
          .select('*')
          .eq('id', profileId)
          .eq('teacher_id', user.id)
          .single();
        
        if (error) {
          navigate('/teacher/dashboard');
          return;
        }

        if (data) {
          setTitle(data.title);
          setCategory(data.category);
          setDescription(data.description);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [profileId, user?.id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileId) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('teacher_profiles')
        .update({
          title,
          category,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .eq('teacher_id', user.id);

      if (error) throw error;
      navigate('/teacher/dashboard');
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!user || !profileId) return;
    try {
      setIsDeleting(true);
      // 1. Find all courses for this profile
      const { data: coursesToDelete, error: fetchCoursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('profile_id', profileId);

      if (fetchCoursesError) throw fetchCoursesError;
      const courseIds = coursesToDelete?.map(c => c.id) || [];

      if (courseIds.length > 0) {
        // 2. Get all modules for these courses to cleanup storage
        const { data: modulesData } = await supabase
          .from('modules')
          .select('slides_url')
          .in('course_id', courseIds);

        if (modulesData) {
          const urls = modulesData.map(m => m.slides_url).filter(Boolean);
          if (urls.length > 0) {
            await deleteFilesFromUrls(urls, 'slides');
          }
        }

        // 3. Delete attendance
        await supabase.from('course_attendance').delete().in('course_id', courseIds);
        // 4. Delete progress
        await supabase.from('module_progress').delete().in('course_id', courseIds);
        // 5. Delete enrollments
        await supabase.from('enrollments').delete().in('course_id', courseIds);
        // 6. Delete modules
        await supabase.from('modules').delete().in('course_id', courseIds);
        // 7. Delete courses
        await supabase.from('courses').delete().in('id', courseIds).eq('teacher_id', user.id);
      }

      // 6. Delete the profile
      const { error: profileError } = await supabase
        .from('teacher_profiles')
        .delete()
        .eq('id', profileId)
        .eq('teacher_id', user.id);
      if (profileError) throw profileError;

      navigate('/teacher/my-profiles');
    } catch (err: any) {
      console.error('Purge error:', err);
      alert('PURGE FAILED: ' + err.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) return <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700 font-sans">
      <div className="flex items-center gap-6">
        <Link to="/teacher/my-profiles" className="p-3 hover:bg-slate-100 rounded-2xl transition-colors shrink-0 group">
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
        </Link>
        <div className="text-left space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Persona</h1>
          <p className="text-slate-500 text-sm font-medium">Refine your specialized domain and teaching architecture.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10 group text-left">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
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
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-900" 
                placeholder="e.g., Senior Frontend Instructor" 
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Expertise Niche
              </label>
              <input 
                required
                type="text" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-900" 
                placeholder="e.g., Mathematics, Computer Science..." 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2.5">
                <AlignLeft className="w-3.5 h-3.5 text-indigo-500" /> Professional Bio
              </label>
              <textarea 
                required
                rows={5} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700 leading-relaxed" 
                placeholder="Provide a detailed description of this subject domain..." 
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Link 
              to="/teacher/my-profiles"
              className="flex-1 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all text-center"
            >
              Discard
            </Link>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Synchronizing...
                </>
              ) : 'Finalize Identity'}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-red-100 space-y-6 text-left">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-slate-900 font-bold tracking-tight">Terminate Identity</h3>
            <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest">Permanent Deletion</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xl">
          Deleting this subject identity will permanently remove it and all related courses, modules, student enrollments, and progress logs.
        </p>
        <button 
          onClick={() => setIsDeleteModalOpen(true)}
          className="bg-white border border-red-200 text-red-600 px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-95"
        >
          Terminate Identity
        </button>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Destroy Identity?"
        description="This will permanently delete this Subject Identity and ALL associated data. It's a full wipe. Are you absolutely certain?"
      />
    </div>
  );
}
