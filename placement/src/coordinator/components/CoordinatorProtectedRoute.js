import React from 'react';
import { Navigate } from 'react-router-dom';
import coordinatorApi from '../services/coordinatorApi';

const CoordinatorProtectedRoute = ({ children }) => {
  if (!coordinatorApi.isLoggedIn()) {
    return <Navigate to="/coordinator/login" replace />;
  }
  return children;
};

export default CoordinatorProtectedRoute;
