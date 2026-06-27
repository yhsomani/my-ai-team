import React from 'react';
import { motion } from 'framer-motion';
import { AuraButton } from '../../../components/shared/AuraButton';
import GlassCard from '../../../components/shared/GlassCard';
import { Badge } from '../../../components/shared/Badge';

export const ProfileResonanceWidget: React.FC = () => {
  return (
    <GlassCard className="overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <Badge variant="success">Profile readiness</Badge>
          <h3 className="text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            Strengthen your profile signal
          </h3>
          <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Complete profile details, skills, and credentials so matching and applications have stronger context.
          </p>
          <AuraButton size="sm">
            Review profile
          </AuraButton>
        </div>
        
        <div className="relative flex h-40 w-40 shrink-0 items-center justify-center self-center" aria-label="Profile readiness 72 percent">
          <svg className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="80" cy="80" r="62" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[var(--bg-secondary)]" />
            <motion.circle 
              initial={{ strokeDasharray: "0, 390" }}
              animate={{ strokeDasharray: "281, 390" }}
              transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
              cx="80" cy="80" r="62" stroke="currentColor" strokeWidth="8" fill="transparent" strokeLinecap="round" className="text-accent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold text-[var(--text-primary)]">72%</span>
            <span className="mt-1 text-xs text-[var(--text-muted)]">Ready</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default React.memo(ProfileResonanceWidget);
