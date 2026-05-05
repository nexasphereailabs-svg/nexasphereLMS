import { supabase } from './supabase';

/**
 * Marks a student as present for a specific course for today.
 */
export async function trackCourseAttendance(studentId: string, courseId: string) {
  try {
    const today = new Date().toLocaleDateString('en-CA');

    // Check if already marked to avoid redundant writes
    const { data: existing } = await supabase
      .from('course_attendance')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .eq('attendance_date', today)
      .single();

    if (existing) return { success: true, alreadyMarked: true };

    const { error } = await supabase
      .from('course_attendance')
      .upsert({
        course_id: courseId,
        student_id: studentId,
        attendance_date: today,
        status: 'present',
        notes: 'Manually marked by student',
        marked_by: studentId
      }, { 
        onConflict: 'course_id, student_id, attendance_date'
      });

    if (error) throw error;
    return { success: true, alreadyMarked: false };
  } catch (err) {
    console.error('Attendance track error:', err);
    return { success: false, error: err };
  }
}

export async function checkTodayAttendance(studentId: string, courseId: string) {
  const today = new Date().toLocaleDateString('en-CA');
  const { data } = await supabase
    .from('course_attendance')
    .select('status')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .eq('attendance_date', today)
    .single();
  return data?.status === 'present';
}

