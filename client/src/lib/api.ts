export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const doFetch = () =>
    fetch(input, {
      ...init,
      credentials: 'include',
      headers: init?.headers instanceof Headers ? init.headers : new Headers(init?.headers),
    });

  let response = await doFetch();

  if (response.status === 401) {
    const refreshResponse = await fetch('/api/auth/refresh', {
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

