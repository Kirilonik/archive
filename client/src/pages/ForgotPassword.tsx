import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiJson } from '../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Введите корректный email адрес');
      return;
    }

    try {
      setLoading(true);
      await apiJson<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
      toast.success('Если указанный email существует, на него отправлено письмо с инструкциями');
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при отправке запроса');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-semibold text-text mb-4">Восстановление пароля</h1>
        
        {!submitted ? (
          <>
            <p className="text-textMuted text-sm mb-6">
              Введите email адрес, который вы использовали при регистрации. Мы отправим вам инструкции по восстановлению пароля.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-textMuted mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex items-center justify-between mt-6">
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2"
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : 'Отправить'}
                </button>
                <Link className="text-textMuted hover:text-text" to="/login">
                  Вернуться ко входу
                </Link>
              </div>
            </form>
          </>
        ) : (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text mb-4 text-center">
              Письмо отправлено!
            </h2>
            <p className="text-center text-text mb-4">
              Если указанный email <strong>{email}</strong> существует в нашей системе, на него отправлено письмо с инструкциями по восстановлению пароля.
            </p>
            <p className="text-center text-textMuted text-sm mb-6">
              Пожалуйста, проверьте вашу почту и перейдите по ссылке в письме. Если письмо не пришло, проверьте папку "Спам".
            </p>
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

