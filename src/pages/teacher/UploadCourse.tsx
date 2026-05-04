import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, HelpCircle, FileText, Trash2, AlignLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';

interface TeacherProfile {
  id: string;
  title: string;
}

interface Section {
  id: string;
  title: string;
  content: string;
  editMode?: 'visual' | 'markdown';
  pptFile?: File | null;
  slides_url?: string;
  isUploading?: boolean;
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

import TurndownService from 'turndown';
import showdown from 'showdown';
import { supabase } from '../../lib/supabase';

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

export default function UploadCourse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [category, setCategory] = useState('Technology');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [sections, setSections] = useState<Section[]>([{ id: crypto.randomUUID(), title: '', content: '', editMode: 'markdown' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('id, title')
        .eq('teacher_id', user.id);
      
      if (!error && data) {
        setProfiles(data);
        if (data.length > 0) setSelectedProfileId(data[0].id);
      }
    };
    fetchProfiles();
  }, [user]);

  const addSection = () => {
    setSections([...sections, { id: crypto.randomUUID(), title: '', content: '', editMode: 'markdown' }]);
  };

  const removeSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== id));
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
    if (!user) return;
    if (!selectedProfileId) {
      setError('You must create a subject identity before publishing a curriculum.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
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

      // 2. Create Course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          profile_id: selectedProfileId,
          teacher_id: user.id,
          title: courseTitle,
          description: courseDescription,
          level: level,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // 3. Create Modules
      const modulesToInsert = sectionsWithSlides.map((s, index) => ({
        course_id: courseData.id,
        title: s.title,
        content: s.content,
        slides_url: s.slides_url,
        order_index: index
      }));

      const { error: modulesError } = await supabase
        .from('modules')
        .insert(modulesToInsert);

      if (modulesError) throw modulesError;

      navigate('/teacher/my-courses');
    } catch (err: any) {
      console.error('Failed to upload course:', err);
      // Detailed error message for debugging RLS or Schema issues
      const msg = err.code === '42501' 
        ? "RLS Policy Violation: Ensure you have granted INSERT permissions on 'courses' and 'modules' tables for authenticated users."
        : err.message || 'Failed to deploy course curriculum.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 px-4 sm:px-6 animate-in fade-in duration-700 font-sans pb-20">
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Curriculum Architect</h1>
        <p className="text-slate-500 text-sm font-medium">Design and deploy multi-modular learning experiences with rich content.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl text-left">
          <p className="text-red-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Architectural Error
          </p>
          <p className="text-red-600 text-sm mt-1 font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-10">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 text-left">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Global Course Title</label>
              <input 
                required
                type="text" 
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-xl text-slate-900 placeholder:text-slate-300" 
                placeholder="The Ultimate Masterclass..." 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Course Description</label>
              <textarea 
                required
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                rows={3}
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-600 placeholder:text-slate-300" 
                placeholder="What will students achieve by the end of this journey?" 
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between px-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">{sections.length}</div>
                Course Modules
              </h3>
              <button 
                type="button"
                onClick={addSection}
                className="bg-indigo-50 text-indigo-600 font-bold text-[11px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl transition-all active:scale-95"
              >
                + Add Section
              </button>
            </div>

            <div className="space-y-6">
              {sections.map((section, index) => (
                <div key={section.id} className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 text-left relative group hover:border-indigo-200 transition-all">
                  <div className="absolute -left-3 top-8 bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shadow-xl group-hover:bg-indigo-600 transition-colors">
                    {index + 1}
                  </div>
                  
                  {sections.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeSection(section.id)}
                      className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" /> Section Title
                        </label>
                        <input 
                          required
                          type="text" 
                          value={section.title}
                          onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                          className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                          placeholder="Module Focus..." 
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <UploadCloud className="w-3.5 h-3.5 text-indigo-500" /> Digital Slides (PPT/PPTX)
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
                          <div className={`w-full px-5 py-3 rounded-2xl border border-dashed transition-all flex items-center gap-3 ${section.pptFile ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50 group-hover/upload:border-indigo-300 group-hover/upload:bg-indigo-50/30'}`}>
                            <div className={`p-2 rounded-xl ${section.pptFile ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              <UploadCloud className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-xs font-bold truncate ${section.pptFile ? 'text-green-700' : 'text-slate-400'}`}>
                              {section.pptFile ? section.pptFile.name : 'Choose file...'}
                            </span>
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
                          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
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
                            placeholder="Elaborate on the module concepts with rich text..."
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
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8 text-left sticky top-8">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3">Infrastructure</h3>
            
            <div className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Subject Identity</label>
                <select 
                  required
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none appearance-none font-bold text-indigo-600 text-sm tracking-tight transition-all focus:bg-white focus:border-indigo-500"
                >
                  <option value="" disabled>Select Subject...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Segment</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none appearance-none font-bold text-slate-700 text-sm tracking-tight transition-all focus:bg-white focus:border-indigo-500"
                >
                  <option>Technology</option>
                  <option>Humanities</option>
                  <option>Commerce</option>
                  <option>Arts</option>
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Difficulty Level</label>
                <select 
                  value={level}
                  onChange={(e) => setLevel(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 outline-none appearance-none font-bold text-slate-700 text-sm tracking-tight transition-all focus:bg-white focus:border-indigo-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              disabled={profiles.length === 0 || isSubmitting}
              className="w-full bg-indigo-600 text-white rounded-2xl py-4 px-6 font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 hover:shadow-xl hover:shadow-indigo-500/20 hover:bg-slate-900 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Deploy Course
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
