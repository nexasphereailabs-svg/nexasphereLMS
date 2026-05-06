import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ChevronLeft, 
  Loader2, 
  Calendar as CalendarIcon,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Minus
} from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface AttendanceRecord {
  student_id: string;
  attendance_date: string;
  status: string;
}

export default function AttendanceReport() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (courseId) {
      fetchReportData();
    }
  }, [courseId, selectedMonth, selectedYear]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Course
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      setCourse(courseData);

      // 2. Fetch Students
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId);
      
      const studentIds = enrollmentData?.map(e => e.student_id) || [];
      
      if (studentIds.length > 0) {
        const { data: studentData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', studentIds);
        setStudents(studentData || []);

        // 3. Fetch Attendance for the month
        const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
        const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString();

        const { data: attendanceData } = await supabase
          .from('course_attendance')
          .select('*')
          .eq('course_id', courseId)
          .gte('attendance_date', startDate.split('T')[0])
          .lte('attendance_date', endDate.split('T')[0]);
        
        setRecords(attendanceData || []);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getStatus = (studentId: string, day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = records.find(r => r.student_id === studentId && r.attendance_date === dateStr);
    
    if (record) return record.status;
    
    return undefined;
  };

  const renderStatusIcon = (status?: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'absent': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Minus className="w-4 h-4 text-slate-200" />;
    }
  };

  if (loading) return <div className="py-40 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" /></div>;

  // Calculate unique days where attendance was taken for this course in this month
  const attendanceSessions = Array.from(new Set(records.map(r => r.attendance_date))).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 font-sans pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link 
            to={`/teacher/attendance/${courseId}`} 
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Ledger</h1>
            <p className="text-slate-500 text-sm">{course?.title} • {months[selectedMonth]} {selectedYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 text-sm font-bold text-slate-700 bg-transparent focus:outline-none"
            >
              {months.map((month, i) => (
                <option key={month} value={i}>{month}</option>
              ))}
            </select>
            <div className="w-px bg-slate-100 mx-1" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 text-sm font-bold text-slate-700 bg-transparent focus:outline-none"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-6 font-bold text-xs uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-50 z-20 w-64 border-r border-slate-100">
                  DAYS
                </th>
                {daysArray.map(day => (
                  <th key={day} className="p-3 text-center font-bold text-[10px] text-slate-400 border-r border-slate-100 min-w-[40px]">
                    {day}
                  </th>
                ))}
                <th className="p-3 text-center font-bold text-[10px] text-slate-400 min-w-[60px]">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const studentRecords = records.filter(r => r.student_id === student.id);
                const totalPresence = studentRecords.filter(r => r.status === 'present').length;
                const percentage = attendanceSessions > 0 ? Math.round((totalPresence / attendanceSessions) * 100) : 0;

                return (
                  <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-100">
                      <Link to={`/teacher/attendance/${courseId}/student/${student.id}`} className="block hover:translate-x-1 transition-transform">
                        <div className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{student.full_name}</div>
                        <div className="text-[10px] font-medium text-slate-400 truncate tracking-tight">{student.email}</div>
                      </Link>
                    </td>
                    {daysArray.map(day => (
                      <td key={day} className="p-3 text-center border-r border-slate-50">
                        <div className="flex justify-center">
                          {renderStatusIcon(getStatus(student.id, day))}
                        </div>
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        percentage > 85 ? 'text-emerald-600 bg-emerald-50' : 
                        percentage > 60 ? 'text-amber-600 bg-amber-50' : 
                        'text-rose-600 bg-rose-50'
                      }`}>
                        {percentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Present
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <XCircle className="w-3 h-3 text-rose-500" /> Absent
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Minus className="w-3 h-3 text-slate-200" /> Not Recorded
          </div>
        </div>
      </div>
    </div>
  );
}
