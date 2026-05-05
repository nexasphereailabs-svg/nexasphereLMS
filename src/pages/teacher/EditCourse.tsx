import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, HelpCircle, FileText, Trash2, AlignLeft, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import { supabase } from '../../lib/supabase';
import { DeleteConfirmationModal } from '../../components/shared/DeleteConfirmationModal';
import { deleteFilesFromUrls, getStoragePathFromUrl } from '../../lib/storage';
import TurndownService from 'turndown';
import showdown from 'showdown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**'
});

// Explicitly handle elements to ensure classes like ql-size-large and ql-align-center are preserved
turndownService.addRule('preserve-formatted-elements', {
  filter: (node) => {
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const hasAttributes = !!(element.classList.length > 0 || element.getAttribute('style'));
    const isSpecialTag = ['span', 'br'].includes(tag);
    return hasAttributes || isSpecialTag;
  },
  replacement: (content, node) => {
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const className = element.getAttribute('class');
    const style = element.getAttribute('style');
    
    if (className === 'ql-cursor') return ''; 
    if (tag === 'br') return '<br />';
    
    if (className || style) {
      return `<${tag}${className ? ` class="${className}"` : ''}${style ? ` style="${style}"` : ''}>${content}</${tag}>`;
    }
    
    return content;
  }
});

const converter = new showdown.Converter({
  tables: true,
  strikethrough: true,
  tasklists: true,
  simpleLineBreaks: false,
  openLinksInNewWindow: true,
  backslashEscapesHTML: false,
  metadata: true,
  ghCodeBlocks: true,
  smoothLivePreview: true,
  smartIndentationFix: true
});

interface Section {
  id: string;
  title: string;
  content: string;
  editMode?: 'visual' | 'markdown';
  pptFile?: File | null;
  slides_url?: string;
  isUploading?: boolean;
}

interface TeacherProfile {
  id: string;
  title: string;
}

const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, false] }],
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
  ],
};

const QUILL_FORMATS = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'align'
];

export default function EditCourse() {
  const { user } = useAuth();
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [level, setLevel] = useState('beginner');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isDeletingModule, setIsDeletingModule] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !courseId) return;
      try {
        // Only show loading screen if we don't have data yet
        if (!courseTitle) {
          setLoading(true);
        }
        const { data: profileData } = await supabase
          .from('teacher_profiles')
          .select('id, title')
          .eq('teacher_id', user.id);
        
        setProfiles(profileData || []);

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*, modules (*)')
          .eq('id', courseId)
          .eq('teacher_id', user.id)
          .single();

        if (courseError) throw courseError;

        if (courseData) {
          setCourseTitle(courseData.title);
          setCourseDescription(courseData.description || '');
          setSelectedProfileId(courseData.profile_id);
          setLevel(courseData.level || 'beginner');
          
          if (courseData.modules) {
            const sortedModules = [...courseData.modules].sort((a, b) => a.order_index - b.order_index);
            setSections(sortedModules.map(m => ({
              id: m.id,
              title: m.title,
              content: m.content || '',
              slides_url: m.slides_url || '',
              editMode: 'markdown' // Default to markdown as requested
            })));
          }
        }
      } catch (err) {
        console.error('Error:', err);
        navigate('/teacher/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, user?.id, navigate]);

  const addSection = () => {
    setSections([...sections, { id: `local_${crypto.randomUUID()}`, title: '', content: '', editMode: 'markdown' }]);
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    const isStored = !moduleToDelete.startsWith('local_');
    
    try {
      if (isStored) {
        setIsDeletingModule(true);
        
        // Fetch module to get slides_url
        const { data: modData } = await supabase
          .from('modules')
          .select('slides_url')
          .eq('id', moduleToDelete)
          .single();

        if (modData?.slides_url) {
          await deleteFilesFromUrls([modData.slides_url], 'slides');
        }

        const { error } = await supabase
          .from('modules')
          .delete()
          .eq('id', moduleToDelete);
        if (error) throw error;
      }
      
      setSections(sections.filter(s => s.id !== moduleToDelete));
      setModuleToDelete(null);
    } catch (err: any) {
      alert('DB ERROR: ' + err.message);
    } finally {
      setIsDeletingModule(false);
    }
  };

  const confirmDeleteCourse = async () => {
    if (!user || !courseId) return;
    try {
      setIsDeletingCourse(true);

      // 0. Get modules to get slide URLs for storage cleanup
      const { data: modulesData } = await supabase
        .from('modules')
        .select('slides_url')
        .eq('course_id', courseId);
      
      if (modulesData) {
        const urls = modulesData.map(m => m.slides_url).filter(Boolean);
        if (urls.length > 0) {
          await deleteFilesFromUrls(urls, 'slides');
        }
      }

      // 1. Delete course attendance
      await supabase.from('course_attendance').delete().eq('course_id', courseId);
      // 2. Delete progress
      await supabase.from('module_progress').delete().eq('course_id', courseId);
      // 3. Delete enrollments
      await supabase.from('enrollments').delete().eq('course_id', courseId);
      // 4. Delete modules
      const { error: modErr } = await supabase.from('modules').delete().eq('course_id', courseId);
      if (modErr) throw modErr;

      // 4. Delete course
      const { error: courseErr } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId)
        .eq('teacher_id', user.id);
      
      if (courseErr) throw courseErr;
      navigate('/teacher/my-courses');
    } catch (err: any) {
      console.error('Purge error:', err);
      alert('PURGE FAILED: ' + err.message);
    } finally {
      setIsDeletingCourse(false);
      setCourseToDelete(false);
    }
  };

  const updateSection = (id: string, field: keyof Section, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleMode = (id: string) => {
    setSections(sections.map(s => {
      if (s.id === id) {
        const newMode = s.editMode === 'markdown' ? 'visual' : 'markdown';
        const newContent = newMode === 'visual' 
          ? converter.makeHtml(s.content) 
          : turndownService.turndown(s.content);
        return { ...s, editMode: newMode, content: newContent };
      }
      return s;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !user || !courseId) return;

    try {
      setIsSubmitting(true);
      
      // 1. Upload PPTs to Storage if they exist
      const sectionsWithSlides = await Promise.all(sections.map(async (section) => {
        let slides_url = section.slides_url;
        
        if (section.pptFile) {
          const fileExt = section.pptFile.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('slides')
            .upload(filePath, section.pptFile);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('slides')
            .getPublicUrl(filePath);
            
          slides_url = publicUrl;
        }
        
        return {
          ...section,
          slides_url,
          content: section.editMode === 'visual' ? turndownService.turndown(section.content) : section.content
        };
      }));

      const { error: courseError } = await supabase
        .from('courses')
        .update({
          title: courseTitle,
          description: courseDescription,
          profile_id: selectedProfileId,
          level,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId)
        .eq('teacher_id', user.id);

      if (courseError) throw courseError;

      // STORAGE CLEANUP: Find modules being removed or whose slide URLs are changing
      const { data: existingModules } = await supabase
        .from('modules')
        .select('slides_url')
        .eq('course_id', courseId);
      
      if (existingModules) {
        const existingUrls = existingModules.map(m => m.slides_url).filter(Boolean);
        const newUrls = sectionsWithSlides.map(s => s.slides_url).filter(Boolean);
        const urlsToDelete = existingUrls.filter(url => !newUrls.includes(url));
        if (urlsToDelete.length > 0) {
          await deleteFilesFromUrls(urlsToDelete, 'slides');
        }
      }

      const { error: deleteError } = await supabase.from('modules').delete().eq('course_id', courseId);
      if (deleteError) throw deleteError;

      const modulesToInsert = sectionsWithSlides.map((s, index) => ({
        course_id: courseId,
        title: s.title,
        content: s.content,
        slides_url: s.slides_url,
        order_index: index
      }));

      const { error: modulesError } = await supabase
        .from('modules')
        .insert(modulesToInsert);

      if (modulesError) throw modulesError;

      navigate('/teacher/dashboard');
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 px-4 sm:px-6 animate-in fade-in duration-700 font-sans pb-24">
      <div className="flex items-center gap-6">
        <Link to="/teacher/my-courses" className="p-3 hover:bg-slate-100 rounded-2xl transition-colors shrink-0 group">
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
        </Link>
        <div className="text-left space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Curriculum</h1>
          <p className="text-slate-500 text-sm font-medium">Update your expert track architecture and module payload.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Curriculum Title</label>
              <input 
                required
                type="text" 
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xl text-slate-900" 
                placeholder="The Ultimate Masterclass..." 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Curriculum Level</label>
              <select 
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold text-slate-700 appearance-none focus:bg-white focus:border-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Curriculum Summary</label>
            <textarea 
              required
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              rows={3}
              className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-600 leading-relaxed" 
              placeholder="What will students achieve by the end of this journey?" 
            />
          </div>

          <div className="space-y-3 font-sans">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Lead Subject Identity</label>
            <select 
              required
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 outline-none appearance-none font-bold text-indigo-600 text-sm focus:bg-white focus:border-indigo-500"
            >
              <option value="" disabled>Select Subject Persona...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-8 text-left">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">{sections.length}</div>
              Modular Structure
            </h2>
            <button 
              type="button"
              onClick={addSection}
              className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Module
            </button>
          </div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={section.id} className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 relative group hover:border-indigo-200 transition-all">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 transition-colors">{index + 1}</span>
                    {section.title && <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest truncate max-w-[200px]">{section.title}</span>}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setModuleToDelete(section.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Remove Module"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-500" /> Module Heading
                      </label>
                      <input 
                        required
                        type="text" 
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all text-lg font-bold text-slate-900" 
                        placeholder="e.g., Foundations of Modern UX Architecture" 
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <UploadCloud className="w-3.5 h-3.5 text-indigo-500" /> Presentation Slides (PPT)
                      </label>
                      <div className="relative group/upload">
                        <input 
                          type="file" 
                          accept=".ppt,.pptx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) updateSection(section.id, 'pptFile', file);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`w-full px-5 py-3.5 rounded-2xl border border-transparent transition-all flex items-center justify-between ${section.pptFile || section.slides_url ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400 group-hover/upload:bg-slate-100'}`}>
                          <div className="flex items-center gap-3 truncate">
                            <UploadCloud className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-bold truncate">
                              {section.pptFile ? section.pptFile.name : (section.slides_url ? 'Presentation Linked ✓' : 'Add Presentation...')}
                            </span>
                          </div>
                          {section.slides_url && !section.pptFile && (
                            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 bg-green-200 text-green-800 rounded-lg">Stored</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Educational Content
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleMode(section.id)}
                        className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        {section.editMode === 'visual' ? 'Switch to Markdown' : 'Switch to Visual'}
                      </button>
                    </div>
                    <div className="rounded-[2rem] overflow-hidden border border-slate-200 transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
                      {section.editMode === 'markdown' ? (
                        <div className="relative group/editor">
                          <textarea
                            value={section.content}
                            onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                            className="w-full min-h-[400px] p-8 md:p-12 bg-slate-900 text-slate-100 font-mono text-sm leading-relaxed outline-none resize-none"
                            placeholder="# Type your markdown here..."
                          />
                          <div className="absolute top-6 right-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-40 select-none">Markdown Engine</div>
                        </div>
                      ) : (
                        <ReactQuill 
                          theme="snow"
                          value={section.content}
                          onChange={(content) => updateSection(section.id, 'content', content)}
                          modules={QUILL_MODULES}
                          formats={QUILL_FORMATS}
                          placeholder="Provide the core content or instructional materials with rich text..."
                          className="quill-editor bg-white min-h-[400px]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sticky bottom-8 bg-white/90 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] border border-slate-200 shadow-2xl z-50 transition-all hover:shadow-indigo-500/10">
          <Link 
            to="/teacher/my-courses"
            className="w-full sm:flex-1 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all text-center"
          >
            Discard Changes
          </Link>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:flex-[2] bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Synchronizing Track...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" /> 
                Finalize Curriculum Track
              </>
            )}
          </button>
        </div>
      </form>

      <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-red-100 space-y-8 text-left">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-slate-900 font-bold tracking-tight">Terminate Curriculum</h3>
            <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest leading-none">Full Data Purge</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-2xl opacity-80">
          Warning: This action will permanently erase this course from the database, including all content modules, student enrollments, and progress logs. This action is irreversible.
        </p>
        <button 
          onClick={() => setCourseToDelete(true)}
          className="bg-white border border-red-200 text-red-600 px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-95"
        >
          Terminate Curriculum Track
        </button>
      </div>

      <DeleteConfirmationModal
        isOpen={!!moduleToDelete}
        onClose={() => setModuleToDelete(null)}
        onConfirm={confirmDeleteModule}
        isLoading={isDeletingModule}
        title="Remove Module?"
        description="Permanently remove this unit from your curriculum index? This data will be purged from the server."
      />

      <DeleteConfirmationModal
        isOpen={courseToDelete}
        onClose={() => setCourseToDelete(false)}
        onConfirm={confirmDeleteCourse}
        isLoading={isDeletingCourse}
        title="Terminate Curriculum?"
        description="Wipe this entire course, modules, enrollments, and progress? There is no recovery once the purge begins."
      />
    </div>
  );
}
