ALTER TABLE films ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE series ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS films_user_id_idx ON films(user_id);
CREATE INDEX IF NOT EXISTS series_user_id_idx ON series(user_id);


