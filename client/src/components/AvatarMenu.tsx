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
        className="w-9 h-9 rounded-full bg-white/90 border border-black/10 backdrop-blur-[20px] backdrop-saturate-[180%] flex items-center justify-center text-text overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:bg-white hover:border-black/15 hover:scale-105"
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
                <Link className="block w-full text-left px-3 py-2 hover:bg-black/5 rounded-xl text-text transition-all duration-200" to="/profile" onClick={() => setOpen(false)}>
                  Профиль
                </Link>
                <button
                  className="block w-full text-left px-3 py-2 rounded-xl text-red-600 border border-red-300/50 bg-red-50 hover:bg-red-100 transition-all duration-200"
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
                <Link className="block w-full text-left px-3 py-2 hover:bg-black/5 rounded-xl text-text transition-all duration-200" to="/login" onClick={() => setOpen(false)}>Войти</Link>
                <Link className="block w-full text-left px-3 py-2 hover:bg-black/5 rounded-xl text-text transition-all duration-200" to="/register" onClick={() => setOpen(false)}>Регистрация</Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


