import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  // Валидация пароля на клиенте (соответствует серверной валидации)
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

    // Очищаем предыдущие ошибки
    setError(null);
    setPasswordError(null);

    // Валидация пароля на клиенте
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    // Валидация email
    if (!email || !email.includes('@')) {
      setError('Введите корректный email адрес');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPasswordError(null);

      await registerUser({ name: name || undefined, email, password });

      // После успешной регистрации переходим на страницу с информацией о подтверждении email
      setLoading(false);

      // Переход на страницу подтверждения email
      navigate('/check-email', {
        state: { email },
      });
    } catch (e: any) {
      let message = e?.message || 'Ошибка регистрации';
      const status = e?.status;

      // Если пользователь уже существует (409), предлагаем войти
      if (status === 409 || message.includes('уже существует') || message.includes('User exists')) {
        message = 'Пользователь с таким email уже зарегистрирован.';
        setError(message);
      } else {
        setError(message);

        // Если ошибка связана с паролем, показываем её под полем пароля
        if (message.includes('пароль') || message.includes('Пароль')) {
          setPasswordError(message);
        }
      }

      // Очищаем состояние загрузки, чтобы можно было попробовать снова
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-semibold text-text mb-4">Регистрация</h1>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-textMuted mb-1">Имя</label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1">Пароль</label>
              <PasswordInput
                className={passwordError ? 'border-red-400' : ''}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                  setError(null);
                }}
                disabled={loading}
                required
                autoComplete="new-password"
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-400" role="alert">
                  {passwordError}
                </p>
              )}
              {!passwordError && password && (
                <p className="mt-1 text-xs text-textMuted">
                  Требования: минимум 8 символов, заглавная и строчная буквы, цифра
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button type="submit" className="btn btn-primary px-4 py-2" disabled={loading}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
            <Link className="text-textMuted hover:text-text" to="/login">
              У меня уже есть аккаунт
            </Link>
          </div>
          {error && !passwordError && (
            <div className="mt-4 text-sm text-red-400" role="alert">
              <p className="mb-2">{error}</p>
              {error.includes('уже зарегистрирован') && (
                <div className="mt-3">
                  <Link
                    to="/login"
                    state={{ email }}
                    className="block text-primary hover:underline text-sm"
                  >
                    → Перейти к входу
                  </Link>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
