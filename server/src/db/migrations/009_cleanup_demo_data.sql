-- Удаление тестовых данных из БД

-- Удаляем тестовые фильмы
DELETE FROM films WHERE title IN ('Inception', 'Interstellar');

-- Удаляем тестовые сериалы и связанные данные
DELETE FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE series_id IN (SELECT id FROM series WHERE title = 'Breaking Bad'));
DELETE FROM seasons WHERE series_id IN (SELECT id FROM series WHERE title = 'Breaking Bad');
DELETE FROM series WHERE title = 'Breaking Bad';

