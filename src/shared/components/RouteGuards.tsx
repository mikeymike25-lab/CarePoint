import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const CustomerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'staff' || role === 'pharmacy_owner') return <Navigate to="/staff" replace />;
  if (role === 'customer') return <>{children}</>;
  
  return <Navigate to="/login" replace />;
};

export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'customer') return <Navigate to="/customer/home" replace />;
  if (role === 'staff' || role === 'pharmacy_owner') return <>{children}</>;
  
  return <Navigate to="/login" replace />;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (role === 'admin') return <>{children}</>;
  if (role === 'staff' || role === 'pharmacy_owner') return <Navigate to="/staff" replace />;
  if (role === 'customer') return <Navigate to="/customer/home" replace />;
  
  return <Navigate to="/login" replace />;
};
