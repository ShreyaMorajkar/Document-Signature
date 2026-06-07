import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  setCurrentPage: (page: string) => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, setCurrentPage }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    // Redirect to login page
    setTimeout(() => {
      setCurrentPage('login');
    }, 0);
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
