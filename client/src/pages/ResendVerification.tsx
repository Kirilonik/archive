import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiJson } from '../lib/api';

export function ResendVerification() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Если email передан через state (из страницы логина или регистрации), устанавливаем его
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    // Если пользователь только что зарегистрировался, показываем специальное сообщение
    if (location.state?.justRegistered) {
      setJustRegistered(true);
      setSent(true);
      if (location.state?.message) {
        toast.success(location.state.message);
      }
    }
  }, [location.state]);

  async function submit() {
    if (!email) {
      toast.error('Введите email адрес');
      return;
    }

    try {
      setLoading(true);
      setAlreadyVerified(false);
      const result = await apiJson<{ message: string; alreadyVerified?: boolean }>('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (result.alreadyVerified) {
        setAlreadyVerified(true);
        setSent(true);
        toast.success('Email уже подтвержден. Вы можете войти в систему.');
      } else {
        setSent(true);
        toast.success('Письмо с подтверждением отправлено! Проверьте вашу почту.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка отправки письма');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-semibold text-text mb-4">
          {justRegistered ? 'Подтвердите ваш email' : 'Повторная отправка подтверждения'}
        </h1>
        
        {!sent ? (
          <>
            <p className="text-textMuted mb-6">
              Введите ваш email адрес, и мы отправим вам новую ссылку для подтверждения.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-textMuted mb-1">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button className="btn btn-primary px-4 py-2" disabled={loading} onClick={submit}>
                Отправить
              </button>
              <Link className="text-textMuted hover:text-text" to="/login">
                Вход
              </Link>
            </div>
          </>
        ) : (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            {justRegistered ? (
              <>
                <p className="text-center text-text mb-4">
                  Регистрация успешна! Мы отправили письмо с подтверждением на адрес <strong>{email}</strong>.
                </p>
                <p className="text-center text-textMuted text-sm mb-6">
                  Пожалуйста, проверьте вашу почту и перейдите по ссылке в письме для подтверждения email адреса.
                </p>
                <div className="space-y-3">
                  <div className="text-center">
                    <Link to="/login" className="btn btn-primary">
                      Перейти к входу
                    </Link>
                  </div>
                  <div className="text-center">
                    <button
                      onClick={async () => {
                        setJustRegistered(false);
                        setSent(false);
                        await submit();
                      }}
                      className="text-textMuted hover:text-text underline text-sm"
                    >
                      Отправить письмо повторно
                    </button>
                  </div>
                </div>
              </>
            ) : alreadyVerified ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-center text-text mb-6">
                  Email адрес <strong>{email}</strong> уже подтвержден. Вы можете войти в систему.
                </p>
                <div className="text-center">
                  <Link to="/login" className="btn btn-primary">
                    Перейти к входу
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-center text-text mb-6">
                  Если email существует и не подтвержден, письмо с подтверждением было отправлено на {email}.
                  Проверьте вашу почту.
                </p>
                <div className="text-center">
                  <Link to="/login" className="btn btn-primary">
                    Перейти к входу
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

