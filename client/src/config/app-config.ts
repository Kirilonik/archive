export interface AppConfig {
  apiBaseUrl: string;
  frontendUrl: string;
}

type EnvRecord = Record<string, string | undefined>;

function normalizeUrl(raw: string, key: string, required: boolean = true): string {
  let value = raw.trim();
  if (!value) {
    if (required) {
      throw new Error(`${key} is required`);
    }
    return '';
  }
  try {
    const url = new URL(value);
    value = url.toString();
  } catch {
    if (required) {
      throw new Error(`${key} must be a valid URL (received "${raw}")`);
    }
    return '';
  }
  return value.replace(/\/+$/, '');
}

export function resolveAppConfig(env: EnvRecord): AppConfig {
  const apiBaseUrlRaw = env.API_BASE_URL ?? env.VITE_API_TARGET ?? '';
  const frontendUrlRaw = env.FRONTEND_URL ?? env.VITE_FRONTEND_URL ?? 'http://localhost:5173';

  // В dev режиме API_BASE_URL может быть пустым (используется Vite proxy)
  // Для сервера API_BASE_URL также может быть пустым (сервер сам является API)
  // API_BASE_URL требуется только для клиента в production при сборке через Vite
  // При сборке клиента Vite будет использовать переменные окружения, поэтому проверяем только при выполнении в браузере
  const isBrowser = typeof window !== 'undefined';
  const isDev = env.NODE_ENV !== 'production' && !env.API_BASE_URL;

  // API_BASE_URL требуется только для клиента в production в браузере
  // Для сервера и dev режима он опциональный
  const apiBaseUrlRequired = !isDev && isBrowser && env.NODE_ENV === 'production';

  let apiBaseUrl = '';
  if (apiBaseUrlRaw) {
    apiBaseUrl = normalizeUrl(apiBaseUrlRaw, 'API_BASE_URL', apiBaseUrlRequired);
  } else if (!apiBaseUrlRequired) {
    // Для сервера и dev режима пустая строка - это нормально
    apiBaseUrl = '';
  } else {
    // Только для клиента в production в браузере требуем API_BASE_URL
    throw new Error('API_BASE_URL is required for client in production');
  }

  const frontendUrl =
    normalizeUrl(frontendUrlRaw, 'FRONTEND_URL', false) || 'http://localhost:5173';

  return {
    apiBaseUrl,
    frontendUrl,
  };
}

