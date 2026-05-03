import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AuraBadge } from '../shared/AuraCard';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'emerald' | 'amber' | 'rose' | 'slate';
  description?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  color = 'emerald',
  description,
  className = '',
}) => {
  const colorStyles = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/10',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-500/10',
    rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-500/10',
    slate: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 border-slate-500/10',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`Aurora-card p-6 flex flex-col gap-4 border border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl border ${colorStyles[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <AuraBadge 
            variant={trend.isPositive ? 'success' : 'destructive'} 
            className="px-3"
          >
            {trend.value}
          </AuraBadge>
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1 leading-none">{value}</h3>
      </div>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed max-w-[90%]">
          {description}
        </p>
      )}

      {/* Decorative Gradient Background */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};
