BEGIN;

ALTER TABLE users
    ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

COMMIT;
