// Установка переменных окружения для тестов
// Должно быть установлено ДО импорта любых модулей, которые используют env
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-min-32-characters-long-for-testing';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'test-jwt-refresh-secret-key-min-32-characters-long-for-testing';
process.env.ACCESS_TOKEN_TTL_MINUTES = process.env.ACCESS_TOKEN_TTL_MINUTES || '15';
process.env.REFRESH_TOKEN_TTL_DAYS = process.env.REFRESH_TOKEN_TTL_DAYS || '30';
process.env.PGHOST = process.env.PGHOST || 'localhost';
process.env.PGPORT = process.env.PGPORT || '5432';
process.env.PGUSER = process.env.PGUSER || 'postgres';
process.env.PGPASSWORD = process.env.PGPASSWORD || 'postgres';
process.env.PGDATABASE = process.env.PGDATABASE || 'media_archive_test';
process.env.KINOPOISK_API_KEY = process.env.KINOPOISK_API_KEY || '';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
