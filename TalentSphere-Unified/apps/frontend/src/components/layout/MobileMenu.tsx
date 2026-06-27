import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Moon, Sun, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button as AuraButton } from '../shared/AuraButton';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

interface MobileMenuProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  navItems: NavItem[];
  isActive: (path: string) => boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  handleLogout: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  navItems,
  isActive,
  theme,
  toggleTheme,
  handleLogout
}) => {
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[var(--border-default)] bg-[var(--bg-panel)] px-3 shadow-lg lg:hidden">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            aria-label={item.name}
            className={`
              flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
              ${isActive(item.path) 
                ? 'bg-accent/10 text-accent'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}
            `}
          >
            {item.icon}
          </Link>
        ))}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Menu size={24} />
        </button>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-[var(--bg-overlay)] backdrop-blur-sm lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-lg border border-[var(--border-default)] bg-[var(--bg-panel)] p-5 pb-20 shadow-lg lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                 <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Navigation</h3>
                    <div className="text-xs text-[var(--text-muted)]">Open a workspace or account action.</div>
                 </div>
                 <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    <X size={20} />
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex min-h-28 flex-col items-start gap-4 rounded-lg border p-4 transition-colors ${
                      isActive(item.path)
                        ? 'border-accent/20 bg-accent/10 text-accent'
                        : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className={isActive(item.path) ? 'text-accent' : 'text-[var(--text-muted)]'}>{item.icon}</div>
                    <div className="flex flex-col">
                       <span className="text-sm font-semibold text-[var(--text-primary)]">{item.name}</span>
                       <span className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.description}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                 <AuraButton variant="outline" className="h-11 w-full justify-start gap-3" onClick={toggleTheme}>

                   {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                   {theme === 'light' ? 'Dark mode' : 'Light mode'}
                 </AuraButton>
                 <AuraButton variant="outline" className="h-11 w-full justify-start gap-3 text-destructive hover:bg-destructive-muted" onClick={handleLogout}>
                   <LogOut size={18} /> Sign out
                 </AuraButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
