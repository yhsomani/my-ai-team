import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Users } from 'lucide-react';
import { PublicProfile } from '../../../types/networking';
import ProfileCard from './ProfileCard';
import { AuraButton } from '../../../components/shared/AuraButton';

interface ProfileGridProps {
  isLoading: boolean;
  profiles: PublicProfile[];
  activeCategory: string;
  onConnect: (id: string) => void;
  onReset: () => void;
}

export const ProfileGrid: React.FC<ProfileGridProps> = ({ 
  isLoading, 
  profiles, 
  activeCategory, 
  onConnect,
  onReset
}) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div 
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="py-48 flex flex-col items-center justify-center space-y-8"
        >
          <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-300">Scanning mesh infrastructure...</p>
        </motion.div>
      ) : profiles.length === 0 ? (
        <motion.div 
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-48 text-center bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[4rem] space-y-10"
        >
          <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center mx-auto text-slate-200 dark:text-slate-800">
            <Users size={48} />
          </div>
          <div className="space-y-4 max-w-sm mx-auto px-6">
            <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-slate-400 italic leading-none">No Nodes Found.</h3>
            <p className="text-slate-400 text-xs font-medium leading-relaxed uppercase tracking-widest mt-4">The current neural scan yielded zero high-resonance matches.</p>
          </div>
          <AuraButton 
            variant="ghost" 
            className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest"
            onClick={onReset}
          >
            Reset Repository Scan
          </AuraButton>
        </motion.div>
      ) : (
        <motion.div 
          key="grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {profiles.map((profile) => (
            <ProfileCard 
              key={profile.id} 
              profile={profile} 
              activeCategory={activeCategory} 
              onConnect={onConnect} 
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(ProfileGrid);
