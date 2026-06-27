import React from 'react';
import { Activity, ShieldCheck, RefreshCw } from 'lucide-react';

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
    security = "Secure",
    syncLabel = "Sync active"
}) => {
    const displayStatus = status ?? (nodeName ? `${nodeName}: ONLINE` : 'CORE: ONLINE');

    return (
        <div role="status" className="flex shrink-0 items-center gap-4 overflow-x-auto border-b border-[var(--border-default)] bg-[var(--bg-panel)] px-4 py-2 text-xs text-[var(--text-secondary)] no-scrollbar">
            <div className="flex shrink-0 items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                <span className="font-medium text-[var(--text-primary)]">{displayStatus}</span>
            </div>

            <div className="h-4 w-px bg-[var(--border-default)]" />

            <div className="flex shrink-0 items-center gap-2">
                <Activity size={13} className="text-accent" />
                <span>
                    Latency <span className="font-medium text-[var(--text-primary)]">{latency}</span>
                </span>
            </div>

            <div className="h-4 w-px bg-[var(--border-default)]" />

            <div className="flex shrink-0 items-center gap-2">
                <ShieldCheck size={13} className="text-success" />
                <span>
                    Security <span className="font-medium text-[var(--text-primary)]">{security}</span>
                </span>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1">
                <RefreshCw size={12} className="text-accent" />
                <span className="font-medium">{syncLabel}</span>
            </div>
        </div>
    );
};

export default SyncStatusBar;
