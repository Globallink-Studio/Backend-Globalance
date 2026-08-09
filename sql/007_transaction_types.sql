BEGIN;

ALTER TABLE transactions
    DROP CONSTRAINT transactions_type_check;

ALTER TABLE transactions
    ADD CONSTRAINT chk_transactions_type
        CHECK (
            type IN (
                'income',
                'purchase',
                'sale',
                'conversion',
                'transfer'
            )
        );

COMMIT;
