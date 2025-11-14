import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { pool } from '../config/db.js';

export const register = new Registry();

// Счетчик HTTP запросов
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Гистограмма времени ответа
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Gauge для активных соединений БД
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// Gauge для использования памяти
export const memoryUsage = new Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

// Счетчик ошибок
export const errorCounter = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Функция для обновления метрик БД
export async function updateDbMetrics() {
  try {
    const result = await pool.query(
      'SELECT count(*) as active FROM pg_stat_activity WHERE datname = current_database()',
    );
    const activeConnections = parseInt(result.rows[0]?.active || '0', 10);
    dbConnectionsActive.set(activeConnections);
  } catch {
    // Игнорируем ошибки при сборе метрик
  }
}

// Функция для обновления метрик памяти
export function updateMemoryMetrics() {
  const usage = process.memoryUsage();
  memoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ type: 'external' }, usage.external);
  memoryUsage.set({ type: 'rss' }, usage.rss);
}

// Обновляем метрики каждые 5 секунд
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    updateDbMetrics();
    updateMemoryMetrics();
  }, 5000);
}

