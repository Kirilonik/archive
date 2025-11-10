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

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolvedInput = resolveRequestInput(input);
  const doFetch = () =>
    fetch(resolvedInput, {
      ...init,
      credentials: 'include',
      headers: init?.headers instanceof Headers ? init.headers : new Headers(init?.headers),
    });

  let response = await doFetch();

  if (response.status === 401) {
    const refreshResponse = await fetch(resolveRequestInput('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshResponse.ok) {
      response = await doFetch();
    }
  }

  return response;
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

