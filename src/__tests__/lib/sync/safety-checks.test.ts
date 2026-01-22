import {
  checkConfirmationFlag,
  checkNotProductionDatabase,
  checkMinimumSourceProducts,
  runAllSafetyChecks,
  DEFAULT_SYNC_SAFETY_CONFIG,
  type SyncSafetyConfig,
} from '@/lib/sync/safety-checks';

describe('Sync Safety Checks', () => {
  describe('checkConfirmationFlag', () => {
    it('should pass when confirmation flag is present', () => {
      const result = checkConfirmationFlag(['--confirm-sync']);
      expect(result.passed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when confirmation flag is missing', () => {
      const result = checkConfirmationFlag([]);
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Confirmation flag required');
      expect(result.details?.requiredFlag).toBe('--confirm-sync');
    });

    it('should fail when different flags are present but not confirmation', () => {
      const result = checkConfirmationFlag(['--verbose', '--dry-run']);
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Confirmation flag required');
    });

    it('should pass with custom confirmation flag', () => {
      const config: SyncSafetyConfig = {
        ...DEFAULT_SYNC_SAFETY_CONFIG,
        confirmationFlag: '--yes-i-am-sure',
      };
      const result = checkConfirmationFlag(['--yes-i-am-sure'], config);
      expect(result.passed).toBe(true);
    });

    it('should skip check when requireConfirmationFlag is false', () => {
      const config: SyncSafetyConfig = {
        ...DEFAULT_SYNC_SAFETY_CONFIG,
        requireConfirmationFlag: false,
      };
      const result = checkConfirmationFlag([], config);
      expect(result.passed).toBe(true);
    });

    it('should pass when confirmation flag is among other args', () => {
      const result = checkConfirmationFlag([
        '--verbose',
        '--confirm-sync',
        '--output=file.json',
      ]);
      expect(result.passed).toBe(true);
    });
  });

  describe('checkNotProductionDatabase', () => {
    it('should pass for development database URL', () => {
      const result = checkNotProductionDatabase(
        'postgresql://localhost:5432/destino_dev'
      );
      expect(result.passed).toBe(true);
    });

    it('should pass for staging database URL', () => {
      const result = checkNotProductionDatabase(
        'postgresql://staging.supabase.co/destino_staging'
      );
      expect(result.passed).toBe(true);
    });

    it('should fail for URL containing "production"', () => {
      const result = checkNotProductionDatabase(
        'postgresql://production.supabase.co/destino'
      );
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Production environment detected');
      expect(result.details?.detectedKeywords).toContain('production');
    });

    it('should fail for URL containing "prod"', () => {
      const result = checkNotProductionDatabase(
        'postgresql://prod-db.supabase.co/destino'
      );
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Production environment detected');
      expect(result.details?.detectedKeywords).toContain('prod');
    });

    it('should be case-insensitive', () => {
      const result = checkNotProductionDatabase(
        'postgresql://PRODUCTION.supabase.co/destino'
      );
      expect(result.passed).toBe(false);
    });

    it('should fail when database URL is undefined', () => {
      const result = checkNotProductionDatabase(undefined);
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Database URL not provided');
    });

    it('should fail when database URL is empty string', () => {
      const result = checkNotProductionDatabase('');
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Database URL not provided');
    });

    it('should pass with custom production keywords', () => {
      const config: SyncSafetyConfig = {
        ...DEFAULT_SYNC_SAFETY_CONFIG,
        productionKeywords: ['live', 'main'],
      };
      // Should pass because "production" and "prod" are not in custom keywords
      const result = checkNotProductionDatabase(
        'postgresql://production.supabase.co/destino',
        config
      );
      expect(result.passed).toBe(true);
    });

    it('should fail with custom production keywords when matched', () => {
      const config: SyncSafetyConfig = {
        ...DEFAULT_SYNC_SAFETY_CONFIG,
        productionKeywords: ['live', 'main'],
      };
      const result = checkNotProductionDatabase(
        'postgresql://live-db.supabase.co/destino',
        config
      );
      expect(result.passed).toBe(false);
    });
  });

  describe('checkMinimumSourceProducts', () => {
    it('should pass when source has more than minimum products', () => {
      const result = checkMinimumSourceProducts(100);
      expect(result.passed).toBe(true);
    });

    it('should pass when source has exactly minimum products', () => {
      const result = checkMinimumSourceProducts(1);
      expect(result.passed).toBe(true);
    });

    it('should fail when source has zero products', () => {
      const result = checkMinimumSourceProducts(0);
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Insufficient source products');
      expect(result.details?.sourceProductCount).toBe(0);
      expect(result.details?.minimumRequired).toBe(1);
    });

    it('should fail when source has negative products (edge case)', () => {
      const result = checkMinimumSourceProducts(-1);
      expect(result.passed).toBe(false);
    });

    it('should use custom minimum when configured', () => {
      const config: SyncSafetyConfig = {
        ...DEFAULT_SYNC_SAFETY_CONFIG,
        minSourceProductsRequired: 10,
      };

      expect(checkMinimumSourceProducts(9, config).passed).toBe(false);
      expect(checkMinimumSourceProducts(10, config).passed).toBe(true);
      expect(checkMinimumSourceProducts(11, config).passed).toBe(true);
    });
  });

  describe('runAllSafetyChecks', () => {
    it('should pass when all checks pass', () => {
      const result = runAllSafetyChecks({
        args: ['--confirm-sync'],
        databaseUrl: 'postgresql://localhost:5432/destino_dev',
        sourceProductCount: 100,
      });
      expect(result.passed).toBe(true);
    });

    it('should fail on first failing check (confirmation)', () => {
      const result = runAllSafetyChecks({
        args: [],
        databaseUrl: 'postgresql://localhost:5432/destino_dev',
        sourceProductCount: 100,
      });
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Confirmation flag required');
    });

    it('should fail on production check even with confirmation', () => {
      const result = runAllSafetyChecks({
        args: ['--confirm-sync'],
        databaseUrl: 'postgresql://production.supabase.co/destino',
        sourceProductCount: 100,
      });
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Production environment detected');
    });

    it('should fail on empty source even with confirmation and non-prod DB', () => {
      const result = runAllSafetyChecks({
        args: ['--confirm-sync'],
        databaseUrl: 'postgresql://localhost:5432/destino_dev',
        sourceProductCount: 0,
      });
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Insufficient source products');
    });

    it('should use custom config when provided', () => {
      const config: SyncSafetyConfig = {
        requireConfirmationFlag: false,
        confirmationFlag: '--confirm',
        minSourceProductsRequired: 50,
        productionKeywords: ['live'],
      };

      // Should pass even without confirmation flag (disabled)
      // Should pass even with "production" in URL (not in keywords)
      // But should fail because sourceProductCount < 50
      const result = runAllSafetyChecks({
        args: [],
        databaseUrl: 'postgresql://production.supabase.co/destino',
        sourceProductCount: 49,
        config,
      });
      expect(result.passed).toBe(false);
      expect(result.error).toBe('Insufficient source products');
    });

    it('should pass all checks with permissive config', () => {
      const config: SyncSafetyConfig = {
        requireConfirmationFlag: false,
        confirmationFlag: '--confirm',
        minSourceProductsRequired: 0,
        productionKeywords: [],
      };

      const result = runAllSafetyChecks({
        args: [],
        databaseUrl: 'postgresql://production.supabase.co/destino',
        sourceProductCount: 0,
        config,
      });
      expect(result.passed).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should prevent the incident that caused data loss', () => {
      // Scenario: Someone runs sync against development when Square Sandbox is empty
      const result = runAllSafetyChecks({
        args: [], // No confirmation flag
        databaseUrl: 'postgresql://dev.supabase.co/destino_development',
        sourceProductCount: 0, // Square Sandbox returned empty
      });

      expect(result.passed).toBe(false);
      // Should fail on confirmation flag first
      expect(result.error).toBe('Confirmation flag required');
    });

    it('should still prevent sync even with confirmation when source is empty', () => {
      const result = runAllSafetyChecks({
        args: ['--confirm-sync'], // Has confirmation
        databaseUrl: 'postgresql://dev.supabase.co/destino_development',
        sourceProductCount: 0, // Square Sandbox still empty
      });

      expect(result.passed).toBe(false);
      expect(result.error).toBe('Insufficient source products');
    });

    it('should prevent accidental production sync', () => {
      const result = runAllSafetyChecks({
        args: ['--confirm-sync'],
        databaseUrl: 'postgresql://production.supabase.co/destino_prod',
        sourceProductCount: 100,
      });

      expect(result.passed).toBe(false);
      expect(result.error).toBe('Production environment detected');
    });

    it('should allow legitimate development sync', () => {
      const result = runAllSafetyChecks({
        args: ['--confirm-sync'],
        databaseUrl: 'postgresql://development.supabase.co/destino_dev',
        sourceProductCount: 131, // Real product count from production catalog
      });

      expect(result.passed).toBe(true);
    });
  });
});
