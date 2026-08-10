BEGIN;

ALTER TABLE email_deliveries
    ADD COLUMN subject VARCHAR(255),
    ADD COLUMN html_body TEXT,
    ADD COLUMN text_body TEXT;

CREATE INDEX idx_email_deliveries_failed_created_at
    ON email_deliveries (created_at)
    WHERE status = 'failed';

COMMIT;