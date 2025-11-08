CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  series_id INT REFERENCES series(id) ON DELETE CASCADE,
  number INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seasons_series_id ON seasons (series_id);


