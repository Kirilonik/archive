-- ============================================
-- Удаление старых таблиц после миграции на новую архитектуру
-- ВНИМАНИЕ: Выполнять только после проверки, что все данные успешно мигрированы!
-- ============================================

-- Удаляем старые таблицы в правильном порядке (с учетом внешних ключей)
DROP TABLE IF EXISTS episodes CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS series CASCADE;
DROP TABLE IF EXISTS films CASCADE;

