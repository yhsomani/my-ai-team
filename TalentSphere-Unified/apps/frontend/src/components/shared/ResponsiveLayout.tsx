import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { useAuraTheme } from '../../hooks/useAuraTheme';
import { getApplicationContentLabel } from '../../navigation/routeRegistry';
import { Sidebar } from '../layout/Sidebar';
import { Header } from '../layout/Header';

export const ResponsiveLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { theme, toggleTheme } = useAuraTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const applicationContentLabel = getApplicationContentLabel(pathname);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(logout());
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return <>{children}</>;

  return (
    <div className="app-shell flex" data-ui="responsive-layout" data-slot="responsive-layout">
      <a
        href="#application-content"
        data-ui="responsive-layout-skip-link"
        data-slot="responsive-layout-skip-link"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--bg-panel)] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
      >
        Skip to application content
      </a>
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
      />

      <main
        id="application-content"
        aria-label={applicationContentLabel}
        data-ui="responsive-layout-main"
        data-slot="responsive-layout-main"
        tabIndex={-1}
        className={`
        min-w-0 flex-1 flex flex-col min-h-screen transition-all duration-200 ease-out
        ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}
        pb-16 lg:pb-0
      `}
      >
        <Header
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          user={user}
        />
        <div className="app-page flex-1" data-ui="responsive-layout-page" data-slot="responsive-layout-page">
          {children}
        </div>
      </main>
    </div>
  );
};
