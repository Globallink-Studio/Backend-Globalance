BEGIN;

ALTER TABLE email_deliveries
    ALTER COLUMN transaction_event TYPE VARCHAR(50);

COMMIT;
