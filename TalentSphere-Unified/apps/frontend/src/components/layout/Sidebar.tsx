import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LogOut, Moon, Sun,
  ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { getAccessibleNavRoutes, getMobileNavRoutes, type AppRouteDefinition } from '../../navigation/routeRegistry';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  handleLogout: () => void;
}

const renderRouteIcon = (item: AppRouteDefinition) => {
  const Icon = item.icon;
  return Icon ? <Icon size={18} /> : null;
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, theme, toggleTheme, handleLogout }) => {
  const { pathname } = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const roles = user?.roles || [];
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const mainNav = getAccessibleNavRoutes('main', roles);
  const accountNav = getAccessibleNavRoutes('account', roles);
  const mobileNavItems = getMobileNavRoutes(roles);

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`
          lg:hidden fixed inset-0 z-40 bg-[var(--bg-overlay)] backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Sidebar (Slide-over) */}
      <aside
        aria-hidden={!isOpen}
        className={`
          lg:hidden fixed left-0 top-0 h-full z-50 w-72
          bg-[var(--bg-panel)] border-r border-[var(--border-default)] shadow-lg
          transition-transform duration-300 ease-out transform
          ${isOpen ? 'translate-x-0' : '-translate-x-full invisible'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
            <Link to="/" className="flex items-center gap-2.5" onClick={() => setIsOpen(false)}>
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
                <Layers size={16} />
              </div>
              <span className="text-sm font-semibold">TalentSphere</span>
            </Link>
            <button aria-label="Close sidebar" onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
              <ChevronLeft size={20} />
            </button>
          </div>

          <nav aria-label="Primary navigation" className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">Main</p>
            {mainNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive(item.path)
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}
                `}
              >
                {renderRouteIcon(item)}
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}

            <div className="my-4 border-t border-[var(--border-default)] mx-3" />

            <p className="px-3 mb-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">Account</p>
            {accountNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                aria-current={isActive(item.path) ? 'page' : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive(item.path)
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}
                `}
              >
                {renderRouteIcon(item)}
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-[var(--border-default)] space-y-2">
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-sm">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/5">
              <LogOut size={18} />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`
        hidden lg:flex flex-col fixed left-0 top-0 h-full z-40
        bg-[var(--bg-panel)] border-r border-[var(--border-default)]
        transition-all duration-200 ease-out
        ${isOpen ? 'w-64' : 'w-16'}
      `}>
        {/* Logo */}
        <div className={`h-14 flex items-center border-b border-[var(--border-default)] ${isOpen ? 'px-4' : 'px-0 justify-center'}`}>
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground shrink-0">
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
        <nav aria-label="Primary navigation" className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto no-scrollbar">
          {isOpen && (
            <p className="px-2 mb-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">Main</p>
          )}
          {mainNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.label : undefined}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`
                flex items-center gap-2.5 rounded-lg transition-colors duration-150
                ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
                ${isActive(item.path)
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}
              `}
            >
              <span className="shrink-0">{renderRouteIcon(item)}</span>
              {isOpen && <span className="text-sm truncate">{item.label}</span>}
            </Link>
          ))}

          {/* Separator */}
          <div className={`my-3 border-t border-[var(--border-default)] ${isOpen ? 'mx-2' : 'mx-1'}`} />

          {isOpen && (
            <p className="px-2 mb-2 text-[11px] font-medium text-[var(--text-muted)] uppercase">Account</p>
          )}
          {accountNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.label : undefined}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`
                flex items-center gap-2.5 rounded-lg transition-colors duration-150
                ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
                ${isActive(item.path)
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}
              `}
            >
              <span className="shrink-0">{renderRouteIcon(item)}</span>
              {isOpen && <span className="text-sm truncate">{item.label}</span>}
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
              hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150
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
              hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
              ${isOpen ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
            `}
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            {isOpen && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-panel)] border-t border-[var(--border-default)] px-2 py-1.5 flex justify-around shadow-lg">
        {mobileNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive(item.path) ? 'page' : undefined}
            className={`
              flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors
              ${isActive(item.path) ? 'text-accent' : 'text-[var(--text-muted)]'}
            `}
          >
            {renderRouteIcon(item)}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};
