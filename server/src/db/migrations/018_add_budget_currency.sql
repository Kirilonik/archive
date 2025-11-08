ALTER TABLE films_catalog
  ADD COLUMN IF NOT EXISTS budget_currency_code TEXT,
  ADD COLUMN IF NOT EXISTS budget_currency_symbol TEXT;


