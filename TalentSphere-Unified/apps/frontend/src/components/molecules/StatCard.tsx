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
  const descriptionId = React.useId();
  const colorStyles: Record<NonNullable<StatCardProps['color']>, string> = {
    emerald: 'text-success bg-success-muted border-success/20',
    amber: 'text-warning bg-warning-muted border-warning/20',
    rose: 'text-destructive bg-destructive-muted border-destructive/20',
    slate: 'text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-[var(--border-default)]',
  };

  return (
    <motion.div
      role="group"
      aria-label={`${label}: ${value}`}
      aria-describedby={description ? descriptionId : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-ui="stat-card"
      data-slot="stat-card"
      className={`surface-card relative flex flex-col gap-4 p-5 ${className}`}
    >
      <div data-ui="stat-card-header" data-slot="stat-card-header" className="flex items-center justify-between">
        <div data-ui="stat-card-icon" data-slot="stat-card-icon" className={`rounded-md border p-2.5 ${colorStyles[color]}`} aria-hidden="true">
          <Icon size={20} aria-hidden="true" focusable="false" />
        </div>
        {trend && (
          <Badge
            variant={trend.isPositive ? 'success' : 'destructive'}
            data-ui="stat-card-trend"
            data-slot="stat-card-trend"
          >
            {trend.value}
          </Badge>
        )}
      </div>

      <div data-ui="stat-card-body" data-slot="stat-card-body" className="flex flex-col">
        <span data-ui="stat-card-label" data-slot="stat-card-label" className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
        <h3 data-ui="stat-card-value" data-slot="stat-card-value" className="mt-1 text-3xl font-semibold leading-none text-[var(--text-primary)]">{value}</h3>
      </div>

      {description && (
        <p id={descriptionId} data-ui="stat-card-description" data-slot="stat-card-description" className="max-w-[90%] text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
      )}
    </motion.div>
  );
};
