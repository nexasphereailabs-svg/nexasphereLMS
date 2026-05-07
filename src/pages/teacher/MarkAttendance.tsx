import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  Loader2,
  Save,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
  id: string;
  email: string;
  full_name: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent';
  notes?: string;
}

export default function MarkAttendance() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId, date]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch enrolled students
      // We need to join enrollments with our users table equivalent
      // Since the user provided a 'users' table, I'll use it
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          student_id
        `)
        .eq('course_id', courseId);

      if (enrollmentError) throw enrollmentError;

      const studentIds = enrollmentData.map(e => e.student_id);
      
      if (studentIds.length > 0) {
        const { data: studentData, error: studentError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', studentIds);

        if (studentError) throw studentError;
        setStudents(studentData || []);

        // Fetch existing attendance for this date
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('course_attendance')
          .select('*')
          .eq('course_id', courseId)
          .eq('attendance_date', date);

        if (attendanceError) throw attendanceError;

        const initialAttendance: Record<string, AttendanceRecord> = {};
        
        // Initialize all students as absent if no records exist
        studentData?.forEach(student => {
          const existing = attendanceData?.find(a => a.student_id === student.id);
          initialAttendance[student.id] = {
            student_id: student.id,
            status: existing ? (existing.status as 'present' | 'absent') : 'absent',
            notes: existing ? existing.notes : ''
          };
        });
        
        setAttendance(initialAttendance);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (studentId: string, status: 'present' | 'absent') => {
    // Update local state first for instant feedback
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));

    // Auto-save to database
    if (!user || !courseId) return;

    try {
      const { error } = await supabase
        .from('course_attendance')
        .upsert({
          course_id: courseId,
          student_id: studentId,
          attendance_date: date,
          status: status,
          notes: attendance[studentId]?.notes || '',
          marked_by: user.id
        }, { onConflict: 'course_id, student_id, attendance_date' });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error auto-saving attendance:', err);
      setMessage({ type: 'error', text: 'Failed to auto-save attendance.' });
    }
  };

  const saveAttendance = async () => {
    if (!user || !courseId) return;

    try {
      setSaving(true);
      setMessage(null);

      const records = Object.values(attendance).map(record => ({
        course_id: courseId,
        student_id: record.student_id,
        attendance_date: date,
        status: record.status,
        notes: record.notes,
        marked_by: user.id
      }));

      const { error } = await supabase
        .from('course_attendance')
        .upsert(records, { onConflict: 'course_id, student_id, attendance_date' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Attendance saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center gap-4">
        <Link 
          to="/teacher/my-courses" 
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Record Attendance</h1>
          <p className="text-slate-500 text-sm">{course?.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <Calendar className="w-5 h-5" />
              </div>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-bold text-slate-900 focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-lg">
              <Users className="w-4 h-4" />
              {students.length} Students Enrolled
            </div>
          </div>

          <div className="space-y-4">
            {students.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p>No students enrolled in this course yet.</p>
              </div>
            ) : (
              students.map((student) => (
                <div 
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all gap-4"
                >
                  <Link to={`/teacher/attendance/${courseId}/student/${student.id}`} className="hover:translate-x-1 transition-transform group">
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{student.full_name}</h3>
                    <p className="text-xs text-slate-500">{student.email}</p>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(student.id, 'present')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                        attendance[student.id]?.status === 'present'
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                          : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-200 hover:text-emerald-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Present
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                        attendance[student.id]?.status === 'absent'
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-100'
                          : 'bg-white text-slate-400 border border-slate-200 hover:border-rose-200 hover:text-rose-600'
                      }`}
                    >
                      <XCircle className="w-4 h-4" /> Absent
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-slate-200">
            <h3 className="font-bold text-lg">Daily Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Present Students</span>
                <span className="font-bold text-emerald-400">
                  {Object.values(attendance).filter(a => a.status === 'present').length}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Absent Students</span>
                <span className="font-bold text-rose-400">
                  {Object.values(attendance).filter(a => a.status === 'absent').length}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
                <span className="text-sm font-bold">Total</span>
                <span className="font-bold text-xl">{students.length}</span>
              </div>
            </div>

            <Link
              to={`/teacher/attendance-report/${courseId}`}
              className="w-full bg-indigo-600 hover:bg-indigo-500 transition-all py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95"
            >
              View Monthly Report
            </Link>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-2xl border flex items-center gap-3 font-medium text-sm ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}
              >
                {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
