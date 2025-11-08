import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
      </div>
    </main>
  );
}
