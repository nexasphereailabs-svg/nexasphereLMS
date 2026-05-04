import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Star, MonitorPlay, CheckCircle2, ArrowLeft, Bookmark, Share2, Loader2, Lock } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Section {
  id: string;
  title: string;
  content: string;
  order_index: number;
}

interface Course {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  level: string;
  modules?: Section[];
  teacher_profiles: {
    title: string;
    description: string;
    category: string;
  };
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [completions, setCompletions] = useState<string[]>([]);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        const { data: courseData, error } = await supabase
          .from('courses')
          .select(`
            *,
            teacher_profiles (
              title,
              description,
              category
            ),
            modules (*)
          `)
          .eq('id', courseId)
          .single();

        if (error) throw error;
        
        if (courseData.modules) {
          courseData.modules.sort((a: any, b: any) => a.order_index - b.order_index);
        }
        
        setCourse(courseData);

        if (user) {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('*')
            .eq('course_id', courseId)
            .eq('student_id', user.id);
          
          setIsEnrolled(enrollment && enrollment.length > 0 ? true : false);

          if (enrollment && enrollment.length > 0) {
            const { data: progress } = await supabase
              .from('module_progress')
              .select('module_id')
              .eq('course_id', courseId)
              .eq('student_id', user.id);
            
            setCompletions(progress?.map(p => p.module_id) || []);
          }
        }
      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setEnrolling(true);
      const { error } = await supabase
        .from('enrollments')
        .insert({
          course_id: courseId,
          student_id: user.id
        });

      if (error) throw error;
      setIsEnrolled(true);
    } catch (err) {
      console.error('Enrollment failed:', err);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin opacity-20" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-20 text-center font-mono opacity-50 uppercase tracking-widest text-xs italic text-left">
        Curriculum trace lost...
      </div>
    );
  }

  const sections = course.modules || [];
  const isTeacher = user?.role === 'teacher';
  
  const progressPercent = sections.length > 0 ? (completions.length / sections.length) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-12 text-left font-sans pb-24 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Go Back
        </button>
        <div className="flex gap-3">
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col md:flex-row group transition-all hover:shadow-xl hover:shadow-indigo-500/5">
        <div className="md:w-80 h-80 md:h-auto bg-slate-900 flex items-center justify-center relative overflow-hidden shrink-0 group-hover:bg-indigo-900 transition-colors duration-700">
          <CategoryIcon 
            category={course.teacher_profiles.category} 
            title={course.title} 
            className="w-24 h-24 text-white opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" 
          />
          <div className="absolute top-6 left-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-white border border-white/10">{course.level}</div>
        </div>

        <div className="flex-1 p-8 md:p-12 space-y-8 flex flex-col justify-center">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">{course.title}</h1>
            <p className="text-base text-slate-500 font-medium leading-relaxed max-w-xl">{course.description}</p>
            <div className="flex items-center gap-4 text-left">
               <div className="flex items-center gap-1 text-amber-400">
                 <Star className="w-4 h-4 fill-current" /> <Star className="w-4 h-4 fill-current" /> <Star className="w-4 h-4 fill-current" /> <Star className="w-4 h-4 fill-current" /> <Star className="w-3.5 h-3.5 fill-current opacity-30" />
               </div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instructor: {course.teacher_profiles.title}</span>
            </div>
          </div>

          <div className="flex flex-col gap-8 pt-8 border-t border-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-wrap gap-3 items-center">
                 <div className="bg-indigo-50 px-3 py-1.5 rounded-lg text-[10px] font-bold text-indigo-600 uppercase tracking-widest border border-indigo-100">{sections.length} Modules</div>
                 <div className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-slate-100">Full Access</div>
              </div>
              
              {!isEnrolled && !isTeacher && (
                <button 
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-95 flex items-center gap-2"
                >
                  {enrolling ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enrolling...
                    </>
                  ) : 'Start Pathway Now'}
                </button>
              )}
              {isEnrolled && (
                <div className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-100">
                  <CheckCircle2 className="w-4 h-4" /> Enrolled
                </div>
              )}
            </div>

            {isEnrolled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Pathway Completion State</span>
                  <span className="text-slate-900">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-1000 ease-out shadow-sm" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Curriculum Roadmap</h2>
          <p className="text-sm text-slate-500 font-medium">Follow the structured modules to master the curriculum content.</p>
        </div>

        {sections.length === 0 ? (
          <div className="py-24 bg-slate-50/50 border border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Curriculum pending deployment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sections.map((section, idx) => (
              <div key={section.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200 transition-all group/item">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all duration-500">
                    {idx + 1}
                  </div>
                  <div className="flex-1 text-left">
                    <h5 className="text-lg font-bold text-slate-900 tracking-tight group-hover/item:text-indigo-600 transition-colors leading-snug">{section.title}</h5>
                  </div>
                  <div className="flex items-center gap-6">
                    {completions.includes(section.id) && (
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                    {isEnrolled || isTeacher ? (
                      <Link 
                        to={`/course/${course.id}/module/${section.id}`}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
                      >
                        <MonitorPlay className="w-4 h-4" /> Start Module
                      </Link>
                    ) : (
                      <div className="bg-slate-50 text-slate-300 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-not-allowed border border-slate-100">
                        <Lock className="w-4 h-4" /> Locked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
