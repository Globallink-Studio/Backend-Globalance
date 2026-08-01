\ir 001_initial_schema.sql
\ir 002_transactions_schema.sql
\ir 003_email_deliveries.sql

INSERT INTO currencies (code, name, symbol, decimal_places)
VALUES
    ('ARS', 'Peso argentino', '$', 2),
    ('USD', 'Dólar estadounidense', 'US$', 2),
    ('EUR', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;
