import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Jobs from './pages/Jobs';
import StudentDriveApps from './pages/StudentDriveApps';
import ProtectedRoute from './components/ProtectedRoute';

const StudentRoutes = () => {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
      <Route path="jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
      <Route path="drive-applications" element={<ProtectedRoute><StudentDriveApps /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default StudentRoutes;
