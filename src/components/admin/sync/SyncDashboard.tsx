'use client';

import { useState } from 'react';
import { SyncTrigger } from './SyncTrigger';
import { SyncProgress } from './SyncProgress';
import { SyncHistory } from './SyncHistory';
import { SyncTestingPanel } from './SyncTestingPanel';

export function SyncDashboard() {
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const handleSyncStarted = (syncId: string) => {
    setCurrentSyncId(syncId);
  };

  const handleSyncComplete = () => {
    // Refresh history when sync completes
    setHistoryRefreshTrigger(prev => prev + 1);
  };

  const handleTestSync = async (testOptions: any) => {
    try {
      const response = await fetch('/api/admin/sync/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeImages: testOptions.includeImages,
          batchSize: testOptions.batchSize,
          notifyOnComplete: testOptions.notifyOnComplete || true,
          autoRetry: testOptions.autoRetry || true,
          // Testing options
          mockMode: testOptions.mockMode,
          simulateError: testOptions.simulateError,
          customDuration: testOptions.customDuration,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentSyncId(data.syncId);
      } else {
        console.error('Test sync failed:', data.error);
      }
    } catch (error) {
      console.error('Error starting test sync:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Testing Panel */}
      <SyncTestingPanel onTestSync={handleTestSync} disabled={!!currentSyncId} />

      {/* Sync Trigger */}
      <SyncTrigger onSyncStarted={handleSyncStarted} disabled={!!currentSyncId} />

      {/* Sync Progress (only shown when there's an active sync) */}
      {currentSyncId && <SyncProgress syncId={currentSyncId} onSyncComplete={handleSyncComplete} />}

      {/* Sync History */}
      <SyncHistory refreshTrigger={historyRefreshTrigger} />
    </div>
  );
}
