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
  const isDev = env.NODE_ENV !== 'production' && !env.API_BASE_URL;
  const apiBaseUrl = isDev ? '' : normalizeUrl(apiBaseUrlRaw, 'API_BASE_URL', true);
  const frontendUrl = normalizeUrl(frontendUrlRaw, 'FRONTEND_URL', false) || 'http://localhost:5173';

  return {
    apiBaseUrl,
    frontendUrl,
  };
}

