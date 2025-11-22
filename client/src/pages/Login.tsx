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
  const [googleLoginReady, setGoogleLoginReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('auth_error');
    if (error) {
      toast.error(`Ошибка авторизации: ${error}`);
      window.history.replaceState(null, '', '/login');
    }
  }, []);

  // Даем время GoogleLogin компоненту инициализироваться
  useEffect(() => {
    const timer = setTimeout(() => {
      setGoogleLoginReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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

  const handleCustomButtonClick = () => {
    // Пытаемся найти и кликнуть на реальную кнопку Google несколькими способами
    const container = googleContainerRef.current;
    if (!container) {
      toast.error('Ошибка инициализации Google Login');
      return;
    }

    if (!googleLoginReady) {
      toast.error('Кнопка Google еще не готова. Подождите немного.');
      return;
    }

    // Временно включаем pointer-events для GoogleLogin и отключаем для кастомной кнопки
    const googleLoginContainer = container.querySelector('[class*="opacity-0"]') as HTMLElement;
    const customButton = container.querySelector('button[aria-label="Войти через Google"]') as HTMLElement;
    
    if (googleLoginContainer) {
      googleLoginContainer.style.pointerEvents = 'auto';
      googleLoginContainer.style.zIndex = '30';
    }
    
    if (customButton) {
      customButton.style.pointerEvents = 'none';
      customButton.style.zIndex = '10';
    }

    // Функция для поиска и клика по кнопке Google
    const findAndClickGoogleButton = (): boolean => {
      // Пробуем разные селекторы для кнопки Google
      let googleButton: HTMLElement | null = null;
      
      // Способ 1: поиск по role="button" (наиболее надежный способ)
      googleButton = container.querySelector('div[role="button"]') as HTMLElement;
      
      // Способ 2: поиск через все div элементы с role="button"
      if (!googleButton) {
        const allDivs = container.querySelectorAll('div');
        for (const div of Array.from(allDivs)) {
          if (div.getAttribute('role') === 'button') {
            googleButton = div as HTMLElement;
            break;
          }
        }
      }
      
      // Способ 3: поиск по iframe и затем по кнопке внутри (для некоторых версий Google OAuth)
      if (!googleButton) {
        const iframe = container.querySelector('iframe');
        if (iframe) {
          try {
            // Проверяем, доступен ли contentDocument (может быть заблокирован CORS)
            if (iframe.contentDocument) {
              googleButton = iframe.contentDocument.querySelector('div[role="button"]') as HTMLElement;
            }
          } catch (e) {
            // Игнорируем ошибки доступа к iframe (CORS)
            console.debug('Не удалось получить доступ к iframe:', e);
          }
        }
      }

      if (googleButton) {
        // Пробуем разные способы клика
        try {
          googleButton.click();
          // Восстанавливаем состояние после клика
          setTimeout(() => {
            if (googleLoginContainer) {
              googleLoginContainer.style.pointerEvents = 'none';
              googleLoginContainer.style.zIndex = '2';
            }
            if (customButton) {
              customButton.style.pointerEvents = 'auto';
              customButton.style.zIndex = '20';
            }
          }, 100);
          return true;
        } catch (e) {
          console.error('Ошибка при клике на Google кнопку:', e);
          // Восстанавливаем состояние при ошибке
          if (googleLoginContainer) {
            googleLoginContainer.style.pointerEvents = 'none';
            googleLoginContainer.style.zIndex = '2';
          }
          if (customButton) {
            customButton.style.pointerEvents = 'auto';
            customButton.style.zIndex = '20';
          }
          // Если обычный click не работает, пробуем программно создать событие
          try {
            const mouseEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            });
            googleButton.dispatchEvent(mouseEvent);
            return true;
          } catch (e2) {
            console.error('Ошибка при dispatchEvent на Google кнопку:', e2);
            return false;
          }
        }
      }
      return false;
    };

    // Пытаемся найти кнопку несколько раз с небольшими задержками (на случай, если она еще рендерится)
    let attempts = 0;
    const maxAttempts = 5;
    const attemptClick = () => {
      attempts++;
      if (findAndClickGoogleButton()) {
        return; // Успешно кликнули
      }
      
      // Восстанавливаем состояние перед следующей попыткой или при неудаче
      if (attempts >= maxAttempts) {
        if (googleLoginContainer) {
          googleLoginContainer.style.pointerEvents = 'none';
          googleLoginContainer.style.zIndex = '2';
        }
        if (customButton) {
          customButton.style.pointerEvents = 'auto';
          customButton.style.zIndex = '20';
        }
        console.error('Google кнопка не найдена после', maxAttempts, 'попыток');
        toast.error('Не удалось инициализировать вход через Google. Попробуйте обновить страницу или проверьте консоль браузера.');
      } else if (attempts < maxAttempts) {
        // Ждем немного и пробуем снова
        setTimeout(attemptClick, 200);
      }
    };

    attemptClick();
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
            className="relative flex h-11 w-11 items-center justify-center"
            title="Войти через Google"
          >
            <GoogleLogin
              containerProps={{
                className: 'absolute inset-0 opacity-0 pointer-events-none',
                style: { zIndex: 2 },
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
            <button
              type="button"
              className="relative z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white text-black shadow hover:shadow-lg disabled:opacity-50 cursor-pointer"
              onClick={handleCustomButtonClick}
              disabled={googleLoading}
              aria-label="Войти через Google"
            >
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
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
