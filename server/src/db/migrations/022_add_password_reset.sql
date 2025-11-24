-- Создаем таблицу для токенов сброса пароля
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Индекс для быстрого поиска по токену
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token) WHERE used_at IS NULL;

-- Индекс для поиска токенов пользователя
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id) WHERE used_at IS NULL;

-- Индекс для очистки истекших токенов
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens(expires_at);

