import React from 'react';
import { StatusBarSurface } from '../shared/AuraStatusBar';

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
        <StatusBarSurface
            ariaLabel="Sync status"
            displayStatus={displayStatus}
            latency={latency}
            security={security}
            syncLabel={syncLabel}
        />
    );
};

export default SyncStatusBar;
