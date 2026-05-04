import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Star, Loader2 } from 'lucide-react';
import CategoryIcon from '../../components/shared/CategoryIcon';
import { supabase } from '../../lib/supabase';

interface TeacherProfile {
  id: string;
  title: string;
  category: string;
  description: string;
}

export default function BrowseProfiles() {
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('teacher_profiles')
          .select('*');
        
        if (!error && data) {
          setProfiles(data);
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const filteredProfiles = profiles.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-left">Explore Subjects</h1>
        <p className="text-slate-500 text-sm text-left">Connect with verified experts across diverse academic and professional fields.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-sm shadow-sm placeholder:text-slate-400" 
            placeholder="Search by specialty, category or name..." 
          />
        </div>
        <button className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center gap-2.5 font-semibold text-sm hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
          <Filter className="w-4 h-4 text-slate-400" /> Filter
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin opacity-20" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="py-24 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
          <p className="text-sm font-medium text-slate-400">No subjects found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProfiles.map((teacher) => (
            <Link key={teacher.id} to={`/profile/${teacher.id}`} className="flex flex-col bg-white border border-slate-200/60 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300 group overflow-hidden">
              <div className="p-7 space-y-6 flex-1 flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-100">
                    <CategoryIcon category={teacher.category} title={teacher.title} className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors truncate">{teacher.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                        {teacher.category}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 text-left">
                   {teacher.description}
                </p>

                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-amber-50 p-1 rounded-md">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Expert Verified</span>
                  </div>
                  <div className="text-indigo-600 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                    Profile &rarr;
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
