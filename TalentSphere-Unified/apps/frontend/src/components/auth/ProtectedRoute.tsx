import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center"
        data-ui="protected-route-loading"
      >
        <Loader2
          aria-hidden="true"
          focusable="false"
          className="h-8 w-8 animate-spin text-accent"
          data-ui="protected-route-loading-spinner"
        />
        <span className="text-sm font-medium text-[var(--text-muted)]">Initializing TalentSphere...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !user.roles?.some(role => allowedRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
