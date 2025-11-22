import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const googleContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('auth_error');
    if (error) {
      toast.error(`Ошибка авторизации: ${error}`);
      window.history.replaceState(null, '', '/login');
    }
  }, []);

  async function submit() {
    try {
      setLoading(true);
      await login({ email, password });
      navigate('/');
    } catch (e: any) {
      if (e?.requiresEmailVerification) {
        toast.error(e.message || 'Email не подтвержден');
        // Показываем ссылку на повторную отправку
        setTimeout(() => {
          navigate('/resend-verification', { state: { email } });
        }, 2000);
      } else {
        toast.error(e.message || 'Ошибка входа');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    if (googleLoading) return;
    
    const container = googleContainerRef.current;
    if (!container) return;

    // Ищем iframe Google внутри контейнера и программно кликаем на него
    const iframe = container.querySelector('iframe[title*="Google"], iframe[title*="Google аккаунтом"]') as HTMLIFrameElement | null;
    if (iframe) {
      try {
        // Кликаем в центре iframe
        const rect = iframe.getBoundingClientRect();
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        });
        
        // Пробуем несколько способов клика
        iframe.dispatchEvent(clickEvent);
        
        // Также пробуем напрямую кликнуть на iframe
        if (iframe.contentWindow) {
          try {
            // Пробуем кликнуть через contentWindow
            const iframeClickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: iframe.contentWindow!,
              clientX: rect.width / 2,
              clientY: rect.height / 2,
            });
            iframe.contentDocument?.body?.dispatchEvent(iframeClickEvent);
          } catch (e) {
            // Игнорируем CORS ошибки при доступе к iframe
          }
        }
      } catch (e) {
        console.error('Ошибка при клике на Google iframe:', e);
      }
    } else {
      // Если iframe еще не загружен, пробуем найти любую кнопку
      const googleButton = container.querySelector('[role="button"]') as HTMLElement | null;
      if (googleButton) {
        googleButton.click();
      }
    }
  };

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
        <div className="mt-6 flex justify-center">
          <div
            ref={googleContainerRef}
            className="relative flex h-11 w-11 items-center justify-center cursor-pointer"
            title="Войти через Google"
            onClick={handleContainerClick}
          >
            {/* Кастомная кнопка - визуальная обертка под GoogleLogin, не блокирует клики */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white text-black shadow hover:shadow-lg disabled:opacity-50">
                {googleLoading ? (
                  <div className="h-6 w-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                ) : (
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
                )}
              </div>
            </div>
            {/* GoogleLogin - поверх кастомной кнопки, полностью кликабелен и видим (но прозрачен) */}
            <div className="absolute inset-0" style={{ zIndex: 20, cursor: 'pointer' }}>
              <GoogleLogin
                containerProps={{
                  style: { 
                    width: '100%', 
                    height: '100%',
                    opacity: 0.01, // Практически невидим, но видимый достаточно для получения событий
                    pointerEvents: 'auto',
                  },
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
                  if (!googleLoading) {
                    toast.error('Вход через Google отменён');
                  }
                }}
                shape="circle"
                theme="outline"
                size="large"
                auto_select={false}
                use_fedcm_for_prompt={false}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
