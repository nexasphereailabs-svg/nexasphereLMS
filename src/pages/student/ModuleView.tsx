import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';

interface Section {
  id: string;
  title: string;
  content: string;
  order_index: number;
  slides_url?: string;
}

interface Course {
  id: string;
  title: string;
  modules?: Section[];
}

export default function ModuleView() {
  const { courseId, moduleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);
  const [markingProgress, setMarkingProgress] = useState(false);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Course and its modules
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, modules (*)')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        if (courseData.modules) {
          courseData.modules.sort((a: any, b: any) => a.order_index - b.order_index);
          const foundSection = courseData.modules.find((s: any) => s.id === moduleId);
          setCourse(courseData);
          setCurrentSection(foundSection);
        }

        // 2. Fetch Completion Progress
        if (user) {
          const { data: progress } = await supabase
            .from('module_progress')
            .select('*')
            .eq('module_id', moduleId)
            .eq('student_id', user.id)
            .single();
          
          setIsCompleted(!!progress);

          // 3. Fetch count of all completed modules in this course
          const { count } = await supabase
            .from('module_progress')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId)
            .eq('student_id', user.id);
          
          setCompletionCount(count || 0);
        }
      } catch (err) {
        console.error('Error fetching module:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [courseId, moduleId, user]);

  const toggleCompletion = async () => {
    if (!user || !moduleId) return;

    try {
      setMarkingProgress(true);
      if (isCompleted) {
        await supabase
          .from('module_progress')
          .delete()
          .eq('module_id', moduleId)
          .eq('student_id', user.id);
        setIsCompleted(false);
        setCompletionCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('module_progress')
          .insert({
            student_id: user.id,
            course_id: courseId,
            module_id: moduleId,
            is_completed: true
          });
        setIsCompleted(true);
        setCompletionCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    } finally {
      setMarkingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin opacity-20" />
      </div>
    );
  }

  if (!course || !currentSection) {
    return (
      <div className="flex flex-col items-center justify-center py-20 font-mono italic text-gray-400">
        <p>Resource not found or session expired.</p>
        <Link to="/student/dashboard" className="mt-4 text-indigo-600 underline">Back to Dashboard</Link>
      </div>
    );
  }

  const sections = course.modules || [];
  const currentIndex = sections.findIndex(s => s.id === moduleId);
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-left font-sans pb-24 px-4 md:px-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Exit Module
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={toggleCompletion}
            disabled={markingProgress}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest border ${
              isCompleted 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' 
                : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-600 hover:text-indigo-600'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-500' : 'text-slate-300 group-hover:text-indigo-500'}`} />
            {isCompleted ? 'Marked Completed' : 'Mark as Complete'}
          </button>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl max-w-[200px] md:max-w-none">
             <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate" title={course.title}>Path: {course.title}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 p-8 md:p-14 text-white relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-md border border-indigo-400/20">Module {currentIndex + 1} of {sections.length}</span>
             </div>
             <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">{currentSection.title}</h1>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full translate-x-24 -translate-y-24 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
        </div>

        <div className="p-6 md:p-14 space-y-12">
          <div className="module-content w-full overflow-x-hidden space-y-10 md:space-y-16">
            {currentSection.slides_url && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presentation Deck</span>
                </div>
                <div className="aspect-video w-full bg-slate-950 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 relative group/slides">
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentSection.slides_url)}&embedded=true`}
                    className="w-full h-full border-none"
                    title="Presentation Viewer"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover/slides:opacity-100 transition-opacity">
                    <a 
                      href={currentSection.slides_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-900/80 backdrop-blur-md text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-all border border-white/10"
                    >
                      Open Fullscreen
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="markdown-body text-slate-700">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]} 
                rehypePlugins={[rehypeRaw]}
              >
                {currentSection.content}
              </ReactMarkdown>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-100 flex flex-col sm:flex-row gap-6 justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {prevSection ? (
                <Link 
                  to={`/course/${courseId}/module/${prevSection.id}`}
                  className="flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all font-bold text-[10px] uppercase tracking-widest text-slate-600 group active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Previous
                </Link>
              ) : (
                <div className="px-6 py-3.5 bg-transparent border border-slate-100 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-300 cursor-not-allowed text-center">
                  Start of Pathway
                </div>
              )}

              {nextSection ? (
                <Link 
                  to={`/course/${courseId}/module/${nextSection.id}`}
                  className="flex items-center justify-center gap-3 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest group shadow-lg shadow-indigo-100 active:scale-95"
                >
                  Next Module <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <button 
                  onClick={async () => {
                    if (!isCompleted) await toggleCompletion();
                    navigate(`/course/${courseId}`);
                  }}
                  disabled={markingProgress}
                  className={`flex items-center justify-center gap-3 px-8 py-3.5 text-white rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 ${
                    isCompleted ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' : 'bg-slate-900 hover:bg-indigo-600 shadow-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> {isCompleted ? 'Path Finished' : 'Finish Module'}
                </button>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
               <div className="flex items-center gap-2 group">
                  <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                     <div 
                       className="bg-indigo-600 h-full transition-all duration-1000 ease-out" 
                       style={{ width: `${(completionCount / sections.length) * 100}%` }} 
                     />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {Math.round((completionCount / sections.length) * 100)}% Complete
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 opacity-40 hover:opacity-100 transition-opacity">
         <div className="bg-white p-6 rounded-3xl border border-slate-200 border-dashed text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
           Module Resources Coming Soon
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-200 border-dashed text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
           Community Discussion Coming Soon
         </div>
      </div>
    </div>
  );
}
