import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  async function submit() {
    try {
      setLoading(true);
      setError(null);
      await registerUser({ name, email, password });
      // После успешной регистрации показываем сообщение о необходимости подтверждения
      toast.success('Регистрация успешна! Проверьте вашу почту для подтверждения email.');
      navigate('/login', { state: { message: 'Регистрация успешна! Пожалуйста, проверьте вашу почту и подтвердите email адрес перед входом.' } });
    } catch (e: any) {
      const message = e?.message || 'Ошибка регистрации';
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="card">
        <h1 className="text-2xl font-semibold text-text mb-4">Регистрация</h1>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-textMuted mb-1">Имя</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
          <button className="btn btn-primary px-4 py-2" disabled={loading} onClick={submit}>Создать</button>
          <Link className="text-textMuted hover:text-text" to="/login">У меня уже есть аккаунт</Link>
        </div>
        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
