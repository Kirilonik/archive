import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiJson } from '../lib/api';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Токен сброса пароля не найден в ссылке');
    } else {
      setStatus('form');
    }
  }, [token]);

  // Валидация пароля на клиенте
  function validatePassword(password: string): string | null {
    if (password.length < 8) {
      return 'Пароль должен содержать минимум 8 символов';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну заглавную букву';
    }
    if (!/[a-z]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну строчную букву';
    }
    if (!/[0-9]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну цифру';
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setError('Токен сброса пароля не найден');
      return;
    }

    // Очищаем предыдущие ошибки
    setError('');

    // Валидация пароля
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setError(passwordValidationError);
      toast.error(passwordValidationError);
      return;
    }

    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      toast.error('Пароли не совпадают');
      return;
    }

    try {
      setLoading(true);
      await apiJson<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      setStatus('success');
      toast.success('Пароль успешно изменен!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      const errorMessage = error?.message || 'Не удалось сбросить пароль';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="card">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-12 w-12 border-4 border-gray-300 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-textMuted">Загрузка...</p>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="card">
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text mb-4 text-center">
              Пароль успешно изменен!
            </h1>
            <p className="text-center text-text mb-6">
              Ваш пароль был успешно изменен. Теперь вы можете войти в систему с новым паролем.
            </p>
            <div className="text-center">
              <Link to="/login" className="btn btn-primary">
                Перейти к входу
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="card">
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text mb-4 text-center">Ошибка</h1>
            <p className="text-center text-text mb-6">{error}</p>
            <div className="text-center space-y-2">
              <Link to="/forgot-password" className="btn btn-primary block">
                Запросить новую ссылку
              </Link>
              <Link to="/login" className="text-textMuted hover:text-text text-sm">
                Вернуться ко входу
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-semibold text-text mb-4">Сброс пароля</h1>
        <p className="text-textMuted text-sm mb-6">Введите новый пароль для вашего аккаунта.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-textMuted mb-1">Новый пароль</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите новый пароль"
              required
              disabled={loading}
            />
            <p className="text-textMuted text-xs mt-1">
              Минимум 8 символов, заглавная и строчная буквы, цифра
            </p>
          </div>
          <div>
            <label className="block text-sm text-textMuted mb-1">Подтвердите пароль</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите новый пароль"
              required
              disabled={loading}
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex items-center justify-between mt-6">
            <button type="submit" className="btn btn-primary px-4 py-2" disabled={loading}>
              {loading ? 'Сброс...' : 'Сбросить пароль'}
            </button>
            <Link className="text-textMuted hover:text-text" to="/login">
              Вернуться ко входу
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
