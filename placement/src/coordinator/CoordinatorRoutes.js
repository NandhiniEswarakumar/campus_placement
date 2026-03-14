import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CoordinatorLogin from './pages/CoordinatorLogin';
import CoordinatorSignup from './pages/CoordinatorSignup';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import CoordinatorStudents from './pages/CoordinatorStudents';
import CoordinatorApplications from './pages/CoordinatorApplications';
import CoordinatorDrives from './pages/CoordinatorDrives';
import CoordinatorProtectedRoute from './components/CoordinatorProtectedRoute';

const CoordinatorRoutes = () => {
  return (
    <Routes>
      <Route path="login" element={<CoordinatorLogin />} />
      <Route path="signup" element={<CoordinatorSignup />} />
      <Route path="dashboard" element={<CoordinatorProtectedRoute><CoordinatorDashboard /></CoordinatorProtectedRoute>} />
      <Route path="students" element={<CoordinatorProtectedRoute><CoordinatorStudents /></CoordinatorProtectedRoute>} />
      <Route path="applications" element={<CoordinatorProtectedRoute><CoordinatorApplications /></CoordinatorProtectedRoute>} />
      <Route path="drives" element={<CoordinatorProtectedRoute><CoordinatorDrives /></CoordinatorProtectedRoute>} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default CoordinatorRoutes;
