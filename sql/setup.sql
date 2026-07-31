\ir 001_initial_schema.sql

INSERT INTO currencies (code, name, symbol, decimal_places)
VALUES
    ('ARS', 'Peso argentino', '$', 2),
    ('USD', 'Dólar estadounidense', 'US$', 2),
    ('EUR', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;
