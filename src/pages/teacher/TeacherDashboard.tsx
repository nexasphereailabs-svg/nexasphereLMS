import { useEffect, useState } from 'react';
import { BookOpen, Users, Star, UserCheck, Edit, Trash2, Link as LinkIcon, PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { DeleteConfirmationModal } from '../../components/shared/DeleteConfirmationModal';
import { deleteFilesFromUrls } from '../../lib/storage';

interface TeacherProfile {
  id: string;
  title: string;
  category: string;
}

interface Course {
  id: string;
  title: string;
  level: string;
  category?: string;
}

interface Enrollment {
  id: string;
  enrolled_at: string;
  student_id: string;
  course: {
    title: string;
  };
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { name: 'Total Enrollments', value: '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Active Courses', value: '0', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { name: 'Your Subjects', value: '0', icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-100' },
  ]);

  const [recentProfiles, setRecentProfiles] = useState<TeacherProfile[]>([]);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'profile' | 'course', title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // 1. Fetch Teacher Profiles
      const { data: myProfiles } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('teacher_id', user.id);

      // 2. Fetch Courses with nested Enrollments
      // We leverage the teacher's ownership of courses to pull the related enrollment records
      const { data: myCourses, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments (
            id,
            enrolled_at,
            student_id
          )
        `)
        .eq('teacher_id', user.id);
      
      if (courseError) {
        console.error('Error fetching courses with enrollments:', courseError);
        throw courseError;
      }

      // Process and flatten enrollments from all courses
      const allEnrollments: Enrollment[] = [];
      (myCourses || []).forEach(course => {
        // Handle both single objects and arrays (Supabase usually returns array for 1:N)
        const courseEnrols = Array.isArray(course.enrollments) ? course.enrollments : [];
        courseEnrols.forEach((enr: any) => {
          allEnrollments.push({
            id: enr.id,
            enrolled_at: enr.enrolled_at,
            student_id: enr.student_id,
            course: {
              title: course.title
            }
          });
        });
      });

      // Sort by enrollment date newest first
      const sortedEnrollments = allEnrollments.sort((a, b) => 
        new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()
      );

      setStats([
        { name: 'Total Enrollments', value: allEnrollments.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { name: 'Active Courses', value: (myCourses?.length || 0).toString(), icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        { name: 'Your Subjects', value: (myProfiles?.length || 0).toString(), icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-100' },
      ]);

      setRecentProfiles((myProfiles || []).slice(0, 3));
      setRecentCourses((myCourses || []).slice(0, 3));
      setRecentEnrollments(sortedEnrollments.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDeleteProfile = (profile: TeacherProfile) => {
    setItemToDelete({ id: profile.id, type: 'profile', title: profile.title });
    setModalOpen(true);
  };

  const handleDeleteCourse = (course: Course) => {
    setItemToDelete({ id: course.id, type: 'course', title: course.title });
    setModalOpen(true);
  };

  const performDeletion = async () => {
    if (!itemToDelete || !user) return;
    
    try {
      setIsDeleting(true);
      
      // Cleanup storage before deleting from DB
      if (itemToDelete.type === 'course') {
        const { data: modulesData } = await supabase
          .from('modules')
          .select('slides_url')
          .eq('course_id', itemToDelete.id);
        
        if (modulesData) {
          const urls = modulesData.map(m => m.slides_url).filter(Boolean);
          if (urls.length > 0) {
            await deleteFilesFromUrls(urls, 'slides');
          }
        }
        
        // Manual cleanup of related records if no CASCADE is set up (though it should be)
        await supabase.from('course_attendance').delete().eq('course_id', itemToDelete.id);
        await supabase.from('module_progress').delete().eq('course_id', itemToDelete.id);
        await supabase.from('enrollments').delete().eq('course_id', itemToDelete.id);
        await supabase.from('modules').delete().eq('course_id', itemToDelete.id);
      } else if (itemToDelete.type === 'profile') {
        // Find all courses for this profile
        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .eq('profile_id', itemToDelete.id);
        
        const courseIds = courses?.map(c => c.id) || [];
        if (courseIds.length > 0) {
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
          
          await supabase.from('course_attendance').delete().in('course_id', courseIds);
          await supabase.from('module_progress').delete().in('course_id', courseIds);
          await supabase.from('enrollments').delete().in('course_id', courseIds);
          await supabase.from('modules').delete().in('course_id', courseIds);
          await supabase.from('courses').delete().in('id', courseIds);
        }
      }

      const table = itemToDelete.type === 'profile' ? 'teacher_profiles' : 'courses';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id);
      
      if (error) throw error;
      
      await loadData();
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-slate-500 text-sm">
          Here is an overview of your courses and student performance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
              </div>
              <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                <UserCheck className="w-4.5 h-4.5" />
              </div>
              Recent Profiles
            </h2>
            <Link to="/teacher/my-profiles" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">View All &rarr;</Link>
          </div>
          
          <div className="grid gap-3">
            {recentProfiles.length === 0 ? (
              <div className="py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No profiles created yet</p>
              </div>
            ) : (
              recentProfiles.map(profile => (
                <div key={profile.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-center justify-between group hover:border-indigo-300 transition-all hover:shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <CategoryIcon category={profile.category} title={profile.title} className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate pr-2 group-hover:text-indigo-600 transition-colors" title={profile.title}>{profile.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{profile.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link to={`/teacher/edit-profile/${profile.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></Link>
                    <button onClick={() => handleDeleteProfile(profile)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              Recent Courses
            </h2>
            <Link to="/teacher/my-courses" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">View All &rarr;</Link>
          </div>

          <div className="grid gap-3">
            {recentCourses.length === 0 ? (
              <div className="py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No courses recorded yet</p>
              </div>
            ) : (
              recentCourses.map(course => (
                <div key={course.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 flex items-center justify-between group hover:border-indigo-300 transition-all hover:shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <CategoryIcon category={course.category} title={course.title} className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate pr-2 group-hover:text-indigo-600 transition-colors" title={course.title}>{course.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{course.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link to={`/teacher/edit-course/${course.id}`} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></Link>
                    <button onClick={() => handleDeleteCourse(course)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="px-1">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
            Recent Enrollments
          </h2>
        </div>
        
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                      No enrollments found
                    </td>
                  </tr>
                ) : (
                  recentEnrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {enr.student_id.split('-')[0].toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {enr.course.title}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-xs text-slate-500 font-medium">
                          {new Date(enr.enrolled_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={performDeletion}
        isLoading={isDeleting}
        title={itemToDelete?.type === 'profile' ? 'Delete Profile' : 'Delete Course'}
        description={
          itemToDelete?.type === 'profile' 
            ? `Are you sure you want to delete the profile "${itemToDelete?.title}"? This action cannot be undone.`
            : `Are you sure you want to delete the course "${itemToDelete?.title}"? This will remove all associated content.`
        }
      />
    </div>
  );
}
