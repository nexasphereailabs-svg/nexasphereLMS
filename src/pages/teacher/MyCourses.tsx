import { useEffect, useState } from 'react';
import { Edit, Trash2, Eye, PlusCircle, Loader2, BookOpen, ClipboardCheck } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DeleteConfirmationModal } from '../../components/shared/DeleteConfirmationModal';
import { deleteFilesFromUrls } from '../../lib/storage';

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  category?: string;
}

export default function MyCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  const fetchCourses = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user.id);
      
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user?.id]);

  const confirmDelete = async () => {
    if (!courseToDelete || !user) return;
    
    try {
      setIsDeleting(true);
      
      // 0. Get modules to get slide URLs for storage cleanup
      const { data: modulesData } = await supabase
        .from('modules')
        .select('slides_url')
        .eq('course_id', courseToDelete);
      
      if (modulesData) {
        const urls = modulesData.map(m => m.slides_url).filter(Boolean);
        if (urls.length > 0) {
          await deleteFilesFromUrls(urls, 'slides');
        }
      }

      // 1. Delete course attendance
      await supabase.from('course_attendance').delete().eq('course_id', courseToDelete);
      // 2. Delete module progress
      await supabase.from('module_progress').delete().eq('course_id', courseToDelete);
      // 3. Delete enrollments
      await supabase.from('enrollments').delete().eq('course_id', courseToDelete);
      // 4. Delete modules
      await supabase.from('modules').delete().eq('course_id', courseToDelete);
      // 5. Delete course
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseToDelete)
        .eq('teacher_id', user.id);
      
      if (courseError) throw courseError;
      setCourses(courses.filter(c => c.id !== courseToDelete));
      setCourseToDelete(null);
    } catch (err: any) {
      console.error('Purge error:', err);
      alert('PURGE ERROR: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Course Inventory</h1>
          <p className="text-slate-500 text-sm">Manage your educational tracks, curriculum modules, and knowledge pathways.</p>
        </div>
        <Link to="/teacher/upload-course" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 shrink-0 group">
          <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" /> 
          Initialize Track
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="py-24 bg-slate-50/50 border border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
            <BookOpen className="w-8 h-8 opacity-20" />
          </div>
          <p className="font-bold text-xs uppercase tracking-widest mb-6 opacity-60">Inventory Null</p>
          <Link to="/teacher/upload-course" className="text-indigo-600 font-bold hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest text-[10px] border-2 border-indigo-600 px-8 py-3 rounded-xl">
            Initialize Curriculum &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center gap-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group overflow-hidden relative">
              <div className="w-full md:w-48 h-32 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-indigo-600 transition-all relative z-10">
                <CategoryIcon category={course.category} title={course.title} className="w-10 h-10 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              
              <div className="flex-1 space-y-3 w-full text-left relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md uppercase tracking-widest">
                    {course.level}
                  </span>
                </div>
                <h3 className="font-bold text-2xl text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate pr-1" title={course.title}>
                  {course.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl line-clamp-2">
                  {course.description}
                </p>
              </div>

              <div className="flex gap-2 w-full md:w-auto mt-6 md:mt-0 font-sans relative z-10 pt-6 md:pt-0 border-t md:border-t-0 border-slate-50">
                <Link to={`/course/${course.id}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest border border-slate-100" title="View">
                  <Eye className="w-4 h-4" /> View
                </Link>
                <Link to={`/teacher/attendance/${course.id}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest border border-indigo-100" title="Attendance">
                  <ClipboardCheck className="w-4 h-4" /> Attendance
                </Link>
                <Link to={`/teacher/edit-course/${course.id}`} className="p-3 bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-slate-100" title="Edit">
                  <Edit className="w-4 h-4" />
                </Link>
                <button 
                  onClick={() => setCourseToDelete(course.id)} 
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
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title="Purge Curriculum?"
        description="This will permanently delete this course and all its modules, enrollments, and student progress logs. This action cannot be reversed."
      />
    </div>
  );
}
