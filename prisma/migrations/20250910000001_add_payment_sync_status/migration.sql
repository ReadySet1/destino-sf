-- Create payment sync status table for tracking sync operations
CREATE TABLE IF NOT EXISTS payment_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id TEXT UNIQUE NOT NULL,
  sync_type TEXT CHECK (sync_type IN ('manual', 'scheduled', 'webhook_fallback')),
  merchant_id TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  payments_found INTEGER NOT NULL DEFAULT 0,
  payments_processed INTEGER NOT NULL DEFAULT 0,
  payments_failed INTEGER NOT NULL DEFAULT 0,
  error_details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payment_sync_status_created_at ON payment_sync_status(created_at DESC);
CREATE INDEX idx_payment_sync_status_merchant_id ON payment_sync_status(merchant_id);
CREATE INDEX idx_payment_sync_status_sync_type ON payment_sync_status(sync_type);
CREATE INDEX idx_payment_sync_status_sync_id ON payment_sync_status(sync_id);
