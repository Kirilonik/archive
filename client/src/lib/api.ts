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

function getCsrfTokenFromDocument(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('csrf_token='));
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match.split('=').slice(1).join('='));
  } catch {
    return null;
  }
}

function createHeaders(init?: RequestInit): Headers {
  if (init?.headers instanceof Headers) {
    return new Headers(init.headers);
  }
  return new Headers(init?.headers ?? undefined);
}

function attachCsrfHeader(headers: Headers, method: string): Headers {
  if (SAFE_METHODS.has(method) || headers.has('x-csrf-token')) {
    return headers;
  }
  const token = getCsrfTokenFromDocument();
  if (token) {
    headers.set('x-csrf-token', token);
  }
  return headers;
}

function resolveRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string') {
    if (API_BASE_URL && input.startsWith('/')) {
      return `${API_BASE_URL}${input}`;
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

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolvedInput = resolveRequestInput(input);
  const method = init?.method ? init.method.toUpperCase() : 'GET';
  const headers = attachCsrfHeader(createHeaders(init), method);
  
  // Объединяем сигналы: пользовательский и timeout
  const timeoutSignal = createTimeoutSignal(REQUEST_TIMEOUT);
  const userSignal = init?.signal;
  const combinedSignal = userSignal 
    ? (() => {
        const combined = new AbortController();
        const abort = () => combined.abort();
        timeoutSignal.addEventListener('abort', abort);
        userSignal.addEventListener('abort', abort);
        return combined.signal;
      })()
    : timeoutSignal;

  const doFetch = () =>
    fetch(resolvedInput, {
      ...init,
      signal: combinedSignal,
      credentials: 'include',
      headers,
    });

  try {
    let response = await doFetch();

    if (response.status === 401) {
      const refreshResponse = await fetch(resolveRequestInput('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        signal: createTimeoutSignal(REQUEST_TIMEOUT),
      });

      if (refreshResponse.ok) {
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

