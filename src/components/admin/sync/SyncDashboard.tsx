'use client';

import { useState } from 'react';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { SimpleSyncTriggerWithDesignSystem } from './SimpleSyncTriggerWithDesignSystem';
import { EnhancedSyncProgress } from './EnhancedSyncProgress';
import { SyncHistoryWithDetails } from './SyncHistoryWithDetails';

export function SyncDashboard() {
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const handleSyncStarted = (syncId: string) => {
    // Only track async syncs with real syncIds, not synchronous completions
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
    <div className="space-y-10">
      {/* Sync Controls */}
      <FormSection
        title="Synchronize Products"
        description="Synchronize products, categories, and images from Square POS. This will update products, prices, categories, images, and active/inactive status."
        icon={FormIcons.refresh}
        variant="blue"
      >
        <SimpleSyncTriggerWithDesignSystem
          onSyncStarted={handleSyncStarted}
          disabled={!!currentSyncId}
        />
      </FormSection>

      {/* Sync Progress (only shown when there's an active sync) */}
      {currentSyncId && (
        <FormSection
          title="Sync Progress"
          description="Monitor the current synchronization progress with real-time activity updates."
          icon={FormIcons.refresh}
          variant="amber"
        >
          <EnhancedSyncProgress syncId={currentSyncId} onSyncComplete={handleSyncComplete} />
        </FormSection>
      )}

      {/* Sync History */}
      <FormSection
        title="Synchronization History"
        description="View recent synchronization attempts and their results. Click on any sync to see detailed changes."
        icon={FormIcons.archive}
        variant="default"
      >
        <SyncHistoryWithDetails refreshTrigger={historyRefreshTrigger} />
      </FormSection>
    </div>
  );
}
