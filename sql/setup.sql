\ir 001_initial_schema.sql
\ir 002_transactions_schema.sql
\ir 003_email_deliveries.sql
\ir 004_exchange_rate_cache.sql
\ir 005_demo_funding.sql
\ir 006_transaction_indexes.sql
\ir 007_transaction_types.sql
\ir 008_user_timezone.sql
\ir 009_payment_requests.sql
\ir 010_email_delivery_context.sql

INSERT INTO currencies (code, name, symbol, decimal_places)
VALUES
    ('ARS', 'Peso argentino', '$', 2),
    ('USD', 'Dólar estadounidense', 'US$', 2),
    ('EUR', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;
