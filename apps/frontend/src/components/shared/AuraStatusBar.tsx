import React from 'react';
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react';

interface AuraStatusBarProps {
    status?: string;
    nodeName?: string;
    latency?: string;
    security?: string;
}

interface StatusBarSurfaceProps {
    ariaLabel: string;
    displayStatus: string;
    latency: string;
    security: string;
    syncLabel: string;
}

export const StatusBarSurface: React.FC<StatusBarSurfaceProps> = ({
    ariaLabel,
    displayStatus,
    latency,
    security,
    syncLabel,
}) => (
    <div role="status" aria-label={ariaLabel} data-ui="status-bar" data-slot="status-bar" className="flex shrink-0 items-center gap-4 overflow-x-auto border-b border-[var(--border-default)] bg-[var(--bg-panel)] px-4 py-2 text-xs text-[var(--text-secondary)] no-scrollbar">
        <div data-ui="status-bar-state" data-slot="status-bar-state" className="flex shrink-0 items-center gap-2">
            <span data-ui="status-bar-indicator" data-slot="status-bar-indicator" className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            <span className="font-medium text-[var(--text-primary)]">{displayStatus}</span>
        </div>

        <div data-ui="status-bar-separator" data-slot="status-bar-separator" className="h-4 w-px bg-[var(--border-default)]" aria-hidden="true" />

        <div data-ui="status-bar-latency" data-slot="status-bar-latency" className="flex shrink-0 items-center gap-2">
            <Activity size={13} className="text-accent" aria-hidden="true" focusable="false" />
            <span>Latency <span className="font-medium text-[var(--text-primary)]">{latency}</span></span>
        </div>

        <div data-ui="status-bar-separator" data-slot="status-bar-separator" className="h-4 w-px bg-[var(--border-default)]" aria-hidden="true" />

        <div data-ui="status-bar-security" data-slot="status-bar-security" className="flex shrink-0 items-center gap-2">
            <ShieldCheck size={13} className="text-success" aria-hidden="true" focusable="false" />
            <span>Security <span className="font-medium text-[var(--text-primary)]">{security}</span></span>
        </div>

        <div data-ui="status-bar-sync" data-slot="status-bar-sync" className="ml-auto flex shrink-0 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1">
            <RefreshCw size={12} className="text-accent" aria-hidden="true" focusable="false" />
            <span className="font-medium">{syncLabel}</span>
        </div>
    </div>
);

export const AuraStatusBar: React.FC<AuraStatusBarProps> = React.memo(({
    status,
    nodeName,
    latency = "4ms",
    security = "SECURE",
}) => {
    const displayStatus = status ?? (nodeName ? `${nodeName}: ACTIVE` : 'SYSTEM: ACTIVE');

    return (
        <StatusBarSurface
            ariaLabel="System status"
            displayStatus={displayStatus}
            latency={latency}
            security={security}
            syncLabel="Sync active"
        />
    );
});

StatusBarSurface.displayName = 'StatusBarSurface';
AuraStatusBar.displayName = 'AuraStatusBar';
