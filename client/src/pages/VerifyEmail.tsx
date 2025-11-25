import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiJson } from '../lib/api';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const navigate = useNavigate();

  const verifyEmail = useCallback(
    async (token: string) => {
      try {
        await apiJson<{ message: string }>('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        setStatus('success');
        setMessage('Email успешно подтвержден! Теперь вы можете войти в систему.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        const errorMessage = error?.message || 'Не удалось подтвердить email';
        setMessage(errorMessage);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Токен подтверждения не найден в ссылке');
      return;
    }

    verifyEmail(token);
  }, [token, verifyEmail]);

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-semibold text-text mb-4">Подтверждение email</h1>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-12 w-12 border-4 border-gray-300 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-textMuted">Подтверждение email...</p>
          </div>
        )}

        {status === 'success' && (
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
            <p className="text-center text-text mb-6">{message}</p>
            <div className="text-center">
              <Link to="/login" className="btn btn-primary">
                Перейти к входу
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
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
            <p className="text-center text-text mb-6">{message}</p>
            <div className="text-center">
              <Link to="/login" className="btn btn-primary">
                Вернуться ко входу
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
