import { useLocation, Link } from 'react-router-dom';

export function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email || 'вашу почту';

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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text mb-4 text-center">
            Регистрация успешна!
          </h1>
          <p className="text-center text-text mb-4">
            Мы отправили письмо с подтверждением на адрес <strong>{email}</strong>.
          </p>
          <p className="text-center text-textMuted text-sm mb-6">
            Пожалуйста, проверьте вашу почту и перейдите по ссылке в письме для подтверждения email
            адреса.
          </p>
          <div className="text-center">
            <Link to="/app/login" className="btn btn-primary">
              Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
