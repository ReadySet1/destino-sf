-- Add webhook queue table for persistent webhook processing
CREATE TABLE webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for efficient processing
CREATE INDEX idx_webhook_queue_status ON webhook_queue(status);
CREATE INDEX idx_webhook_queue_created ON webhook_queue(created_at);
CREATE INDEX idx_webhook_queue_event_id ON webhook_queue(event_id);
CREATE INDEX idx_webhook_queue_attempts ON webhook_queue(attempts);
