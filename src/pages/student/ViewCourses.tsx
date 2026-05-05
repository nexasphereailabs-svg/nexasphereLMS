import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Share2, ChevronDown, ChevronUp, CheckCircle2, MonitorPlay, Loader2, BookOpen } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { supabase } from '../../lib/supabase';

interface Course {
  id: string;
  title: string;
  description?: string;
  level: string;
  teacher_profiles: {
    title: string;
    category: string;
  };
}

export default function ViewCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            teacher_profiles (
              title,
              category
            )
          `);
        
        if (error) throw error;
        setCourses(data || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-left">Course Repository</h1>
        <p className="text-slate-500 text-sm text-left">Discover comprehensive learning pathways led by industry experts.</p>
      </div>

      <Link 
        to="/student/my-attendance"
        className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 group hover:bg-indigo-100/50 transition-colors"
      >
        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-indigo-900">Attendance Check</p>
          <p className="text-xs text-indigo-600/70 font-medium">Have you marked your attendance for today? Click here to update your record.</p>
        </div>
      </Link>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin opacity-20" />
        </div>
      ) : courses.length === 0 ? (
        <div className="py-24 bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
           <BookOpen className="w-10 h-10 mb-3 opacity-20" />
           <p className="text-sm font-medium">No courses available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {courses.map((course) => (
            <Link key={course.id} to={`/course/${course.id}`} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm group hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col sm:flex-row overflow-hidden">
              <div className="sm:w-48 bg-slate-50 p-8 flex items-center justify-center shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 group-hover:bg-indigo-600 transition-colors">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform group-hover:border-transparent group-hover:bg-indigo-500">
                    <CategoryIcon 
                      category={course.teacher_profiles.category} 
                      title={course.title} 
                      className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" 
                    />
                   </div>
                   <div className="absolute -top-10 -right-10 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                </div>
              </div>
              
              <div className="flex-1 p-7 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-md">
                      {course.level}
                    </span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-xl text-slate-900 group-hover:text-indigo-600 transition-colors truncate pr-8">{course.title}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Lead: {course.teacher_profiles.title}</p>
                  </div>

                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 text-left">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                  <div className="flex gap-4">
                    <Bookmark className="w-4 h-4 text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                    Enter Course <MonitorPlay className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
