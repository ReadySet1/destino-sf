'use client';

import { useState } from 'react';
import { SimpleSyncTrigger } from './SimpleSyncTrigger';
import { SyncProgress } from './SyncProgress';
import { SimpleSyncHistory } from './SimpleSyncHistory';

export function SyncDashboard() {
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const handleSyncStarted = (syncId: string) => {
    // Only track async syncs, not synchronous completions
    if (syncId !== 'sync-completed') {
      setCurrentSyncId(syncId);
    } else {
      // For synchronous syncs, immediately trigger history refresh
      setHistoryRefreshTrigger(prev => prev + 1);
    }
  };

  const handleSyncComplete = () => {
    setCurrentSyncId(null);
    // Refresh history when sync completes
    setHistoryRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Simple Sync Trigger */}
      <SimpleSyncTrigger onSyncStarted={handleSyncStarted} disabled={!!currentSyncId} />

      {/* Sync Progress (only shown when there's an active sync) */}
      {currentSyncId && <SyncProgress syncId={currentSyncId} onSyncComplete={handleSyncComplete} />}

      {/* Simple Sync History */}
      <SimpleSyncHistory refreshTrigger={historyRefreshTrigger} />
    </div>
  );
}
