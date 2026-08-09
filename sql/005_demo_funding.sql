BEGIN;

ALTER TABLE incomes
    DROP CONSTRAINT incomes_funding_method_check;

ALTER TABLE incomes
    ADD CONSTRAINT chk_incomes_funding_method
        CHECK (
            funding_method IN (
                'bank_transfer',
                'card',
                'demo'
            )
        );

COMMIT;