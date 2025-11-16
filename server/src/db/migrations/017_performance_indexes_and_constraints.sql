-- ============================================
-- Оптимизация БД: индексы, ограничения, служебные триггеры
-- ============================================
-- Безопасно повторяемые операции с IF NOT EXISTS/ON CONFLICT

-- 1) Расширение для полнотекстового поиска/похожести по названию
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Индексы для каталога: быстрый поиск по названию (регистронезависимо, по подстроке), фильтрация/сортировка
-- Films catalog
CREATE INDEX IF NOT EXISTS idx_films_catalog_title_trgm
  ON films_catalog USING gin (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_films_catalog_year
  ON films_catalog (year);
CREATE INDEX IF NOT EXISTS idx_films_catalog_rating
  ON films_catalog (rating);
-- По массивам жанров/актеров (GIN по массивам)
CREATE INDEX IF NOT EXISTS idx_films_catalog_genres_gin
  ON films_catalog USING gin (genres);
CREATE INDEX IF NOT EXISTS idx_films_catalog_actors_gin
  ON films_catalog USING gin (actors);

-- Series catalog
CREATE INDEX IF NOT EXISTS idx_series_catalog_title_trgm
  ON series_catalog USING gin (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_series_catalog_year
  ON series_catalog (year);
CREATE INDEX IF NOT EXISTS idx_series_catalog_rating
  ON series_catalog (rating);
CREATE INDEX IF NOT EXISTS idx_series_catalog_genres_gin
  ON series_catalog USING gin (genres);
CREATE INDEX IF NOT EXISTS idx_series_catalog_actors_gin
  ON series_catalog USING gin (actors);

-- Seasons/Episodes catalog: ускоряем выборку по внешним ключам/датам
CREATE INDEX IF NOT EXISTS idx_episodes_catalog_season_number
  ON episodes_catalog (season_catalog_id, number);
CREATE INDEX IF NOT EXISTS idx_episodes_catalog_release_date_not_null
  ON episodes_catalog (release_date)
  WHERE release_date IS NOT NULL;

-- 3) Индексы для пользовательских таблиц: профильные выборки/страницы
-- user_films
CREATE INDEX IF NOT EXISTS idx_user_films_user_created_at_desc
  ON user_films (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_films_user_status
  ON user_films (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_films_user_my_rating
  ON user_films (user_id, my_rating DESC);

-- user_series
CREATE INDEX IF NOT EXISTS idx_user_series_user_created_at_desc
  ON user_series (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_series_user_status
  ON user_series (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_series_user_my_rating
  ON user_series (user_id, my_rating DESC);

-- user_seasons
CREATE INDEX IF NOT EXISTS idx_user_seasons_user_watched
  ON user_seasons (user_id, watched);

-- user_episodes
CREATE INDEX IF NOT EXISTS idx_user_episodes_user_watched
  ON user_episodes (user_id, watched);

-- 4) Ограничения качества данных: рейтинг в диапазоне 0..10
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'films_catalog_rating_range_chk'
  ) THEN
    ALTER TABLE films_catalog
      ADD CONSTRAINT films_catalog_rating_range_chk CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'series_catalog_rating_range_chk'
  ) THEN
    ALTER TABLE series_catalog
      ADD CONSTRAINT series_catalog_rating_range_chk CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_films_my_rating_range_chk'
  ) THEN
    ALTER TABLE user_films
      ADD CONSTRAINT user_films_my_rating_range_chk CHECK (my_rating IS NULL OR (my_rating >= 0 AND my_rating <= 10));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_series_my_rating_range_chk'
  ) THEN
    ALTER TABLE user_series
      ADD CONSTRAINT user_series_my_rating_range_chk CHECK (my_rating IS NULL OR (my_rating >= 0 AND my_rating <= 10));
  END IF;
END$$;

-- 5) Автообновление updated_at
-- Функция-триггер (одна на все таблицы с полем updated_at)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггеры (идемпотентно)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
      'films_catalog',
      'series_catalog',
      'user_films',
      'user_series',
      'user_seasons',
      'user_episodes'
  ]) AS tbl
  LOOP
    EXECUTE format('
      DO $inner$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = %L
        ) THEN
          CREATE TRIGGER %I
          BEFORE UPDATE ON %I
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;
      END $inner$;
    ', r.tbl || '_set_updated_at', r.tbl || '_set_updated_at', r.tbl);
  END LOOP;
END $$;


