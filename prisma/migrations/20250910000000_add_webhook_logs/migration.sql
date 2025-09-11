-- Create webhook logs table for tracking all webhook validation attempts
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  merchant_id TEXT,
  environment TEXT CHECK (environment IN ('sandbox', 'production')),
  signature_valid BOOLEAN NOT NULL,
  validation_error JSONB,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL,
  processing_time_ms INTEGER,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_merchant_id ON webhook_logs(merchant_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_signature_valid ON webhook_logs(signature_valid) 
  WHERE signature_valid = false;
CREATE INDEX idx_webhook_logs_environment ON webhook_logs(environment);
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);

-- Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for webhook_logs updated_at
CREATE TRIGGER update_webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
