CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  season_id INT REFERENCES seasons(id) ON DELETE CASCADE,
  number INT NOT NULL,
  title VARCHAR(255),
  watched BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON episodes (season_id);


