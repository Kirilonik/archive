import { Link, NavLink } from 'react-router-dom';
import { AvatarMenu } from './AvatarMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-[rgba(255,255,255,0.7)] backdrop-blur-[40px] backdrop-saturate-[180%] border-b border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-text transition-opacity hover:opacity-80">
            Архив
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-2">
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  isActive 
                    ? 'btn btn-primary px-3 py-1' 
                    : 'btn px-3 py-1 bg-white/90 hover:bg-white border-black/15 hover:border-black/20'
                }
              >
                Моя библиотека
              </NavLink>
            </nav>
            <AvatarMenu />
          </div>
        </div>
      </div>
    </header>
  );
}


