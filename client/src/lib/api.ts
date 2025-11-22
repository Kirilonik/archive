const rawApiBaseUrl = typeof __API_BASE_URL__ !== 'undefined' ? __API_BASE_URL__ : '';

function resolveBrowserApiBaseUrl(): string {
  if (typeof window === 'undefined' || !rawApiBaseUrl) {
    return rawApiBaseUrl;
  }

  try {
    const url = new URL(rawApiBaseUrl);
    const hostname = url.hostname.toLowerCase();
    const isResolvableHostname =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.includes('.') ||
      /^[\d:]+$/.test(hostname);

    if (isResolvableHostname) {
      return url.toString();
    }

    return window.location.origin;
  } catch {
    return rawApiBaseUrl;
  }
}

const API_BASE_URL = resolveBrowserApiBaseUrl();

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

// Кэш для CSRF токена
let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

async function getCsrfTokenFromApi(): Promise<string | null> {
  // Если уже есть активный запрос, возвращаем его
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Если токен в кэше, возвращаем его
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  // Запрашиваем токен с сервера
  csrfTokenPromise = (async () => {
    try {
      const response = await fetch(resolveRequestInput('/api/csrf-token'), {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        csrfTokenCache = data.token || null;
        return csrfTokenCache;
      }
      return null;
    } catch {
      return null;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

function createHeaders(init?: RequestInit): Headers {
  if (init?.headers instanceof Headers) {
    return new Headers(init.headers);
  }
  return new Headers(init?.headers ?? undefined);
}

async function attachCsrfHeader(headers: Headers, method: string): Promise<Headers> {
  if (SAFE_METHODS.has(method) || headers.has('x-csrf-token')) {
    return headers;
  }
  const token = await getCsrfTokenFromApi();
  if (token) {
    headers.set('x-csrf-token', token);
  }
  return headers;
}

function resolveRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string') {
    // Если API_BASE_URL пустой (dev режим с Vite proxy), используем относительные пути
    if (!API_BASE_URL && input.startsWith('/')) {
      return input;
    }
    if (API_BASE_URL && input.startsWith('/')) {
      // Убираем trailing slash из API_BASE_URL, если есть
      const baseUrl = API_BASE_URL.replace(/\/+$/, '');
      return `${baseUrl}${input}`;
    }
    return input;
  }

  if (typeof URL !== 'undefined' && input instanceof URL) {
    if (
      API_BASE_URL &&
      typeof window !== 'undefined' &&
      input.origin === window.location.origin &&
      input.pathname.startsWith('/')
    ) {
      return new URL(input.pathname + input.search + input.hash, API_BASE_URL).toString();
    }
    return input;
  }

  return input;
}

const REQUEST_TIMEOUT = 30000; // 30 секунд

// Флаг для предотвращения бесконечного цикла при refresh токене
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

// Функция для объединения сигналов с правильной очисткой
function combineSignals(signal1: AbortSignal, signal2: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const combined = new AbortController();
  const cleanup: (() => void)[] = [];

  const abort1 = () => combined.abort();
  const abort2 = () => combined.abort();

  signal1.addEventListener('abort', abort1);
  signal2.addEventListener('abort', abort2);

  cleanup.push(() => {
    signal1.removeEventListener('abort', abort1);
    signal2.removeEventListener('abort', abort2);
  });

  return { signal: combined.signal, cleanup: () => cleanup.forEach(fn => fn()) };
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolvedInput = resolveRequestInput(input);
  const method = init?.method ? init.method.toUpperCase() : 'GET';
  const headers = await attachCsrfHeader(createHeaders(init), method);
  
  // Объединяем сигналы: пользовательский и timeout
  const timeoutSignal = createTimeoutSignal(REQUEST_TIMEOUT);
  const userSignal = init?.signal;
  
  let combinedSignal: AbortSignal;
  let cleanup: (() => void) | null = null;

  if (userSignal) {
    const combined = combineSignals(timeoutSignal, userSignal);
    combinedSignal = combined.signal;
    cleanup = combined.cleanup;
  } else {
    combinedSignal = timeoutSignal;
  }

  const doFetch = () =>
    fetch(resolvedInput, {
      ...init,
      signal: combinedSignal,
      credentials: 'include',
      headers,
    });

  try {
    let response = await doFetch();

    // Не пытаемся обновлять токен для auth эндпоинтов, чтобы избежать бесконечных циклов
    const urlString = typeof resolvedInput === 'string' 
      ? resolvedInput 
      : resolvedInput instanceof URL 
        ? resolvedInput.pathname 
        : '';
    const isAuthEndpoint = urlString.includes('/api/auth/me') || 
                          urlString.includes('/api/auth/refresh') ||
                          urlString.includes('/api/auth/logout') ||
                          urlString.includes('/api/auth/login') ||
                          urlString.includes('/api/auth/register') ||
                          urlString.includes('/api/auth/google');

    if (response.status === 401 && !isAuthEndpoint && !isRefreshing) {
      // Используем существующий промис, если refresh уже выполняется
      if (!refreshPromise) {
        refreshPromise = (async () => {
          isRefreshing = true;
          try {
            const refreshResponse = await fetch(resolveRequestInput('/api/auth/refresh'), {
              method: 'POST',
              credentials: 'include',
              signal: createTimeoutSignal(REQUEST_TIMEOUT),
            });
            return refreshResponse.ok;
          } finally {
            isRefreshing = false;
            refreshPromise = null;
          }
        })();
      }

      const refreshSuccess = await refreshPromise;
      if (refreshSuccess) {
        response = await doFetch();
      }
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (timeoutSignal.aborted) {
        throw new Error('Превышено время ожидания ответа от сервера');
      }
    }
    throw error;
  } finally {
    // Очищаем слушатели событий для предотвращения утечки памяти
    if (cleanup) {
      cleanup();
    }
  }
}

export async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await apiFetch(input, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = typeof error?.error === 'string' ? error.error : 'Неизвестная ошибка';
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

