-- Таблица для хранения OAuth токенов YouTube пользователей
CREATE TABLE IF NOT EXISTS youtube_oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT, -- Разрешения, которые были запрошены
  token_type VARCHAR(50) DEFAULT 'Bearer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- Один набор токенов на пользователя
);

-- Индекс для быстрого поиска по пользователю
CREATE INDEX IF NOT EXISTS youtube_oauth_tokens_user_id_idx ON youtube_oauth_tokens(user_id);

-- Индекс для поиска истекших токенов (для обновления)
CREATE INDEX IF NOT EXISTS youtube_oauth_tokens_expires_at_idx ON youtube_oauth_tokens(expires_at);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_youtube_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER youtube_oauth_tokens_updated_at_trigger
  BEFORE UPDATE ON youtube_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_youtube_oauth_tokens_updated_at();

