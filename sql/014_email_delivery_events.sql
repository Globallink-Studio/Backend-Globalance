BEGIN;

ALTER TABLE email_deliveries
    DROP CONSTRAINT chk_email_delivery_event;

ALTER TABLE email_deliveries
    ADD CONSTRAINT chk_email_delivery_event
        CHECK (
            transaction_event IN (
                'completed',
                'failed',
                'payment_request_created',
                'payment_request_paid',
                'transfer_completed',
                'income_completed',
                'exchange_completed'
            )
        );

COMMIT;
