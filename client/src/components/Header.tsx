import { Link, NavLink } from 'react-router-dom';
import { AvatarMenu } from './AvatarMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-[rgba(255,255,255,0.06)] backdrop-blur-md border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-text">
            Архив
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-2">
              <NavLink to="/add" className={({ isActive }) => `btn px-3 py-1 ${isActive ? 'bg-white/10' : ''}`}>Добавить</NavLink>
              <NavLink to="/" className={({ isActive }) => `btn px-3 py-1 ${isActive ? 'bg-white/10' : ''}`}>Моя библиотека</NavLink>
            </nav>
            <AvatarMenu />
          </div>
        </div>
      </div>
    </header>
  );
}


