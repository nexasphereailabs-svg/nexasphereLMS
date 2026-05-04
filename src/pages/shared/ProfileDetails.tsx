import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, Star, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface TeacherProfile {
  id: string;
  title: string;
  category: string;
  description: string;
  teacher_id: string;
}

interface Course {
  id: string;
  profile_id: string;
  title: string;
  level: string;
}

export default function ProfileDetails() {
  const { profileId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileDetails = async () => {
      try {
        setLoading(true);
        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('teacher_profiles')
          .select('*')
          .eq('id', profileId)
          .single();
        
        if (profileError) throw profileError;
        setProfile(profileData);

        // 2. Fetch Courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('profile_id', profileId);
        
        if (coursesError) throw coursesError;
        setCourses(coursesData || []);
      } catch (err) {
        console.error('Error fetching profile details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileDetails();
  }, [profileId]);

  if (loading) {
    return (
      <div className="py-40 flex justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin opacity-20" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center font-mono opacity-50 uppercase tracking-widest text-xs italic">
        Subject data trace lost...
      </div>
    );
  }

  const isOwner = user?.id === profile.teacher_id;

  return (
    <div className="max-w-5xl mx-auto space-y-12 text-left font-sans pb-24 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Go Back
        </button>
        {isOwner && (
          <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Ownership Verified
          </span>
        )}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden p-8 md:p-12 flex flex-col md:flex-row gap-10 relative group transition-all hover:shadow-xl hover:shadow-indigo-500/5">
        <div className="w-32 h-32 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-2xl shadow-slate-200 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1">
          <CategoryIcon category={profile.category} title={profile.title} className="w-14 h-14 text-indigo-400" />
        </div>
        
        <div className="space-y-6 flex-1 text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
               <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-none">{profile.title}</h1>
            </div>
            <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md uppercase tracking-[0.2em] inline-block">{profile.category}</p>
          </div>
          
          <div className="space-y-3 max-w-2xl border-l-2 border-slate-100 pl-8 py-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Professional Narrative</h3>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
               {profile.description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Available Learning Paths
          </h2>
          <p className="text-sm text-slate-500 font-medium">Explore the specialized curriculum deployed by this instructor.</p>
        </div>

        {courses.length === 0 ? (
          <div className="py-24 bg-slate-50/50 border border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">No paths available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Link 
                key={course.id} 
                to={`/course/${course.id}`}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all group relative overflow-hidden text-left block"
              >
                <div className="space-y-5 relative z-10 text-left">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">{course.level}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                  <div className="flex items-center gap-2 pt-2 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                    Enter Pathway <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
