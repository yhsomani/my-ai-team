import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Briefcase, GraduationCap, 
  Trophy, Share2, Cpu, MessageSquare,
  LogOut, Moon, Sun, Settings, User,
  ChevronLeft, ChevronRight, Layers
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const mainNav: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { name: 'Jobs', path: '/jobs', icon: <Briefcase size={18} />, roles: ['ROLE_USER', 'ROLE_RECRUITER'] },
  { name: 'Candidates', path: '/candidates', icon: <User size={18} />, roles: ['ROLE_RECRUITER'] },
  { name: 'Learning', path: '/lms', icon: <GraduationCap size={18} />, roles: ['ROLE_USER'] },
  { name: 'Challenges', path: '/challenges', icon: <Trophy size={18} />, roles: ['ROLE_USER'] },
  { name: 'Network', path: '/networking', icon: <Share2 size={18} /> },
  { name: 'AI Assistant', path: '/ai', icon: <Cpu size={18} /> },
  { name: 'Messages', path: '/messaging', icon: <MessageSquare size={18} /> },
  { name: 'Admin Console', path: '/admin', icon: <Layers size={18} />, roles: ['ROLE_ADMIN'] },
];

const bottomNav: NavItem[] = [
  { name: 'Profile', path: '/profile', icon: <User size={18} /> },
  { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  handleLogout: () => void;
}

import { useAppSelector } from '../../store/hooks';

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, theme, toggleTheme, handleLogout }) => {
  const { pathname } = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const filteredNav = mainNav.filter(item => {
    if (!item.roles) return true;
    return user?.roles?.some(role => item.roles?.includes(role));
  });

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`
          lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Sidebar (Slide-over) */}
      <aside 
        aria-hidden={!isOpen}
        className={`
          lg:hidden fixed left-0 top-0 h-full z-50 w-72
          bg-[var(--bg-secondary)] border-r border-[var(--border-default)]
          transition-transform duration-300 ease-out transform
          ${isOpen ? 'translate-x-0' : '-translate-x-full invisible'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
            <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsOpen(false)}>
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white">
                <Layers size={16} />
              </div>
              <span className="text-sm font-semibold">TalentSphere</span>
            </Link>
            <button aria-label="Close sidebar" onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg">
              <ChevronLeft size={20} />
            </button>
          </div>
          
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Main</p>
            {filteredNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive(item.path) 
                    ? 'bg-accent/10 text-accent font-semibold' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}
                `}
              >
                {item.icon}
                <span className="text-sm">{item.name}</span>
              </Link>
            ))}

            <div className="my-4 border-t border-[var(--border-default)] mx-3" />
            
            <p className="px-3 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Account</p>
            {bottomNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive(item.path) 
                    ? 'bg-accent/10 text-accent font-semibold' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}
                `}
              >
                {item.icon}
                <span className="text-sm">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-[var(--border-default)] space-y-2">
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-sm">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/5">
              <LogOut size={18} />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`
        hidden lg:flex flex-col fixed left-0 top-0 h-full z-40
        bg-[var(--bg-secondary)] border-r border-[var(--border-default)]
        transition-all duration-200 ease-out
        ${isOpen ? 'w-64' : 'w-16'}
      `}>
        {/* Logo */}
        <div className={`h-14 flex items-center border-b border-[var(--border-default)] ${isOpen ? 'px-4' : 'px-0 justify-center'}`}>
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shrink-0">
              <Layers size={16} />
            </div>
            {isOpen && (
              <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
                TalentSphere
              </span>
            )}
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto no-scrollbar">
          {isOpen && (
            <p className="px-2 mb-2 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Main</p>
          )}
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.name : undefined}
              className={`
                flex items-center gap-2.5 rounded-lg transition-colors duration-150
                ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
                ${isActive(item.path) 
                  ? 'bg-accent/10 text-accent font-medium' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'}
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              {isOpen && <span className="text-sm truncate">{item.name}</span>}
            </Link>
          ))}

          {/* Separator */}
          <div className={`my-3 border-t border-[var(--border-default)] ${isOpen ? 'mx-2' : 'mx-1'}`} />
          
          {isOpen && (
            <p className="px-2 mb-2 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Account</p>
          )}
          {bottomNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.name : undefined}
              className={`
                flex items-center gap-2.5 rounded-lg transition-colors duration-150
                ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
                ${isActive(item.path) 
                  ? 'bg-accent/10 text-accent font-medium' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'}
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              {isOpen && <span className="text-sm truncate">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className={`py-3 px-2 border-t border-[var(--border-default)] space-y-0.5`}>
          <button 
            onClick={toggleTheme}
            title={!isOpen ? (theme === 'light' ? 'Dark mode' : 'Light mode') : undefined}
            className={`
              w-full flex items-center gap-2.5 rounded-lg text-[var(--text-secondary)] 
              hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors duration-150
              ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
            `}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {isOpen && <span className="text-sm">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
          </button>
          <button 
            onClick={handleLogout}
            title={!isOpen ? 'Sign out' : undefined}
            className={`
              w-full flex items-center gap-2.5 rounded-lg text-[var(--text-secondary)] 
              hover:bg-destructive-muted hover:text-destructive transition-colors duration-150
              ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
            `}
          >
            <LogOut size={18} />
            {isOpen && <span className="text-sm">Sign out</span>}
          </button>

          {/* Collapse toggle */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isOpen}
            title={!isOpen ? "Expand sidebar" : undefined}
            className={`
              w-full flex items-center gap-2.5 rounded-lg text-[var(--text-muted)] 
              hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
              ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
            `}
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            {isOpen && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-secondary)] border-t border-[var(--border-default)] px-2 py-1.5 flex justify-around">
        {filteredNav.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors
              ${isActive(item.path) ? 'text-accent' : 'text-[var(--text-muted)]'}
            `}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};
