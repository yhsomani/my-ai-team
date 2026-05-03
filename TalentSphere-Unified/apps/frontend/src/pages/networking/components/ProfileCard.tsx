import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Check, MapPin, Award, MessageSquare, UserPlus, X } from 'lucide-react';
import { PublicProfile } from '../../../types/networking';
import { AuraButton } from '../../../components/shared/AuraButton';

interface ProfileCardProps {
  profile: PublicProfile;
  activeCategory: string;
  onConnect: (id: string) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, activeCategory, onConnect }) => {
  return (
    <motion.div 
      whileHover={{ y: -10, scale: 1.01 }}
      className="group rounded-[3.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/40 transition-all flex flex-col overflow-hidden shadow-2xl shadow-slate-200/40 dark:shadow-none min-h-[460px]"
    >
      <div className="h-28 w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 relative z-0">
        <div className="absolute inset-0 bg-emerald-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
        {((profile.alignment as any) >= 90) && (
          <div className="absolute top-6 right-8">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
              <Zap size={10} className="text-emerald-600" />
              <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums uppercase">{profile.alignment}% Resonance</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-10 pb-10 flex-1 flex flex-col -mt-10 relative z-10">
        <div className="mb-8 relative w-24 h-24">
          <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 group-hover:scale-105 transition-transform shadow-lg">
            <img 
              src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.fullName}`} 
              alt={profile.fullName} 
              className="w-full h-full object-cover rounded-[1.7rem]"
            />
          </div>
          {activeCategory === 'Connections' && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900 flex items-center justify-center">
              <Check size={12} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white leading-tight uppercase italic group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
              {profile.fullName}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-50 transition-colors">{profile.currentRole || 'Neural Architect'}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50 dark:border-slate-800">
            <div className="space-y-1.5">
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">Location</span>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                <MapPin size={12} className="text-emerald-600 opacity-60" /> {profile.location || 'Distributed'}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">Resonance</span>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                <Award size={12} className="text-emerald-600 opacity-60" /> Master Tier
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(profile.skills || ['Solidity', 'Architecture', 'EVM']).slice(0, 3).map((skill: string) => (
              <span key={skill} className="px-5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-50 dark:border-slate-800 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition-colors">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-10 border-t border-slate-50 dark:border-slate-800">
          {activeCategory === 'Requests' ? (
            <div className="flex items-center gap-4">
              <AuraButton className="flex-1 h-14 bg-emerald-900 text-[10px] uppercase font-bold">Accept Pulse</AuraButton>
              <AuraButton variant="ghost" size="icon" className="w-14 h-14 bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-inner"><X size={20} /></AuraButton>
            </div>
          ) : activeCategory === 'Connections' ? (
            <AuraButton variant="outline" className="w-full h-14 text-[10px] uppercase font-bold flex items-center justify-center gap-3">
              <MessageSquare size={18} className="text-emerald-600" /> Transmit Signal
            </AuraButton>
          ) : (
            <AuraButton 
              className="w-full h-14 text-[10px] uppercase font-bold shadow-xl shadow-emerald-900/10"
              disabled={profile.isConnected}
              onClick={() => onConnect(profile.id)}
            >
              {profile.isConnected ? (
                <span className="flex items-center gap-3"><Check size={18} /> Synchronized</span>
              ) : (
                <span className="flex items-center gap-3"><UserPlus size={18} /> Forge Resonance</span>
              )}
            </AuraButton>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ProfileCard);
