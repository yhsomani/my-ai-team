import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Search, User as UserIcon, LogOut,
  Menu, X, LayoutDashboard, Briefcase, GraduationCap, 
  Trophy, Share2, MessageSquare, Layers
} from 'lucide-react';
import { AuraButton } from './AuraButton';

export const AuraNavbar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Jobs', path: '/jobs', icon: <Briefcase size={18} /> },
    { name: 'Learning', path: '/lms', icon: <GraduationCap size={18} /> },
    { name: 'Challenges', path: '/challenges', icon: <Trophy size={18} /> },
    { name: 'Network', path: '/networking', icon: <Share2 size={18} /> },
    { name: 'Messages', path: '/messaging', icon: <MessageSquare size={18} /> },
  ];

  return (
    <nav className={`fixed left-0 right-0 top-0 z-[100] border-b border-[var(--border-default)] transition-all duration-200 ${
      scrolled ? 'h-16 bg-[var(--bg-panel)]/95 backdrop-blur-sm shadow-sm' : 'h-20 bg-[var(--bg-panel)]'
    }`}>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Layers size={18} />
          </div>
          <span className="text-base font-semibold text-[var(--text-primary)]">
            TalentSphere
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {user && navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.path
                  ? 'bg-accent/10 text-accent'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {!user ? (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <AuraButton variant="ghost" size="sm">Login</AuraButton>
              </Link>
              <Link to="/register">
                <AuraButton size="sm">Get Started</AuraButton>
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <AuraButton variant="ghost" size="icon" aria-label="Search">
                  <Search size={18} />
                </AuraButton>
                <AuraButton variant="ghost" size="icon" aria-label="Notifications">
                  <Bell size={18} />
                </AuraButton>
              </div>
              <div className="hidden h-6 w-px bg-[var(--border-default)] sm:block" />
              <Link to="/profile" aria-label="Profile" className="group flex items-center gap-3 rounded-md p-1 pr-3 transition-colors hover:bg-[var(--bg-secondary)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                  <UserIcon size={16} />
                </div>
                <span className="hidden text-xs font-medium text-[var(--text-secondary)] md:block">
                  {user?.email?.split('@')[0]}
                </span>
              </Link>
              <AuraButton variant="ghost" size="icon" aria-label="Logout" onClick={handleLogout} className="hover:text-destructive">
                <LogOut size={18} />
              </AuraButton>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <AuraButton 
            variant="ghost" size="icon" 
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </AuraButton>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full border-b border-[var(--border-default)] bg-[var(--bg-panel)] p-4 shadow-lg lg:hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              {user && navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex flex-col items-center gap-3 rounded-lg border p-4 transition-colors ${
                    pathname === item.path 
                      ? 'border-accent/20 bg-accent/10 text-accent'
                      : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
