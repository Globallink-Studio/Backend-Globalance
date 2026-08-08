BEGIN;

CREATE TABLE exchange_rate_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_currency CHAR(3) NOT NULL,
    target_currency CHAR(3) NOT NULL,
    rate NUMERIC(20, 10) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE exchange_rate_cache
    ADD CONSTRAINT fk_rate_cache_source_currency
        FOREIGN KEY (source_currency)
        REFERENCES currencies(code),

    ADD CONSTRAINT fk_rate_cache_target_currency
        FOREIGN KEY (target_currency)
        REFERENCES currencies(code),

    ADD CONSTRAINT chk_rate_cache_positive_rate
        CHECK (rate > 0),

    ADD CONSTRAINT chk_rate_cache_different_currencies
        CHECK (source_currency <> target_currency),

    ADD CONSTRAINT chk_rate_cache_expiration
        CHECK (expires_at > fetched_at),

    ADD CONSTRAINT chk_rate_cache_provider
        CHECK (provider IN ('frankfurter', 'exchange_rate_api')),

    ADD CONSTRAINT uq_rate_cache_currency_pair
        UNIQUE (source_currency, target_currency);

ALTER TABLE conversions
    ADD COLUMN source_currency CHAR(3),
    ADD COLUMN target_currency CHAR(3),
    ADD COLUMN rate_provider VARCHAR(50),
    ADD COLUMN rate_fetched_at TIMESTAMPTZ;

UPDATE conversions AS c
SET
    source_currency = q.source_currency,
    target_currency = q.target_currency,
    rate_provider = q.provider,
    rate_fetched_at = q.fetched_at
FROM exchange_quotes AS q
WHERE c.quote_id = q.id;

ALTER TABLE conversions
    ALTER COLUMN source_currency SET NOT NULL,
    ALTER COLUMN target_currency SET NOT NULL,
    ALTER COLUMN rate_provider SET NOT NULL,
    ALTER COLUMN rate_fetched_at SET NOT NULL,

    ADD CONSTRAINT fk_conversions_source_currency
        FOREIGN KEY (source_currency)
        REFERENCES currencies(code),

    ADD CONSTRAINT fk_conversions_target_currency
        FOREIGN KEY (target_currency)
        REFERENCES currencies(code),

    ADD CONSTRAINT chk_conversions_different_currencies
        CHECK (source_currency <> target_currency);

ALTER TABLE conversions
    DROP CONSTRAINT fk_conversions_quote,
    DROP COLUMN quote_id;

DROP TABLE exchange_quotes;

CREATE INDEX idx_exchange_rate_cache_expires_at
    ON exchange_rate_cache (expires_at);

COMMIT;