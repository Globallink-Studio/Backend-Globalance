BEGIN;

CREATE TABLE frequent_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,

    contact_type VARCHAR(20) NOT NULL
        CHECK (contact_type IN ('alias', 'account_number')),

    contact_value VARCHAR(255) NOT NULL,
    contact_wallet_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_frequent_contacts_owner
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_frequent_contacts_wallet
        FOREIGN KEY (contact_wallet_id)
        REFERENCES wallets(id),

    CONSTRAINT uq_frequent_contacts_owner_data
        UNIQUE (user_id, contact_type, contact_value)
);

CREATE INDEX idx_frequent_contacts_owner
    ON frequent_contacts (user_id, name);

COMMIT;
