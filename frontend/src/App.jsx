import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseManagement from './pages/admin/CourseManagement';
import CreateInstructor from './pages/admin/CreateInstructor';
import Reports from './pages/admin/Reports';
import UserManagement from './pages/admin/UserManagement';
import ActivityLogs from './pages/admin/ActivityLogs';

// Instructor pages
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import SessionManagement from './pages/instructor/SessionManagement';
import SessionReport from './pages/instructor/SessionReport';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import QRScanner from './pages/student/QRScanner';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/change-password" element={
            <ProtectedRoute isChangePasswordRoute={true}>
              <ChangePassword />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="courses" element={<CourseManagement />} />
            <Route path="instructors" element={<CreateInstructor />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="activity" element={<ActivityLogs />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Instructor Routes */}
          <Route path="/instructor" element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<InstructorDashboard />} />
            <Route path="sessions" element={<SessionManagement />} />
            <Route path="sessions/:id/report" element={<SessionReport />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<StudentDashboard />} />
            <Route path="scan" element={<QRScanner />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
