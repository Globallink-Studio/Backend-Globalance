CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    user_type VARCHAR(20)
        CHECK (user_type IN ('person', 'company')),
    display_currency CHAR(3) NOT NULL DEFAULT 'ARS',
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_access_at TIMESTAMPTZ
);

CREATE TABLE person_profiles (
    user_id UUID PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    document VARCHAR(30) UNIQUE NOT NULL,
    phone VARCHAR(30),
    CONSTRAINT fk_person_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE company_profiles (
    user_id UUID PRIMARY KEY,
    legal_name VARCHAR(150) NOT NULL,
    document VARCHAR(30) UNIQUE NOT NULL,
    phone VARCHAR(30),
    CONSTRAINT fk_company_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION validate_profile_type()
RETURNS TRIGGER AS $$
DECLARE
    registered_type VARCHAR(20);
    required_type VARCHAR(20);
BEGIN
    SELECT user_type
    INTO registered_type
    FROM users
    WHERE id = NEW.user_id;

    required_type :=
        CASE TG_TABLE_NAME
            WHEN 'person_profiles' THEN 'person'
            WHEN 'company_profiles' THEN 'company'
        END;

    IF registered_type IS DISTINCT FROM required_type THEN
        RAISE EXCEPTION
            'El perfil % no corresponde al tipo de usuario %',
            required_type,
            registered_type;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_person_profile_type
BEFORE INSERT OR UPDATE ON person_profiles
FOR EACH ROW
EXECUTE FUNCTION validate_profile_type();

CREATE TRIGGER validate_company_profile_type
BEFORE INSERT OR UPDATE ON company_profiles
FOR EACH ROW
EXECUTE FUNCTION validate_profile_type();

CREATE TABLE currencies (
    code CHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_places SMALLINT NOT NULL DEFAULT 2
        CHECK (decimal_places BETWEEN 0 AND 8),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE OR REPLACE FUNCTION prevent_user_type_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.user_type IS NOT NULL
    AND NEW.user_type IS DISTINCT FROM OLD.user_type THEN
        RAISE EXCEPTION
            'El tipo de usuario no puede modificarse después del registro';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_users_type_change
BEFORE UPDATE OF user_type ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_user_type_change();

ALTER TABLE users
ADD CONSTRAINT fk_users_display_currency
FOREIGN KEY (display_currency)
REFERENCES currencies(code);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    alias VARCHAR(100) UNIQUE NOT NULL,
    account_number VARCHAR(30) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallets_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL,
    currency_code CHAR(3) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL DEFAULT 0
        CHECK (amount >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_balances_wallet
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_balances_currency
        FOREIGN KEY (currency_code)
        REFERENCES currencies(code),
    CONSTRAINT uq_balances_wallet_currency
        UNIQUE (wallet_id, currency_code)
);

INSERT INTO currencies (code, name, symbol, decimal_places)
VALUES
    ('ARS', 'Peso argentino', '$', 2),
    ('USD', 'Dólar estadounidense', 'US$', 2),
    ('EUR', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;