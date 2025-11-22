-- Добавляем колонку email_verified в таблицу users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Устанавливаем email_verified = true для существующих пользователей (уже были в системе)
UPDATE users
SET email_verified = true
WHERE email_verified IS NULL OR email_verified = false;

-- Создаем таблицу для токенов подтверждения email
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL
);

-- Индекс для быстрого поиска по токену
CREATE INDEX IF NOT EXISTS email_verification_tokens_token_idx ON email_verification_tokens(token) WHERE used_at IS NULL;

-- Индекс для поиска токенов пользователя
CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx ON email_verification_tokens(user_id) WHERE used_at IS NULL;

-- Индекс для очистки истекших токенов
CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_at_idx ON email_verification_tokens(expires_at);

