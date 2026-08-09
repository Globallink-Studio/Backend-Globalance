BEGIN;

CREATE INDEX idx_transactions_wallet_created_at
    ON transactions (wallet_id, created_at DESC);

CREATE INDEX idx_transactions_wallet_status_created_at
    ON transactions (wallet_id, status, created_at DESC);

CREATE INDEX idx_transactions_completed_conversions
    ON transactions (wallet_id, completed_at)
    WHERE type = 'conversion'
      AND status = 'completed';

CREATE INDEX idx_movements_transaction_id
    ON movements (transaction_id);

CREATE INDEX idx_movements_balance_id
    ON movements (balance_id);

CREATE INDEX idx_transfers_destination_wallet_id
    ON transfers (destination_wallet_id)
    WHERE destination_wallet_id IS NOT NULL;

COMMIT;