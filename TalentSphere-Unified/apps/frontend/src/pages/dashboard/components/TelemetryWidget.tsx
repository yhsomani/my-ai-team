import React, { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { AuraButton } from '../../../components/shared/AuraButton';
import { Badge } from '../../../components/shared/Badge';
import { aiService } from '../../../services/aiService';

export const TelemetryWidget: React.FC = () => {
  const [insight, setInsight] = useState('Loading dashboard insight...');

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
    <GlassCard className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Fingerprint size={20} />
        </div>
        <Badge variant="outline">
          {new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Badge>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Dashboard insight</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]" role="status">
          {insight}
        </p>
      </div>
      <AuraButton variant="outline" size="sm" className="w-full">
        Query assistant
      </AuraButton>
    </GlassCard>
  );
};

export default React.memo(TelemetryWidget);
