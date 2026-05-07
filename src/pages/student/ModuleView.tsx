import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, BookOpen, Clock, Loader2, Presentation, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [slidesError, setSlidesError] = useState(false);

  useEffect(() => {
    // Reset slides state when moduleId changes
    setSlidesLoading(true);
    setSlidesError(false);

    // No fallback timer - keep loading until iframe onLoad fires
  }, [moduleId]);

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

  const markAsComplete = async () => {
    if (!user || !moduleId || isCompleted) return;

    try {
      setMarkingProgress(true);
      const { error } = await supabase
        .from('module_progress')
        .upsert({
          student_id: user.id,
          course_id: courseId,
          module_id: moduleId,
          is_completed: true
        }, { onConflict: 'student_id, module_id' });
      
      if (error) throw error;

      setIsCompleted(true);
      setCompletionCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to mark as complete:', err);
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
        <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors group w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Exit Module
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
               <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate max-w-[150px] md:max-w-none" title={course.title}>Path: {course.title}</span>
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

        <div className="px-2 py-8 md:p-14 space-y-12">
          <div className="module-content w-full overflow-x-hidden space-y-10 md:space-y-16">
            {currentSection.slides_url && (
              <div className="space-y-4">
                <div className="hidden md:flex items-center gap-3 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presentation Deck</span>
                </div>
                <div className="h-[400px] md:h-auto md:aspect-video w-full bg-slate-950 rounded-xl md:rounded-[2rem] overflow-auto md:overflow-hidden shadow-2xl border border-slate-200 relative group/slides">
                  <AnimatePresence>
                    {slidesLoading && (
                      <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 bg-slate-900 flex flex-col items-center justify-center space-y-6"
                      >
                        <div className="relative">
                          <motion.div 
                            animate={{ 
                              scale: [1, 1.2, 1],
                              opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{ 
                              duration: 3, 
                              repeat: Infinity, 
                              ease: "easeInOut" 
                            }}
                            className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl"
                          />
                          <div className="relative bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                             <Layers className="w-10 h-10 text-indigo-400 animate-pulse" />
                          </div>
                        </div>
                        
                        <div className="text-center space-y-4 px-6">
                           <div className="flex flex-col items-center justify-center gap-4">
                             <div className="flex items-center gap-3">
                               <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                               <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.4em]">Presentation Loading</span>
                             </div>
                             
                             <div className="flex gap-1.5 justify-center">
                               {[0, 1, 2, 3, 4].map((i) => (
                                 <motion.div
                                   key={i}
                                   animate={{ 
                                     scaleY: [1, 2, 1],
                                     opacity: [0.3, 1, 0.3]
                                   }}
                                   transition={{ 
                                     duration: 1, 
                                     repeat: Infinity, 
                                     delay: i * 0.15 
                                   }}
                                   className="w-1 h-3 bg-indigo-500/50 rounded-full"
                                 />
                               ))}
                             </div>

                             <div className="flex flex-col items-center gap-2 pt-2">
                               <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-medium opacity-70">
                                 Please refresh the page if the presentation does not load
                               </p>
                             </div>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <iframe 
                    key={currentSection.slides_url}
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentSection.slides_url)}&embedded=true`}
                    className={`w-full h-full border-none transition-opacity duration-1000 ${slidesLoading ? 'opacity-0' : 'opacity-100'}`}
                    title="Presentation Viewer"
                    onLoad={() => setSlidesLoading(false)}
                    onError={() => {
                      setSlidesLoading(false);
                      setSlidesError(true);
                    }}
                  />
                  {!slidesLoading && (
                    <div className="absolute top-4 left-4 z-10 pointer-events-none">
                      {/* Fullscreen button removed as requested */}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="prose prose-slate prose-indigo max-w-none px-1">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  // Ensure specific elements maintain design consistency
                  h1: ({node, ...props}) => <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-8 mt-12" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-6 mt-10" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xl font-bold tracking-tight text-slate-800 mb-4 mt-8" {...props} />,
                  p: ({node, ...props}) => <p className="text-base leading-relaxed text-slate-600 mb-6" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-600" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-slate-600" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-6 py-4 bg-indigo-50/50 rounded-r-2xl italic text-slate-700 my-8" {...props} />
                  ),
                  code: ({node, inline, ...props}: any) => (
                    inline 
                      ? <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-sm" {...props} />
                      : <code className="block bg-slate-900 text-slate-100 p-6 rounded-2xl font-mono text-sm overflow-x-auto my-6" {...props} />
                  ),
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-8 rounded-2xl border border-slate-200">
                      <table className="w-full border-collapse" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => <th className="bg-slate-50 p-4 font-bold text-slate-900 text-left border-b border-slate-200" {...props} />,
                  td: ({node, ...props}) => <td className="p-4 text-slate-600 border-b border-slate-100" {...props} />,
                }}
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
                <button 
                  onClick={async () => {
                    if (!isCompleted) await markAsComplete();
                    navigate(`/course/${courseId}/module/${nextSection.id}`);
                  }}
                  disabled={markingProgress}
                  className="flex items-center justify-center gap-3 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest group shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
                >
                  Next Module <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button 
                  onClick={async () => {
                    if (!isCompleted) await markAsComplete();
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

      <div className="max-w-xl mx-auto mt-8">
         <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-amber-900 border-dashed flex items-center justify-center gap-3">
           <Clock className="w-5 h-5 text-amber-500" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-left">
             please make sure that you have marked the attendance in the course
           </span>
         </div>
      </div>
    </div>
  );
}
