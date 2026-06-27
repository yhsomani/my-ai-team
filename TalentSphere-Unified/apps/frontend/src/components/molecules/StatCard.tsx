import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Badge } from '../shared/Badge';

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
  const colorStyles: Record<NonNullable<StatCardProps['color']>, string> = {
    emerald: 'text-success bg-success-muted border-success/20',
    amber: 'text-warning bg-warning-muted border-warning/20',
    rose: 'text-destructive bg-destructive-muted border-destructive/20',
    slate: 'text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-[var(--border-default)]',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`surface-card relative flex flex-col gap-4 p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-md border p-2.5 ${colorStyles[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <Badge
            variant={trend.isPositive ? 'success' : 'destructive'} 
          >
            {trend.value}
          </Badge>
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
        <h3 className="mt-1 text-3xl font-semibold leading-none text-[var(--text-primary)]">{value}</h3>
      </div>

      {description && (
        <p className="max-w-[90%] text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
      )}
    </motion.div>
  );
};
