BEGIN;

ALTER TABLE email_deliveries
    ALTER COLUMN transaction_id DROP NOT NULL,

    ALTER COLUMN transaction_event TYPE VARCHAR(40),

    ADD COLUMN payment_request_id UUID,

    ADD CONSTRAINT fk_email_deliveries_payment_request
        FOREIGN KEY (payment_request_id)
        REFERENCES payment_requests(id),

    ADD CONSTRAINT chk_email_delivery_context
        CHECK (
            (
                transaction_id IS NOT NULL
                AND payment_request_id IS NULL
            )
            OR
            (
                transaction_id IS NULL
                AND payment_request_id IS NOT NULL
            )
        );

ALTER TABLE email_deliveries
    DROP CONSTRAINT uq_email_delivery_attempt;

ALTER TABLE email_deliveries
    DROP CONSTRAINT email_deliveries_transaction_event_check;

ALTER TABLE email_deliveries
    ADD CONSTRAINT chk_email_delivery_event
        CHECK (
            transaction_event IN (
                'completed',
                'failed',
                'payment_request_created',
                'payment_request_paid',
                'transfer_completed'
            )
        );

CREATE UNIQUE INDEX uq_email_delivery_transaction_attempt
    ON email_deliveries (
        transaction_id,
        transaction_event,
        recipient_email,
        attempt_number
    )
    WHERE transaction_id IS NOT NULL;

CREATE UNIQUE INDEX uq_email_delivery_request_attempt
    ON email_deliveries (
        payment_request_id,
        transaction_event,
        recipient_email,
        attempt_number
    )
    WHERE payment_request_id IS NOT NULL;

COMMIT;