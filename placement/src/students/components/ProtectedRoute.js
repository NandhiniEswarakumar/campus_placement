import React from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';

const ProtectedRoute = ({ children }) => {
  if (!api.isLoggedIn()) {
    return <Navigate to="/students/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
