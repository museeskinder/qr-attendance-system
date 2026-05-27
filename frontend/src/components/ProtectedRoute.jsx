import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, isChangePasswordRoute = false }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="auth-container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.requiresPasswordChange && !isChangePasswordRoute) {
    return <Navigate to="/change-password" replace />;
  }

  if (!user.requiresPasswordChange && isChangePasswordRoute) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'instructor') return <Navigate to="/instructor" replace />;
    return <Navigate to="/student" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'instructor') return <Navigate to="/instructor" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
};

export default ProtectedRoute;
