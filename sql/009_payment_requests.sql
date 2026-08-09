BEGIN;

CREATE TABLE payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),

    requester_user_id UUID NOT NULL,
    payer_user_id UUID NOT NULL,

    currency_code CHAR(3) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL
        CHECK (amount > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'paid',
                'expired',
                'cancelled'
            )
        ),

    paid_transaction_id UUID UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    CONSTRAINT fk_payment_requests_requester
        FOREIGN KEY (requester_user_id)
        REFERENCES users(id),

    CONSTRAINT fk_payment_requests_payer
        FOREIGN KEY (payer_user_id)
        REFERENCES users(id),

    CONSTRAINT fk_payment_requests_transaction
        FOREIGN KEY (paid_transaction_id)
        REFERENCES transactions(id),

    CONSTRAINT fk_payment_requests_currency
        FOREIGN KEY (currency_code)
        REFERENCES currencies(code),

    CONSTRAINT chk_payment_request_users
        CHECK (requester_user_id <> payer_user_id),

    CONSTRAINT chk_payment_request_expiration
        CHECK (expires_at > created_at),

    CONSTRAINT chk_payment_request_state
        CHECK (
            (
                status IN ('pending', 'expired')
                AND paid_transaction_id IS NULL
                AND paid_at IS NULL
                AND cancelled_at IS NULL
            )
            OR
            (
                status = 'paid'
                AND paid_transaction_id IS NOT NULL
                AND paid_at IS NOT NULL
                AND cancelled_at IS NULL
            )
            OR
            (
                status = 'cancelled'
                AND paid_transaction_id IS NULL
                AND paid_at IS NULL
                AND cancelled_at IS NOT NULL
            )
        )
);

CREATE INDEX idx_payment_requests_payer_status
    ON payment_requests (payer_user_id, status, created_at DESC);

CREATE INDEX idx_payment_requests_requester_status
    ON payment_requests (
        requester_user_id,
        status,
        created_at DESC
    );

CREATE INDEX idx_payment_requests_pending_expiration
    ON payment_requests (expires_at)
    WHERE status = 'pending';

COMMIT;