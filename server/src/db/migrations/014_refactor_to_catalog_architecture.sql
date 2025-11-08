-- ============================================
-- Рефакторинг архитектуры БД: разделение на каталог и пользовательские данные
-- ============================================

-- ШАГ 1: Создаем таблицы каталога (общие данные, не зависят от пользователя)

-- Каталог фильмов
CREATE TABLE IF NOT EXISTS films_catalog (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  poster_url TEXT,
  rating FLOAT, -- рейтинг с Кинопоиска
  year INT,
  description TEXT,
  kp_is_series BOOLEAN,
  kp_episodes_count INT,
  kp_seasons_count INT,
  kp_id INT UNIQUE, -- уникальный ID с Кинопоиска
  director TEXT,
  budget BIGINT,
  revenue BIGINT,
  genres TEXT[],
  actors TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_films_catalog_title ON films_catalog (title);
CREATE INDEX IF NOT EXISTS idx_films_catalog_kp_id ON films_catalog (kp_id);

-- Каталог сериалов (структура аналогична films_catalog)
CREATE TABLE IF NOT EXISTS series_catalog (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  poster_url TEXT,
  rating FLOAT, -- рейтинг с Кинопоиска
  year INT,
  description TEXT,
  kp_is_series BOOLEAN,
  kp_episodes_count INT,
  kp_seasons_count INT,
  kp_id INT UNIQUE, -- уникальный ID с Кинопоиска
  director TEXT,
  budget BIGINT,
  revenue BIGINT,
  genres TEXT[],
  actors TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_catalog_title ON series_catalog (title);
CREATE INDEX IF NOT EXISTS idx_series_catalog_kp_id ON series_catalog (kp_id);

-- Каталог сезонов (привязан к сериалу из каталога)
CREATE TABLE IF NOT EXISTS seasons_catalog (
  id SERIAL PRIMARY KEY,
  series_catalog_id INT NOT NULL REFERENCES series_catalog(id) ON DELETE CASCADE,
  number INT NOT NULL,
  UNIQUE(series_catalog_id, number) -- один сезон с одним номером на сериал
);

CREATE INDEX IF NOT EXISTS idx_seasons_catalog_series_id ON seasons_catalog (series_catalog_id);

-- Каталог эпизодов (привязан к сезону из каталога)
CREATE TABLE IF NOT EXISTS episodes_catalog (
  id SERIAL PRIMARY KEY,
  season_catalog_id INT NOT NULL REFERENCES seasons_catalog(id) ON DELETE CASCADE,
  number INT NOT NULL,
  title VARCHAR(255),
  release_date DATE,
  duration INT, -- длительность в минутах
  UNIQUE(season_catalog_id, number) -- один эпизод с одним номером на сезон
);

CREATE INDEX IF NOT EXISTS idx_episodes_catalog_season_id ON episodes_catalog (season_catalog_id);
CREATE INDEX IF NOT EXISTS idx_episodes_catalog_release_date ON episodes_catalog (release_date);

-- ============================================
-- ШАГ 2: Создаем таблицы пользовательских данных
-- ============================================

-- Связь пользователя с фильмом (личные данные пользователя)
CREATE TABLE IF NOT EXISTS user_films (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  film_catalog_id INT NOT NULL REFERENCES films_catalog(id) ON DELETE CASCADE,
  my_rating FLOAT, -- личная оценка пользователя (0-10)
  opinion TEXT, -- личное мнение пользователя (markdown)
  status VARCHAR(50), -- статус просмотра (например: "watched", "watching", "planned")
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, film_catalog_id) -- один пользователь может иметь только одну запись о фильме
);

CREATE INDEX IF NOT EXISTS idx_user_films_user_id ON user_films (user_id);
CREATE INDEX IF NOT EXISTS idx_user_films_film_catalog_id ON user_films (film_catalog_id);

-- Связь пользователя с сериалом (личные данные пользователя)
CREATE TABLE IF NOT EXISTS user_series (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  series_catalog_id INT NOT NULL REFERENCES series_catalog(id) ON DELETE CASCADE,
  my_rating FLOAT, -- личная оценка пользователя (0-10)
  opinion TEXT, -- личное мнение пользователя (markdown)
  status VARCHAR(50), -- статус просмотра
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, series_catalog_id) -- один пользователь может иметь только одну запись о сериале
);

CREATE INDEX IF NOT EXISTS idx_user_series_user_id ON user_series (user_id);
CREATE INDEX IF NOT EXISTS idx_user_series_series_catalog_id ON user_series (series_catalog_id);

-- Статус просмотра сезона пользователем
CREATE TABLE IF NOT EXISTS user_seasons (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_catalog_id INT NOT NULL REFERENCES seasons_catalog(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, season_catalog_id) -- один пользователь может иметь только одну запись о сезоне
);

CREATE INDEX IF NOT EXISTS idx_user_seasons_user_id ON user_seasons (user_id);
CREATE INDEX IF NOT EXISTS idx_user_seasons_season_catalog_id ON user_seasons (season_catalog_id);

-- Статус просмотра эпизода пользователем
CREATE TABLE IF NOT EXISTS user_episodes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_catalog_id INT NOT NULL REFERENCES episodes_catalog(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, episode_catalog_id) -- один пользователь может иметь только одну запись об эпизоде
);

CREATE INDEX IF NOT EXISTS idx_user_episodes_user_id ON user_episodes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_episodes_episode_catalog_id ON user_episodes (episode_catalog_id);

-- ============================================
-- ШАГ 3: Миграция данных из старых таблиц (если они есть)
-- ============================================

-- Примечание: Эта миграция создает новую структуру.
-- Данные из старых таблиц (films, series, seasons, episodes) нужно будет мигрировать отдельно
-- через скрипт миграции данных, который:
-- 1. Создаст записи в каталогах (объединив дубликаты по kp_id или title+year)
-- 2. Создаст записи в user_films, user_series, user_seasons, user_episodes
-- 3. Удалит старые таблицы после проверки

