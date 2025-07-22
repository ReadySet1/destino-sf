// Fix for UserSyncManager - Replace the executeUserSyncInBackground method

/**
 * Execute sync in background with progress tracking
 */
private async executeUserSyncInBackground(syncId: string, options: UserSyncOptions): Promise<void> {
  let progressInterval: NodeJS.Timeout | null = null;
  
  try {
    // Update status to running
    await this.updateProgress(syncId, {
      percentage: 0,
      message: 'Initializing sync...',
      currentStep: 'setup'
    }, SyncStatus.RUNNING);

    // Convert user options to production options
    const productionOptions = this.convertToProductionOptions(options);

    // Create production manager
    const productionManager = new ProductionSyncManager(productionOptions);

    // Track sync completion
    let syncCompleted = false;
    let progressUpdateCount = 0;
    const MAX_PROGRESS_UPDATES = 200; // Prevent runaway updates (200 * 3s = 10 minutes max)

    // Set up periodic progress updates
    progressInterval = setInterval(async () => {
      try {
        progressUpdateCount++;
        
        // Safety check: prevent infinite updates
        if (progressUpdateCount > MAX_PROGRESS_UPDATES) {
          logger.error(`Progress update limit reached for sync ${syncId}`);
          if (progressInterval) clearInterval(progressInterval);
          return;
        }

        // Check