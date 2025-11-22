import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../lib/api';

export type AuthenticatedUser = {
  id: number;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
};

type LoginPayload = { email: string; password: string };
type RegisterPayload = { name?: string; email: string; password: string };

type AuthContextValue = {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const resp = await apiFetch('/api/auth/me');
      if (!resp.ok) {
        // 401/403 - это нормально для неавторизованных пользователей, не логируем
        if (resp.status !== 401 && resp.status !== 403) {
          console.error('Ошибка при проверке авторизации:', resp.status, resp.statusText);
        }
        setUser(null);
        return;
      }
      const data = await resp.json();
      setUser(data.user ?? null);
    } catch (error) {
      // Не логируем ошибки для /api/auth/me - это нормально, если пользователь не авторизован
      // Логируем только реальные ошибки сети
      if (error instanceof Error && error.message.includes('Превышено время ожидания')) {
        console.warn('Таймаут при проверке авторизации');
      }
      // Для остальных ошибок не логируем - это может быть просто отсутствие авторизации
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setUser(null);
      setLoading(false);
    });
  }, [refresh]);

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    const resp = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
      const data = await readJsonSafely(resp);
      let message = data?.error ?? 'Ошибка входа';
      if (resp.status === 403 && data?.requiresEmailVerification) {
        // Email не подтвержден - показываем специальную ошибку
        const error = new Error(message) as Error & { requiresEmailVerification?: boolean };
        error.requiresEmailVerification = true;
        throw error;
      }
      if (resp.status === 500) {
        message = 'Ошибка сервера. Проверьте, что сервер запущен и доступен.';
      } else if (resp.status >= 500) {
        message = 'Временная ошибка сервера. Попробуйте позже.';
      }
      throw new Error(message);
    }
    const data = await resp.json();
    setUser(data.user ?? null);
    toast.success('Вход выполнен успешно!');
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const resp = await apiFetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!resp.ok) {
      const data = await readJsonSafely(resp);
      let message = data?.error ?? 'Не удалось войти через Google';
      if (resp.status === 500) {
        message = 'Ошибка сервера. Проверьте, что сервер запущен и доступен.';
      } else if (resp.status >= 500) {
        message = 'Временная ошибка сервера. Попробуйте позже.';
      }
      throw new Error(message);
    }
    const data = await resp.json();
    setUser(data.user ?? null);
    toast.success('Вход через Google выполнен!');
  }, []);

  const register = useCallback(async ({ name, email, password }: RegisterPayload) => {
    const resp = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!resp.ok) {
      const data = await readJsonSafely(resp);
      const message = data?.error ?? 'Ошибка регистрации';
      const error = new Error(message) as Error & { status?: number };
      error.status = resp.status;
      throw error;
    }
    const data = await resp.json();
    // Не устанавливаем пользователя, так как требуется подтверждение email
    // setUser не вызывается - пользователь должен подтвердить email перед входом
    toast.success(data.message || 'Регистрация успешна! Проверьте вашу почту для подтверждения email.');
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refresh,
      loginWithGoogle,
    }),
    [user, loading, login, register, logout, refresh, loginWithGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

