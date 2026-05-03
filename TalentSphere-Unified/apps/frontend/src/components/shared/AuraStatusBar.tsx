import React from 'react';
import { Activity, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuraStatusBarProps {
    status?: string;
    nodeName?: string;
    latency?: string;
    security?: string;
}

export const AuraStatusBar: React.FC<AuraStatusBarProps> = React.memo(({ 
    status,
    nodeName,
    latency = "4ms", 
    security = "SECURE",
}) => {
    const displayStatus = status ?? (nodeName ? `${nodeName}: ACTIVE` : 'SYSTEM: ACTIVE');

    return (
        <div className="flex items-center gap-6 px-8 py-3 bg-Aurora-surface/40 backdrop-blur-xl border-b border-Aurora-border overflow-x-auto no-scrollbar shrink-0 will-change-transform">
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">{displayStatus}</span>
            </div>
            
            <div className="w-px h-3 bg-Aurora-border" />
            
            <div className="flex items-center gap-2 shrink-0">
                <Activity size={12} className="text-electric/70" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Latency <span className="text-white/80">{latency}</span></span>
            </div>
            
            <div className="w-px h-3 bg-Aurora-border" />
            
            <div className="flex items-center gap-2 shrink-0">
                <ShieldCheck size={12} className="text-void/70" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">Security <span className="text-white/80">{security}</span></span>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <motion.div 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="flex items-center gap-2 bg-electric/5 px-3 py-1 rounded-full border border-electric/10"
              >
                  <Sparkles size={10} className="text-electric" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-electric">Aurora Sync Active</span>
              </motion.div>
              
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-Aurora-border bg-white/2">
                  <Zap size={10} className="text-white/40" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">Node 08-FR</span>
              </div>
            </div>
        </div>
    );
});

AuraStatusBar.displayName = 'AuraStatusBar';
