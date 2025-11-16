-- ============================================
-- Качество данных: уникальность title+year без kp_id,
-- CHECK-ограничения и NOT NULL для метадат
-- ============================================

-- Уникальность для записей без внешнего kp_id:
-- (lower(title), COALESCE(year,0)) должны быть уникальны, когда kp_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_films_catalog_title_year_no_kpid
  ON films_catalog (lower(title), COALESCE(year, 0))
  WHERE kp_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_series_catalog_title_year_no_kpid
  ON series_catalog (lower(title), COALESCE(year, 0))
  WHERE kp_id IS NULL;

-- CHECK: допустимый год релиза (с 1888 по текущий год)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'films_catalog_year_valid_chk'
  ) THEN
    ALTER TABLE films_catalog
      ADD CONSTRAINT films_catalog_year_valid_chk
      CHECK (year IS NULL OR (year BETWEEN 1888 AND EXTRACT(YEAR FROM NOW())::int));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'series_catalog_year_valid_chk'
  ) THEN
    ALTER TABLE series_catalog
      ADD CONSTRAINT series_catalog_year_valid_chk
      CHECK (year IS NULL OR (year BETWEEN 1888 AND EXTRACT(YEAR FROM NOW())::int));
  END IF;
END$$;

-- CHECK: продолжительность эпизода положительная
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'episodes_catalog_duration_positive_chk'
  ) THEN
    ALTER TABLE episodes_catalog
      ADD CONSTRAINT episodes_catalog_duration_positive_chk
      CHECK (duration IS NULL OR duration > 0);
  END IF;
END$$;

-- CHECK: бюджет/сборы неотрицательные
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'films_catalog_money_non_negative_chk'
  ) THEN
    ALTER TABLE films_catalog
      ADD CONSTRAINT films_catalog_money_non_negative_chk
      CHECK ((budget IS NULL OR budget >= 0) AND (revenue IS NULL OR revenue >= 0));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'series_catalog_money_non_negative_chk'
  ) THEN
    ALTER TABLE series_catalog
      ADD CONSTRAINT series_catalog_money_non_negative_chk
      CHECK ((budget IS NULL OR budget >= 0) AND (revenue IS NULL OR revenue >= 0));
  END IF;
END$$;

-- Приводим created_at/updated_at к NOT NULL с DEFAULT now()
-- Сначала заполним NULL'ы текущим временем, затем установим NOT NULL
-- Films catalog
UPDATE films_catalog SET created_at = NOW() WHERE created_at IS NULL;
UPDATE films_catalog SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE films_catalog
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Series catalog
UPDATE series_catalog SET created_at = NOW() WHERE created_at IS NULL;
UPDATE series_catalog SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE series_catalog
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Пользовательские таблицы (если поля присутствуют)
UPDATE user_films SET created_at = NOW() WHERE created_at IS NULL;
UPDATE user_films SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE user_films
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE user_series SET created_at = NOW() WHERE created_at IS NULL;
UPDATE user_series SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE user_series
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE user_seasons SET created_at = NOW() WHERE created_at IS NULL;
UPDATE user_seasons SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE user_seasons
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE user_episodes SET created_at = NOW() WHERE created_at IS NULL;
UPDATE user_episodes SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE user_episodes
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;


