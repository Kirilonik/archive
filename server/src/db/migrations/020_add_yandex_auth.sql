ALTER TABLE users
  ADD COLUMN IF NOT EXISTS yandex_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS users_yandex_id_unique_idx ON users (yandex_id) WHERE yandex_id IS NOT NULL;


