import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [yandexLoading, setYandexLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const location = useLocation();
  const googleContainerRef = useRef<HTMLDivElement | null>(null);
  const yandexButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('auth_success');
    const error = params.get('auth_error');
    if (success === 'yandex') {
      toast.success('Вход через Яндекс выполнен!');
      navigate('/login', { replace: true });
    } else if (error) {
      toast.error(`Ошибка авторизации: ${error}`);
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate]);

  async function submit() {
    try {
      setLoading(true);
      await login({ email, password });
      navigate('/');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-semibold text-text mb-4">Вход</h1>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-textMuted mb-1">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-textMuted mb-1">Пароль</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <button className="btn btn-primary px-4 py-2" disabled={loading} onClick={submit}>Войти</button>
          <Link className="text-textMuted hover:text-text" to="/register">Регистрация</Link>
        </div>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="relative flex h-11 w-11 items-center justify-center" title="Войти через Google">
            <GoogleLogin
              containerProps={{
                ref: googleContainerRef,
                className: 'absolute inset-0 opacity-0 pointer-events-auto',
              }}
              onSuccess={async (credentialResponse) => {
                if (!credentialResponse.credential) {
                  toast.error('Не удалось получить токен Google');
                  return;
                }
                try {
                  setGoogleLoading(true);
                  await loginWithGoogle(credentialResponse.credential);
                  navigate('/');
                } catch (error: any) {
                  toast.error(error?.message ?? 'Ошибка входа через Google');
                } finally {
                  setGoogleLoading(false);
                }
              }}
              onError={() => {
                if (!googleLoading) toast.error('Вход через Google отменён');
              }}
              shape="circle"
              theme="outline"
              size="large"
            />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white text-black shadow hover:shadow-lg"
              onClick={() => {
                const target = googleContainerRef.current?.querySelector('div[role="button"]') as HTMLDivElement | undefined;
                target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              }}
            >
              <svg viewBox="0 0 48 48" className="h-6 w-6">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.23 9.21 3.25l6.85-6.85C35.88 2.38 30.26 0 24 0 14.7 0 6.88 5.4 3.05 13.26l7.98 6.19C12.7 13.57 17.9 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.59-.15-3.13-.44-4.62H24v9.27h12.65c-.55 2.96-2.24 5.47-4.77 7.16l7.47 5.8C43.87 38.19 46.5 31.88 46.5 24.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M11.03 28.45c-.5-1.48-.79-3.06-.79-4.7s.29-3.22.79-4.7l-7.98-6.19C1.39 16.17 0 20.44 0 24.75s1.39 8.58 3.05 11.89l7.98-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 47.5c6.26 0 11.53-2.07 15.38-5.62l-7.47-5.8c-2.07 1.39-4.73 2.2-7.91 2.2-6.1 0-11.3-4.07-13.17-9.65l-7.98 6.19C6.88 42.6 14.7 47.5 24 47.5z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </button>
          </div>
          <button
            ref={yandexButtonRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white text-black shadow hover:shadow-lg disabled:opacity-60"
            onClick={() => {
              if (yandexLoading) return;
              setYandexLoading(true);
              window.location.href = '/api/auth/yandex/start';
            }}
            disabled={yandexLoading}
            aria-label="Войти через Яндекс"
            title="Войти через Яндекс"
          >
            <svg viewBox="0 0 48 48" className="h-6 w-6">
              <path
                fill="#FC3F1D"
                d="M47.5 24c0 12.98-10.52 23.5-23.5 23.5S.5 36.98.5 24 11.02.5 24 .5 47.5 11.02 47.5 24Z"
              />
              <path
                fill="#fff"
                d="M23.35 13.05c-5.38 0-8.66 3.2-8.66 7.82 0 3.14 1.29 5.15 3.58 6.19-2.64.95-3.95 2.98-3.95 5.98 0 4.18 2.95 6.96 7.95 6.96h6.13v-3.6h-5.56c-3.04 0-4.66-1.2-4.66-3.28 0-2.18 1.35-3.28 4.66-3.28h5.56v-3.6h-4.43c-3.02 0-4.68-1.1-4.68-3.08 0-1.94 1.68-3.21 4.68-3.21h4.43v-3.6h-4.76Z"
              />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
}
