import React, { useEffect, useState } from 'react';
import { Search, Trophy, Clock, BookOpen, Loader2 } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface Enrollment {
  id: string;
  course_id: string;
  courses: {
    title: string;
    level: string;
    teacher_profiles: {
      category: string;
    };
    modules: { id: string }[];
  }
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // 1. Fetch Enrollments with Course and Module IDs
        const { data: enrolls, error: enrollError } = await supabase
          .from('enrollments')
          .select(`
            id,
            course_id,
            courses (
              title,
              level,
              teacher_profiles (
                category
              ),
              modules (id)
            )
          `)
          .eq('student_id', user.id);

        if (enrollError) throw enrollError;
        
        // Handle cases where courses might be returned as an array or single object
        const formattedEnrolls = (enrolls || []).map((enroll: any) => ({
          ...enroll,
          courses: Array.isArray(enroll.courses) ? enroll.courses[0] : enroll.courses
        }));
        
        setEnrollments(formattedEnrolls);

        // 2. Fetch Progress
        const { data: progressData } = await supabase
          .from('module_progress')
          .select('*')
          .eq('student_id', user.id);
        
        setCompletions(progressData || []);
      } catch (err) {
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="py-40 flex justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin opacity-20" />
      </div>
    );
  }

  const enrolledCount = enrollments.length;
  const completedModulesCount = completions.length;

  const stats = [
    { name: 'Enrolled', value: enrolledCount.toString(), icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Completed Modules', value: completedModulesCount.toString(), icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Learning State', value: enrolledCount > 0 ? 'Active' : 'Idle', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back, {user?.name}!</h1>
        <p className="text-slate-500 text-sm">Track your learning progress and upcoming modules.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            Your Learning Path
          </h3>
          <Link to="/student/view-courses" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Browse All &rarr;</Link>
        </div>

        <Link 
          to="/student/my-attendance"
          className="block group relative overflow-hidden bg-amber-50 border border-amber-200/60 rounded-2xl p-4 transition-all hover:bg-amber-100/80 hover:border-amber-300"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900 tracking-tight">Attendance Reminder</p>
              <p className="text-xs text-amber-700/80 mt-0.5">Please ensure you mark your attendance for today's sessions to maintain your progress record.</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              Mark Now
            </div>
          </div>
        </Link>
        
        {enrollments.length === 0 ? (
          <div className="py-20 bg-slate-100/50 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
            <p className="text-sm font-medium">No active enrollments. Visit Subject Browser to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {enrollments.map((enroll) => {
              const totalModules = enroll.courses.modules?.length || 0;
              const completedInCourse = completions.filter(c => c.course_id === enroll.course_id).length;
              const progressPercent = totalModules > 0 ? (completedInCourse / totalModules) * 100 : 0;

              return (
                <Link 
                  key={enroll.id} 
                  to={`/course/${enroll.course_id}`}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 hover:shadow-md hover:border-indigo-100 transition-all group flex flex-col sm:flex-row items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-5 text-left w-full sm:w-auto">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-100">
                <CategoryIcon 
                  category={enroll.courses.teacher_profiles?.category} 
                  title={enroll.courses.title} 
                  className="w-6 h-6" 
                />
              </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate pr-4">{enroll.courses.title}</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        {completedInCourse} of {totalModules} modules completed
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-64 space-y-2.5">
                     <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <span>Progress</span>
                       <span>{Math.round(progressPercent)}%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                       <div 
                        className="bg-indigo-600 h-full transition-all duration-1000 ease-out" 
                        style={{ width: `${progressPercent}%` }} 
                       />
                     </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
