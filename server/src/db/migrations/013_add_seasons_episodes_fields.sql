-- Добавляем поле watched для сезонов
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS watched BOOLEAN DEFAULT FALSE;

-- Добавляем поля release_date и duration для эпизодов
ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS release_date DATE,
  ADD COLUMN IF NOT EXISTS duration INT; -- длительность в минутах

-- Создаем индекс для быстрого поиска по дате выхода
CREATE INDEX IF NOT EXISTS idx_episodes_release_date ON episodes (release_date);

