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
      {/* Global Control Bar - Mobile Only */}
      <nav className="lg:hidden fixed bottom-8 left-8 right-8 h-20 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] flex items-center justify-around px-6 border border-white/20 shadow-2xl shadow-slate-900/20">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500
              ${isActive(item.path) 
                ? 'bg-emerald-900 text-white shadow-xl shadow-emerald-950/40 scale-110' 
                : 'text-slate-400 hover:text-emerald-600'}
            `}
          >
            {item.icon}
          </Link>
        ))}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:text-emerald-600"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Orchestration Overlay - Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-slate-900 rounded-t-[3.5rem] p-10 pb-16 lg:hidden shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                 <div className="space-y-1">
                    <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">Protocols</h3>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest italic">Aurora System Menu</div>
                 </div>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center transition-all active:scale-90">
                    <X size={20} className="text-slate-500" />
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-col items-start gap-5 p-6 rounded-[2rem] transition-all duration-300 ${isActive(item.path) ? 'bg-emerald-900 text-white shadow-xl shadow-emerald-950/20' : 'bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800'}`}
                  >
                    <div className={`${isActive(item.path) ? 'text-emerald-400' : 'text-emerald-600'}`}>{item.icon}</div>
                    <div className="flex flex-col">
                       <span className={`text-[13px] font-bold tracking-tight ${isActive(item.path) ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.name}</span>
                       <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isActive(item.path) ? 'text-emerald-300/60' : 'text-slate-400'}`}>{item.description}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-10 space-y-4">
                 <AuraButton variant="outline" className="w-full h-16 rounded-2xl justify-start gap-4 px-8 text-sm font-bold" onClick={toggleTheme}>

                   {theme === 'light' ? <Moon size={20} className="text-emerald-600" /> : <Sun size={20} className="text-emerald-600" />}
                   {theme === 'light' ? 'Night Protocol' : 'Day Protocol'}
                 </AuraButton>
                 <AuraButton variant="outline" className="w-full h-16 rounded-2xl justify-start gap-4 px-8 text-sm font-bold text-rose-500 border-rose-500/10 hover:bg-rose-50" onClick={handleLogout}>
                   <LogOut size={20} /> Kill Session
                 </AuraButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
