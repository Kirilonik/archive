export interface AppConfig {
  apiBaseUrl: string;
  frontendUrl: string;
}

type EnvRecord = Record<string, string | undefined>;

function normalizeUrl(raw: string, key: string): string {
  let value = raw.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  try {
    const url = new URL(value);
    value = url.toString();
  } catch {
    throw new Error(`${key} must be a valid URL (received "${raw}")`);
  }
  return value.replace(/\/+$/, '');
}

export function resolveAppConfig(env: EnvRecord): AppConfig {
  const apiBaseUrlRaw = env.API_BASE_URL ?? env.VITE_API_TARGET ?? '';
  const frontendUrlRaw = env.FRONTEND_URL ?? env.VITE_FRONTEND_URL ?? 'http://localhost:5173';

  const apiBaseUrl = normalizeUrl(apiBaseUrlRaw, 'API_BASE_URL');
  const frontendUrl = normalizeUrl(frontendUrlRaw, 'FRONTEND_URL');

  return {
    apiBaseUrl,
    frontendUrl,
  };
}

