import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Bell, Search, User as UserIcon, LogOut, 
  Menu, X, LayoutDashboard, Briefcase, GraduationCap, 
  Trophy, Share2, MessageSquare, Settings 
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
    { name: 'Nexus', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Jobs', path: '/jobs', icon: <Briefcase size={18} /> },
    { name: 'Academy', path: '/lms', icon: <GraduationCap size={18} /> },
    { name: 'Arena', path: '/challenges', icon: <Trophy size={18} /> },
    { name: 'Feed', path: '/networking', icon: <Share2 size={18} /> },
    { name: 'Messages', path: '/messaging', icon: <MessageSquare size={18} /> },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled ? 'h-16 bg-Aurora-dark/80 backdrop-blur-xl border-b border-Aurora-border' : 'h-24 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-prismatic-gradient p-[1px]">
            <div className="w-full h-full bg-Aurora-dark rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-electric animate-pulse-subtle" />
            </div>
          </div>
          <span className="text-xl font-bold font-display tracking-tight text-white group-hover:text-electric transition-colors">
            Aurora<span className="text-white/40">Talent</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {user && navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                pathname === item.path ? 'text-electric bg-electric/5' : 'text-white/50 hover:text-white hover:bg-white/5'
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
                <AuraButton variant="ghost" size="icon">
                  <Search size={18} />
                </AuraButton>
                <AuraButton variant="ghost" size="icon">
                  <Bell size={18} />
                </AuraButton>
              </div>
              <div className="h-6 w-px bg-Aurora-border hidden sm:block" />
              <Link to="/profile" className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white/5 transition-all group">
                <div className="w-8 h-8 rounded-full bg-Aurora-elevated border border-Aurora-border flex items-center justify-center text-white/50 group-hover:border-electric transition-colors">
                  <UserIcon size={16} />
                </div>
                <span className="text-xs font-bold text-white hidden md:block">
                  {user?.email?.split('@')[0]}
                </span>
              </Link>
              <AuraButton variant="ghost" size="icon" onClick={handleLogout} className="hover:text-red-400">
                <LogOut size={18} />
              </AuraButton>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <AuraButton 
            variant="ghost" size="icon" 
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
            className="absolute top-full left-0 right-0 bg-Aurora-surface border-b border-Aurora-border p-6 lg:hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              {user && navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                    pathname === item.path 
                    ? 'bg-electric/5 border-electric/20 text-electric' 
                    : 'bg-white/5 border-white/5 text-white/50'
                  }`}
                >
                  {item.icon}
                  <span className="text-xs font-bold uppercase tracking-wider">{item.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
