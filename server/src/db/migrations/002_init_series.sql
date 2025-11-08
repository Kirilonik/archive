CREATE TABLE IF NOT EXISTS series (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  poster_url TEXT,
  rating FLOAT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_title ON series (title);


