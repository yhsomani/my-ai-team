import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { aiService } from '../../../services/aiService';

export const TelemetryWidget: React.FC = () => {
  const [insight, setInsight] = useState('Initializing telemetry stream...');

  useEffect(() => {
    const fetchInsight = async () => {
        try {
            const data = await aiService.getInsights();
            setInsight(data.insight);
        } catch (err) {
            console.error("Telemetry failure", err);
        }
    };
    fetchInsight();
  }, []);

  return (
    <GlassCard className="p-10 space-y-10 border-white/5 group bg-white/[0.01]">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
        <Fingerprint size={24} />
      </div>
      <div className="space-y-6">
        <h3 className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20">Telemetry // {new Date().getHours()}:{new Date().getMinutes()}</h3>
        <p className="text-2xl font-light leading-relaxed text-white/60 italic">
          "{insight}"
        </p>
      </div>
      <button className="w-full h-16 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all font-black tracking-[0.4em] text-[9px] uppercase italic text-white/20 hover:text-white">
        Query Navigator
      </button>
    </GlassCard>
  );
};

export default React.memo(TelemetryWidget);
