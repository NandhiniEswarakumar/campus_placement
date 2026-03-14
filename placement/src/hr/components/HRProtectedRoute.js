import React from 'react';
import { Navigate } from 'react-router-dom';
import hrApi from '../services/hrApi';

const HRProtectedRoute = ({ children }) => {
  if (!hrApi.isLoggedIn()) {
    return <Navigate to="/hr/login" replace />;
  }
  return children;
};

export default HRProtectedRoute;
