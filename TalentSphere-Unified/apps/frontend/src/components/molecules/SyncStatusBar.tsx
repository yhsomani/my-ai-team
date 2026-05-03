import React from 'react';
import { Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SyncStatusBarProps {
    status?: string;
    nodeName?: string;
    latency?: string;
    security?: string;
    syncLabel?: string;
}

const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ 
    status,
    nodeName,
    latency = "4ms", 
    security = "ARMORED",
    syncLabel = "Quantum Ledger Sync"
}) => {
    const displayStatus = status ?? (nodeName ? `${nodeName}: ONLINE` : 'CORE: ONLINE');

    return (
        <div className="relative group flex items-center gap-6 px-6 py-3 bg-surface-container-high/50 backdrop-blur-3xl border-b border-white/5 overflow-x-auto shrink-0 select-none" style={{ scrollbarWidth: 'none' }}>
            {/* Auroraic Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,.1)_50%),linear-gradient(90deg,rgba(255,0,0,.03),rgba(0,255,0,.01),rgba(0,0,255,.03))] bg-[length:100%_4px,3px_100%] z-0 opacity-20" />

            {/* Status Indicator with Rhythmic Ripple */}
            <div className="relative z-10 flex items-center gap-3 shrink-0">
                <div className="relative flex items-center justify-center">
                    {/* Ripple Rings */}
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="absolute w-4 h-4 rounded-full border border-emerald-500/30"
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.6,
                                ease: "easeOut"
                            }}
                        />
                    ))}
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] z-10" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/80 font-mono">{displayStatus}</span>
            </div>

            <div className="w-px h-4 bg-white/5 mx-1" />

            {/* Latency Node */}
            <motion.div 
                whileHover={{ x: 2 }}
                className="relative z-10 flex items-center gap-2 shrink-0 cursor-default"
            >
                <Activity size={12} className="text-emerald-500 opacity-60" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">
                    MS: <span className="text-white font-mono">{latency}</span>
                </span>
            </motion.div>

            <div className="w-px h-4 bg-white/5 mx-1" />

            {/* Security Node with Flicker */}
            <motion.div 
                whileHover={{ opacity: [1, 0.4, 1], transition: { duration: 0.2, repeat: 1 } }}
                className="relative z-10 flex items-center gap-2 shrink-0 cursor-default"
            >
                <ShieldCheck size={12} className="text-emerald-500 opacity-60" />
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">
                    SEC: <span className="text-white font-mono">{security}</span>
                </span>
            </motion.div>

            {/* Ledger Sync Signature */}
            <div className="ml-auto relative z-10 flex items-center gap-3 shrink-0 px-4 py-1.5 bg-emerald-500/5 rounded-sm border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
                <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            className="w-0.5 h-2 bg-emerald-500/40"
                            animate={{ height: [4, 12, 4], opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Sparkles size={10} className="text-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-400 whitespace-nowrap">{syncLabel}</span>
                </div>
            </div>
        </div>
    );
};

export default SyncStatusBar;
