import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar as CalendarIcon,
  BookOpen
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
  course_id: string;
  courses: {
    title: string;
  };
}

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('course_attendance')
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq('student_id', user?.id)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching student attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present
          </span>
        );
      case 'absent':
        return (
          <span className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-rose-100">
            <XCircle className="w-3.5 h-3.5" /> Absent
          </span>
        );
      default:
        return <span className="px-4 py-1.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-100">{status}</span>;
    }
  };

  if (loading) return <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 font-sans pb-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Record</h1>
        <p className="text-slate-500 text-sm">Your comprehensive history of course participation and presence.</p>
      </div>

      {records.length === 0 ? (
        <div className="py-24 bg-slate-50/50 border border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400">
          <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold text-xs uppercase tracking-widest">No Attendance Data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {records.map((record) => (
            <div 
              key={record.id} 
              className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 line-clamp-1">{record.courses?.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(record.attendance_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto flex justify-end">
                {renderStatusBadge(record.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
