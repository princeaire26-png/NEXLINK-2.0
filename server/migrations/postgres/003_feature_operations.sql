-- NEXLINK modular feature governance and approval queue.
-- Requests are persisted here; this migration does not enable OS command execution.
CREATE TABLE IF NOT EXISTS feature_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    feature_key VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    risk_level risk_level NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'awaiting_approval',
    requires_second_approver BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feature_operations_status_check CHECK (status IN (
      'awaiting_approval', 'policy_approved_waiting_agent', 'dispatched', 'completed', 'failed', 'rejected', 'expired'
    ))
);
CREATE INDEX IF NOT EXISTS idx_feature_operations_device ON feature_operations(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_operations_requester ON feature_operations(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_operations_status ON feature_operations(status);
