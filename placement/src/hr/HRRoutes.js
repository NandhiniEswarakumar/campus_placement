import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HRLogin from './pages/HRLogin';
import HRSignup from './pages/HRSignup';
import HRDashboard from './pages/HRDashboard';
import HRJobs from './pages/HRJobs';
import HRApplications from './pages/HRApplications';
import HRProtectedRoute from './components/HRProtectedRoute';

const HRRoutes = () => {
  return (
    <Routes>
      <Route path="login" element={<HRLogin />} />
      <Route path="signup" element={<HRSignup />} />
      <Route path="dashboard" element={<HRProtectedRoute><HRDashboard /></HRProtectedRoute>} />
      <Route path="jobs" element={<HRProtectedRoute><HRJobs /></HRProtectedRoute>} />
      <Route path="applications" element={<HRProtectedRoute><HRApplications /></HRProtectedRoute>} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
};

export default HRRoutes;
