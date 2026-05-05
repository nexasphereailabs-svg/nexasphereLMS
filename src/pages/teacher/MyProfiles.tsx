import { useEffect, useState } from 'react';
import { Edit, Trash2, Eye, PlusCircle, Loader2, User } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DeleteConfirmationModal } from '../../components/shared/DeleteConfirmationModal';
import { deleteFilesFromUrls } from '../../lib/storage';

interface TeacherProfile {
  id: string;
  title: string;
  category: string;
  description: string;
}

export default function MyProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  const fetchProfiles = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('teacher_id', user.id);
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [user?.id]);

  const confirmDelete = async () => {
    if (!profileToDelete || !user) return;
    
    try {
      setIsDeleting(true);
      
      // 1. Find all courses for this profile
      const { data: coursesToDelete, error: fetchCoursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('profile_id', profileToDelete);

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
        .eq('id', profileToDelete)
        .eq('teacher_id', user.id);
      
      if (profileError) throw profileError;
      
      setProfiles(profiles.filter(p => p.id !== profileToDelete));
      setProfileToDelete(null);
    } catch (err: any) {
      console.error('Delete flow failed:', err);
      alert(`PURGE FAILED: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight"> Persona Registry </h1>
          <p className="text-slate-500 text-sm">Manage your specialized subject identities and academic profiles.</p>
        </div>
        <Link to="/teacher/create-profile" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 shrink-0 group">
          <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" /> 
          Initialize Subject
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="py-24 bg-slate-50/50 border border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
            <User className="w-8 h-8 opacity-20" />
          </div>
          <p className="font-bold text-xs uppercase tracking-widest mb-6 opacity-60">Persona Registry Empty</p>
          <Link to="/teacher/create-profile" className="text-indigo-600 font-bold hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest text-[10px] border-2 border-indigo-600 px-8 py-3 rounded-xl">
            Establish First Persona &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center gap-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group overflow-hidden relative">
              <div className="w-full md:w-48 h-32 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-indigo-600 transition-all relative z-10">
                <CategoryIcon category={profile.category} title={profile.title} className="w-10 h-10 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              
              <div className="flex-1 space-y-3 w-full text-left relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md uppercase tracking-widest">
                    {profile.category}
                  </span>
                </div>
                <h3 className="font-bold text-2xl text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate pr-1" title={profile.title}>
                  {profile.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl line-clamp-2">
                  {profile.description}
                </p>
              </div>

              <div className="flex gap-2 w-full md:w-auto mt-6 md:mt-0 font-sans relative z-10 pt-6 md:pt-0 border-t md:border-t-0 border-slate-50">
                <Link to={`/profile/${profile.id}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest border border-slate-100" title="View">
                  <Eye className="w-4 h-4" /> Preview
                </Link>
                <Link to={`/teacher/edit-profile/${profile.id}`} className="p-3 bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-slate-100" title="Edit">
                  <Edit className="w-4 h-4" />
                </Link>
                <button 
                  onClick={() => setProfileToDelete(profile.id)} 
                  className="p-3 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-100" 
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!profileToDelete}
        onClose={() => setProfileToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Destroy Subject Identity?"
        description="This will permanently delete this persona and ALL associated courses, modules, and student progress data. This operation is irreversible."
      />
    </div>
  );
}
