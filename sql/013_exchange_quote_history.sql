BEGIN;

CREATE TABLE exchange_quote_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source_currency CHAR(3) NOT NULL,
    target_currency CHAR(3) NOT NULL,

    quote_date DATE NOT NULL,

    rate NUMERIC(20, 10) NOT NULL
        CHECK (rate > 0),

    provider VARCHAR(100) NOT NULL,

    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quote_history_source_currency
        FOREIGN KEY (source_currency)
        REFERENCES currencies(code),

    CONSTRAINT fk_quote_history_target_currency
        FOREIGN KEY (target_currency)
        REFERENCES currencies(code),

    CONSTRAINT chk_quote_history_different_currencies
        CHECK (source_currency <> target_currency),

    CONSTRAINT uq_quote_history_pair_date
        UNIQUE (source_currency, target_currency, quote_date)
);

CREATE INDEX idx_quote_history_pair_date
    ON exchange_quote_history (source_currency, target_currency, quote_date DESC);

COMMIT;
