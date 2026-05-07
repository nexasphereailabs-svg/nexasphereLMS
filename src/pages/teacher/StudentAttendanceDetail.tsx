import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ChevronLeft, 
  Loader2, 
  User, 
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  BookOpen,
  PieChart
} from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
}

export default function StudentAttendanceDetail() {
  const { courseId, studentId } = useParams<{ courseId: string; studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && studentId) {
      fetchStudentDetail();
    }
  }, [courseId, studentId]);

  const fetchStudentDetail = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Student Info
      const { data: studentData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', studentId)
        .single();
      setStudent(studentData);

      // 2. Fetch Course Info
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, created_at')
        .eq('id', courseId)
        .single();
      setCourse(courseData);

      // 3. Fetch Attendance History for this course
      const { data: attendanceData } = await supabase
        .from('course_attendance')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .order('attendance_date', { ascending: false });
      
      setRecords(attendanceData || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats based on days since course creation
  const calculateStats = () => {
    if (!course?.created_at) return { present: 0, absent: 0, total: 0, percentage: 0 };
    
    const creationDate = new Date(course.created_at);
    creationDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // total days from creation to today
    const diffTime = Math.max(0, today.getTime() - creationDate.getTime());
    const totalDaysSinceCreation = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const presentCount = records.filter(r => r.status === 'present').length;
    // Any day that doesn't have a 'present' record is effectively an absence since creation
    const absentCount = Math.max(0, totalDaysSinceCreation - presentCount);
    
    return {
      present: presentCount,
      absent: absentCount,
      total: totalDaysSinceCreation,
      percentage: totalDaysSinceCreation > 0 
        ? Math.round((presentCount / totalDaysSinceCreation) * 100) 
        : 0
    };
  };

  const stats = calculateStats();

  if (loading) return <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center gap-4">
        <Link 
          to={`/teacher/attendance-report/${courseId}`} 
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student History</h1>
          <p className="text-slate-500 text-sm">{student?.full_name} • {course?.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
            <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
              <User className="w-10 h-10" />
            </div>
            <h2 className="font-bold text-lg text-slate-900">{student?.full_name}</h2>
            <p className="text-sm text-slate-500 mb-6">{student?.email}</p>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 p-3 rounded-2xl">
                <div className="text-emerald-600 font-bold text-lg">{stats.present}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700/50">Present</div>
              </div>
              <div className="bg-rose-50 p-3 rounded-2xl">
                <div className="text-rose-600 font-bold text-lg">{stats.absent}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-rose-700/50">Absent</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl shadow-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-800 rounded-lg">
                <PieChart className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-bold">Course Score</h3>
            </div>
            <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div 
                className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-1000"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <div className="flex justify-between items-end">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Attendance</span>
              <span className="text-2xl font-black">{stats.percentage}%</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-4">Detailed Log</h3>
          {records.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center text-slate-400">
              <p>No attendance records found for this student.</p>
            </div>
          ) : (
            records.map((record) => (
              <div 
                key={record.id} 
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {new Date(record.attendance_date).toLocaleDateString(undefined, { 
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
                {record.status === 'present' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                    <XCircle className="w-3.5 h-3.5" /> Absent
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
