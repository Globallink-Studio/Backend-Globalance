CREATE TABLE email_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,

    transaction_event VARCHAR(20) NOT NULL
        CHECK (
            transaction_event IN (
                'completed',
                'failed',
                'reversed'
            )
        ),

    recipient_email CITEXT NOT NULL,

    attempt_number SMALLINT NOT NULL DEFAULT 1
        CHECK (attempt_number > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),

    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    CONSTRAINT fk_email_deliveries_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id),

    CONSTRAINT uq_email_delivery_attempt
        UNIQUE (
            transaction_id,
            transaction_event,
            attempt_number
        ),

    CONSTRAINT chk_email_delivery_result
        CHECK (
            (
                status = 'pending'
                AND sent_at IS NULL
            )
            OR
            (
                status = 'sent'
                AND sent_at IS NOT NULL
                AND provider_message_id IS NOT NULL
            )
            OR
            (
                status = 'failed'
                AND error_message IS NOT NULL
            )
        )
);