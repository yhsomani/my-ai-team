import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';

interface HeaderProps {
  scrolled?: boolean;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  user?: any;
  navItems?: any[];
  isActive?: (path: string) => boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  user 
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--border-default)] bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      {/* Left: Mobile menu toggle */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsSidebarOpen?.(!isSidebarOpen)}
          className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input 
            type="text"
            placeholder="Search..."
            aria-label="Search platform"
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
          <kbd className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-5 items-center gap-1 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button 
          className="relative p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          aria-label="View notifications"
        >
          <Bell size={18} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-accent rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
          {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>

      </div>
    </header>
  );
};
