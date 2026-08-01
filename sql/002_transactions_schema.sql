CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('income', 'transfer', 'conversion')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing',
                'completed',
                'failed',
                'cancelled',
                'reversed'
            )
        ),
    description VARCHAR(255),
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    CONSTRAINT fk_transactions_wallet
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(id)
);

CREATE TABLE movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    balance_id UUID NOT NULL,
    direction VARCHAR(10) NOT NULL
        CHECK (direction IN ('debit', 'credit')),
    concept VARCHAR(20) NOT NULL DEFAULT 'principal'
        CHECK (concept IN ('principal', 'fee')),
    amount NUMERIC(20, 8) NOT NULL
        CHECK (amount > 0),
    balance_before NUMERIC(20, 8) NOT NULL
        CHECK (balance_before >= 0),
    balance_after NUMERIC(20, 8) NOT NULL
        CHECK (balance_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movements_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id),
    CONSTRAINT fk_movements_balance
        FOREIGN KEY (balance_id)
        REFERENCES balances(id),
    CONSTRAINT chk_movement_balance_calculation
        CHECK (
            (direction = 'credit'
                AND balance_after = balance_before + amount)
            OR
            (direction = 'debit'
                AND balance_after = balance_before - amount)
        )
);

CREATE TABLE incomes (
    transaction_id UUID PRIMARY KEY,
    income_type VARCHAR(30) NOT NULL
        CHECK (income_type IN ('company_payment', 'user_top_up')),
    funding_method VARCHAR(30) NOT NULL
        CHECK (funding_method IN ('bank_transfer', 'card')),
    payer_name VARCHAR(150),
    external_reference VARCHAR(100),
    CONSTRAINT fk_incomes_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id),
    CONSTRAINT chk_company_payment_payer
        CHECK (
            income_type <> 'company_payment'
            OR payer_name IS NOT NULL
        )
);

CREATE TABLE transfers (
    transaction_id UUID PRIMARY KEY,
    destination_type VARCHAR(10) NOT NULL
        CHECK (destination_type IN ('internal', 'external')),
    destination_wallet_id UUID,
    recipient_type VARCHAR(10)
        CHECK (recipient_type IN ('person', 'company')),
    recipient_name VARCHAR(150),
    destination_cbu VARCHAR(22),
    destination_alias VARCHAR(100),
    currency_code CHAR(3) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL
        CHECK (amount > 0),
    fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (fee_percentage IN (0, 0.50)),
    fee_amount NUMERIC(20, 8) NOT NULL DEFAULT 0
        CHECK (fee_amount >= 0),
    total_debited NUMERIC(20, 8)
        GENERATED ALWAYS AS (amount + fee_amount) STORED,

    CONSTRAINT fk_transfers_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id),

    CONSTRAINT fk_transfers_destination_wallet
        FOREIGN KEY (destination_wallet_id)
        REFERENCES wallets(id),

    CONSTRAINT fk_transfers_currency
        FOREIGN KEY (currency_code)
        REFERENCES currencies(code),

    CONSTRAINT chk_transfer_destination
    CHECK (
        (
            destination_type = 'internal'
            AND destination_wallet_id IS NOT NULL
            AND recipient_type IS NULL
            AND recipient_name IS NULL
            AND destination_cbu IS NULL
            AND destination_alias IS NULL
            AND fee_percentage = 0
            AND fee_amount = 0
        )
        OR
        (
            destination_type = 'external'
            AND destination_wallet_id IS NULL
            AND recipient_type IS NOT NULL
            AND NULLIF(TRIM(recipient_name), '') IS NOT NULL
            AND (
                destination_cbu IS NOT NULL
                OR NULLIF(TRIM(destination_alias), '') IS NOT NULL
            )
        )
    ),

    CONSTRAINT chk_transfer_cbu
        CHECK (
            destination_cbu IS NULL
            OR destination_cbu ~ '^[0-9]{22}$'
        ),

    CONSTRAINT chk_transfer_fee
        CHECK (
            (fee_percentage = 0 AND fee_amount = 0)
            OR
            (
                fee_percentage = 0.50
                AND fee_amount =
                    ROUND(amount * fee_percentage / 100, 8)
            )
        )
);

CREATE OR REPLACE FUNCTION validate_transaction_reversal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'reversed'
       AND OLD.status IS DISTINCT FROM 'reversed' THEN

        IF OLD.status <> 'completed' THEN
            RAISE EXCEPTION
                'Solo puede revertirse una transferencia completada';
        END IF;

        IF NEW.type <> 'transfer' THEN
            RAISE EXCEPTION
                'Solo las transferencias pueden revertirse';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM transfers
            WHERE transaction_id = NEW.id
              AND destination_type = 'internal'
        ) THEN
            RAISE EXCEPTION
                'Las transferencias externas no pueden revertirse';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_transaction_reversal
BEFORE UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION validate_transaction_reversal();

CREATE TABLE exchange_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_currency CHAR(3) NOT NULL,
    target_currency CHAR(3) NOT NULL,
    rate NUMERIC(20, 10) NOT NULL
        CHECK (rate > 0),

    provider VARCHAR(100) NOT NULL,
    provider_role VARCHAR(20) NOT NULL
        CHECK (
            provider_role IN (
                'primary',
                'fallback_1',
                'fallback_2'
            )
        ),

    calculation_type VARCHAR(10) NOT NULL DEFAULT 'direct'
        CHECK (calculation_type IN ('direct', 'cross')),

    intermediate_currency CHAR(3),

    rate_updated_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (CURRENT_TIMESTAMP + INTERVAL '60 seconds'),

    CONSTRAINT fk_quotes_source_currency
        FOREIGN KEY (source_currency)
        REFERENCES currencies(code),

    CONSTRAINT fk_quotes_target_currency
        FOREIGN KEY (target_currency)
        REFERENCES currencies(code),

    CONSTRAINT fk_quotes_intermediate_currency
        FOREIGN KEY (intermediate_currency)
        REFERENCES currencies(code),

    CONSTRAINT chk_quote_different_currencies
        CHECK (source_currency <> target_currency),

    CONSTRAINT chk_quote_expiration
        CHECK (expires_at > fetched_at),

    CONSTRAINT chk_quote_calculation
        CHECK (
            (
                calculation_type = 'direct'
                AND intermediate_currency IS NULL
            )
            OR
            (
                calculation_type = 'cross'
                AND intermediate_currency IS NOT NULL
                AND intermediate_currency <> source_currency
                AND intermediate_currency <> target_currency
            )
        )
);

CREATE TABLE conversions (
    transaction_id UUID PRIMARY KEY,
    quote_id UUID NOT NULL,
    source_amount NUMERIC(20, 8) NOT NULL
        CHECK (source_amount > 0),
    target_amount NUMERIC(20, 8) NOT NULL
        CHECK (target_amount > 0),
    applied_rate NUMERIC(20, 10) NOT NULL
        CHECK (applied_rate > 0),

    CONSTRAINT fk_conversions_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id),

    CONSTRAINT fk_conversions_quote
        FOREIGN KEY (quote_id)
        REFERENCES exchange_quotes(id),

    CONSTRAINT chk_conversion_calculation
        CHECK (
            target_amount =
                ROUND(source_amount * applied_rate, 8)
        )
);
