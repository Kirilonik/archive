-- Demo seed data (idempotent-ish via ON CONFLICT where possible)

INSERT INTO users (name, email, avatar_url)
VALUES ('Demo User', 'demo@example.com', NULL)
ON CONFLICT (email) DO NOTHING;

-- Тестовые фильмы и сериалы удалены - используйте страницу "Добавить" для добавления контента


