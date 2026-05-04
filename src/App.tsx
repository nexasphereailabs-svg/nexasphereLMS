/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Login from './pages/public/Login';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import CreateProfile from './pages/teacher/CreateProfile';
import EditProfile from './pages/teacher/EditProfile';
import MyProfiles from './pages/teacher/MyProfiles';
import MyCourses from './pages/teacher/MyCourses';
import EditCourse from './pages/teacher/EditCourse';
import UploadCourse from './pages/teacher/UploadCourse';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import BrowseProfiles from './pages/student/BrowseProfiles';
import ViewCourses from './pages/student/ViewCourses';
import ModuleView from './pages/student/ModuleView';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Shared Detail Pages
import ProfileDetails from './pages/shared/ProfileDetails';
import CourseDetails from './pages/shared/CourseDetails';
import { useAuth } from './context/AuthContext';

function HomeRedirect() {
  const { user } = useAuth();
  let redirectPath = '/student/dashboard';
  
  if (user?.role === 'teacher') redirectPath = '/teacher/dashboard';
  else if (user?.role === 'admin') redirectPath = '/admin/dashboard';
  
  return <Navigate to={redirectPath} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes with Shared Layout */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/" element={<HomeRedirect />} />
            
            {/* Teacher Routes - Strictly for Teachers */}
            <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/create-profile" element={<ProtectedRoute allowedRole="teacher"><CreateProfile /></ProtectedRoute>} />
            <Route path="/teacher/edit-profile/:profileId" element={<ProtectedRoute allowedRole="teacher"><EditProfile /></ProtectedRoute>} />
            <Route path="/teacher/my-profiles" element={<ProtectedRoute allowedRole="teacher"><MyProfiles /></ProtectedRoute>} />
            <Route path="/teacher/my-courses" element={<ProtectedRoute allowedRole="teacher"><MyCourses /></ProtectedRoute>} />
            <Route path="/teacher/edit-course/:courseId" element={<ProtectedRoute allowedRole="teacher"><EditCourse /></ProtectedRoute>} />
            <Route path="/teacher/upload-course" element={<ProtectedRoute allowedRole="teacher"><UploadCourse /></ProtectedRoute>} />
            
            {/* Student Routes - Strictly for Students */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/browse-profiles" element={<ProtectedRoute allowedRole="student"><BrowseProfiles /></ProtectedRoute>} />
            <Route path="/student/view-courses" element={<ProtectedRoute allowedRole="student"><ViewCourses /></ProtectedRoute>} />

            {/* Admin Routes - Strictly for Admins */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
            
            {/* Shared Detail Routes - Accessible to both as long as authenticated */}
            <Route path="/profile/:profileId" element={<ProfileDetails />} />
            <Route path="/course/:courseId" element={<CourseDetails />} />
            <Route path="/course/:courseId/module/:moduleId" element={<ModuleView />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
