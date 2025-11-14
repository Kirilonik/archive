import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="w-9 h-9 rounded-full bg-white/10 border border-border flex items-center justify-center text-text overflow-hidden"
        onClick={() => setOpen((v) => !v)}
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm uppercase">
            {user?.name?.[0] ?? user?.email?.[0] ?? ''}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 avatar-menu-panel z-50">
          <div className="flex flex-col space-y-1">
            {user ? (
              <>
                <Link className="block w-full text-left px-3 py-2 hover:bg-white/10 rounded-xl text-text" to="/profile" onClick={() => setOpen(false)}>
                  Профиль
                </Link>
                <button
                  className="block w-full text-left px-3 py-2 rounded-xl text-red-200 border border-red-500/50 bg-red-600/20 hover:bg-red-600/30"
                  onClick={async () => {
                    setOpen(false);
                    await logout();
                    toast.success('Вы вышли из аккаунта');
                    navigate('/login');
                  }}
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link className="block w-full text-left px-3 py-2 hover:bg-white/10 rounded-xl text-text" to="/login" onClick={() => setOpen(false)}>Войти</Link>
                <Link className="block w-full text-left px-3 py-2 hover:bg-white/10 rounded-xl text-text" to="/register" onClick={() => setOpen(false)}>Регистрация</Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


