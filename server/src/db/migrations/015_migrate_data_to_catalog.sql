-- ============================================
-- Миграция данных из старых таблиц в новую структуру каталога
-- ============================================

-- ШАГ 1: Миграция фильмов в каталог
-- Сначала мигрируем фильмы с kp_id
INSERT INTO films_catalog (
  title, poster_url, rating, year, description, kp_is_series, 
  kp_episodes_count, kp_seasons_count, kp_id, director, budget, revenue, genres, actors, created_at
)
SELECT DISTINCT ON (f.kp_id)
  f.title,
  f.poster_url,
  f.rating,
  f.year,
  f.description,
  f.kp_is_series,
  f.kp_episodes_count,
  f.kp_seasons_count,
  f.kp_id,
  f.director,
  f.budget,
  f.revenue,
  f.genres,
  f.actors,
  MIN(f.created_at) as created_at
FROM films f
WHERE f.user_id IS NOT NULL AND f.kp_id IS NOT NULL
GROUP BY f.kp_id, f.title, f.poster_url, f.rating, f.year, f.description, f.kp_is_series,
  f.kp_episodes_count, f.kp_seasons_count, f.director, f.budget, f.revenue, f.genres, f.actors
ORDER BY f.kp_id, MIN(f.created_at)
ON CONFLICT (kp_id) DO NOTHING;

-- Для фильмов без kp_id создаем записи по title+year
INSERT INTO films_catalog (
  title, poster_url, rating, year, description, kp_is_series, 
  kp_episodes_count, kp_seasons_count, kp_id, director, budget, revenue, genres, actors, created_at
)
SELECT DISTINCT ON (LOWER(f.title), COALESCE(f.year, 0))
  f.title,
  f.poster_url,
  f.rating,
  f.year,
  f.description,
  f.kp_is_series,
  f.kp_episodes_count,
  f.kp_seasons_count,
  f.kp_id,
  f.director,
  f.budget,
  f.revenue,
  f.genres,
  f.actors,
  MIN(f.created_at) as created_at
FROM films f
WHERE f.user_id IS NOT NULL AND f.kp_id IS NULL
GROUP BY LOWER(f.title), COALESCE(f.year, 0), f.title, f.poster_url, f.rating, f.year, f.description, 
  f.kp_is_series, f.kp_episodes_count, f.kp_seasons_count, f.kp_id, f.director, 
  f.budget, f.revenue, f.genres, f.actors
ORDER BY LOWER(f.title), COALESCE(f.year, 0), MIN(f.created_at);

-- ШАГ 2: Создаем связи пользователей с фильмами
INSERT INTO user_films (user_id, film_catalog_id, my_rating, opinion, status, created_at, updated_at)
SELECT 
  f.user_id,
  fc.id,
  f.my_rating,
  f.opinion,
  f.status,
  f.created_at,
  f.created_at as updated_at
FROM films f
JOIN films_catalog fc ON (
  (f.kp_id IS NOT NULL AND fc.kp_id = f.kp_id) OR
  (f.kp_id IS NULL AND LOWER(fc.title) = LOWER(f.title) AND COALESCE(fc.year, 0) = COALESCE(f.year, 0))
)
WHERE f.user_id IS NOT NULL
ON CONFLICT (user_id, film_catalog_id) DO UPDATE SET
  my_rating = EXCLUDED.my_rating,
  opinion = EXCLUDED.opinion,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- ШАГ 3: Миграция сериалов в каталог
-- Сначала мигрируем сериалы с kp_id
INSERT INTO series_catalog (
  title, poster_url, rating, year, description, kp_is_series, 
  kp_episodes_count, kp_seasons_count, kp_id, director, budget, revenue, genres, actors, created_at
)
SELECT DISTINCT ON (s.kp_id)
  s.title,
  s.poster_url,
  s.rating,
  s.year,
  s.description,
  s.kp_is_series,
  s.kp_episodes_count,
  s.kp_seasons_count,
  s.kp_id,
  s.director,
  s.budget,
  s.revenue,
  s.genres,
  s.actors,
  MIN(s.created_at) as created_at
FROM series s
WHERE s.user_id IS NOT NULL AND s.kp_id IS NOT NULL
GROUP BY s.kp_id, s.title, s.poster_url, s.rating, s.year, s.description, s.kp_is_series,
  s.kp_episodes_count, s.kp_seasons_count, s.director, s.budget, s.revenue, s.genres, s.actors
ORDER BY s.kp_id, MIN(s.created_at)
ON CONFLICT (kp_id) DO NOTHING;

-- Для сериалов без kp_id
INSERT INTO series_catalog (
  title, poster_url, rating, year, description, kp_is_series, 
  kp_episodes_count, kp_seasons_count, kp_id, director, budget, revenue, genres, actors, created_at
)
SELECT DISTINCT ON (LOWER(s.title), COALESCE(s.year, 0))
  s.title,
  s.poster_url,
  s.rating,
  s.year,
  s.description,
  s.kp_is_series,
  s.kp_episodes_count,
  s.kp_seasons_count,
  s.kp_id,
  s.director,
  s.budget,
  s.revenue,
  s.genres,
  s.actors,
  MIN(s.created_at) as created_at
FROM series s
WHERE s.user_id IS NOT NULL AND s.kp_id IS NULL
GROUP BY LOWER(s.title), COALESCE(s.year, 0), s.title, s.poster_url, s.rating, s.year, s.description, 
  s.kp_is_series, s.kp_episodes_count, s.kp_seasons_count, s.kp_id, s.director, 
  s.budget, s.revenue, s.genres, s.actors
ORDER BY LOWER(s.title), COALESCE(s.year, 0), MIN(s.created_at);

-- ШАГ 4: Создаем связи пользователей с сериалами
INSERT INTO user_series (user_id, series_catalog_id, my_rating, opinion, status, created_at, updated_at)
SELECT 
  s.user_id,
  sc.id,
  s.my_rating,
  s.opinion,
  s.status,
  s.created_at,
  s.created_at as updated_at
FROM series s
JOIN series_catalog sc ON (
  (s.kp_id IS NOT NULL AND sc.kp_id = s.kp_id) OR
  (s.kp_id IS NULL AND LOWER(sc.title) = LOWER(s.title) AND COALESCE(sc.year, 0) = COALESCE(s.year, 0))
)
WHERE s.user_id IS NOT NULL
ON CONFLICT (user_id, series_catalog_id) DO UPDATE SET
  my_rating = EXCLUDED.my_rating,
  opinion = EXCLUDED.opinion,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- ШАГ 5: Миграция сезонов в каталог
INSERT INTO seasons_catalog (series_catalog_id, number)
SELECT DISTINCT
  sc.id,
  se.number
FROM seasons se
JOIN series s ON se.series_id = s.id
JOIN series_catalog sc ON (
  (s.kp_id IS NOT NULL AND sc.kp_id = s.kp_id) OR
  (s.kp_id IS NULL AND LOWER(sc.title) = LOWER(s.title) AND COALESCE(sc.year, 0) = COALESCE(s.year, 0))
)
WHERE s.user_id IS NOT NULL
ON CONFLICT (series_catalog_id, number) DO NOTHING;

-- ШАГ 6: Создаем связи пользователей с сезонами
INSERT INTO user_seasons (user_id, season_catalog_id, watched, created_at, updated_at)
SELECT 
  s.user_id,
  sc_catalog.id,
  se.watched,
  NOW() as created_at,
  NOW() as updated_at
FROM seasons se
JOIN series s ON se.series_id = s.id
JOIN series_catalog sc ON (
  (s.kp_id IS NOT NULL AND sc.kp_id = s.kp_id) OR
  (s.kp_id IS NULL AND LOWER(sc.title) = LOWER(s.title) AND COALESCE(sc.year, 0) = COALESCE(s.year, 0))
)
JOIN seasons_catalog sc_catalog ON sc_catalog.series_catalog_id = sc.id AND sc_catalog.number = se.number
WHERE s.user_id IS NOT NULL
ON CONFLICT (user_id, season_catalog_id) DO UPDATE SET
  watched = EXCLUDED.watched,
  updated_at = EXCLUDED.updated_at;

-- ШАГ 7: Миграция эпизодов в каталог
INSERT INTO episodes_catalog (season_catalog_id, number, title, release_date, duration)
SELECT DISTINCT
  sc_catalog.id,
  e.number,
  e.title,
  e.release_date,
  e.duration
FROM episodes e
JOIN seasons se ON e.season_id = se.id
JOIN series s ON se.series_id = s.id
JOIN series_catalog sc ON (
  (s.kp_id IS NOT NULL AND sc.kp_id = s.kp_id) OR
  (s.kp_id IS NULL AND LOWER(sc.title) = LOWER(s.title) AND COALESCE(sc.year, 0) = COALESCE(s.year, 0))
)
JOIN seasons_catalog sc_catalog ON sc_catalog.series_catalog_id = sc.id AND sc_catalog.number = se.number
WHERE s.user_id IS NOT NULL
ON CONFLICT (season_catalog_id, number) DO NOTHING;

-- ШАГ 8: Создаем связи пользователей с эпизодами
INSERT INTO user_episodes (user_id, episode_catalog_id, watched, created_at, updated_at)
SELECT 
  s.user_id,
  ec_catalog.id,
  e.watched,
  NOW() as created_at,
  NOW() as updated_at
FROM episodes e
JOIN seasons se ON e.season_id = se.id
JOIN series s ON se.series_id = s.id
JOIN series_catalog sc ON (
  (s.kp_id IS NOT NULL AND sc.kp_id = s.kp_id) OR
  (s.kp_id IS NULL AND LOWER(sc.title) = LOWER(s.title) AND COALESCE(sc.year, 0) = COALESCE(s.year, 0))
)
JOIN seasons_catalog sc_catalog ON sc_catalog.series_catalog_id = sc.id AND sc_catalog.number = se.number
JOIN episodes_catalog ec_catalog ON ec_catalog.season_catalog_id = sc_catalog.id AND ec_catalog.number = e.number
WHERE s.user_id IS NOT NULL
ON CONFLICT (user_id, episode_catalog_id) DO UPDATE SET
  watched = EXCLUDED.watched,
  updated_at = EXCLUDED.updated_at;

