import { Link, NavLink } from 'react-router-dom';
import { AvatarMenu } from './AvatarMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-[rgba(255,255,255,0.7)] backdrop-blur-[40px] backdrop-saturate-[180%] border-b border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-semibold text-text transition-opacity hover:opacity-80"
          >
            Архив
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? 'btn btn-primary px-3 py-1 flex items-center gap-1.5'
                    : 'btn px-3 py-1 bg-white/90 hover:bg-white border-black/15 hover:border-black/20 flex items-center gap-1.5'
                }
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 4l2 4h-3l-2-4h-3l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4zm-6.75 11.25L10 18l-1.25-2.75L6 14l2.75-1.25L10 10l1.25 2.75L14 14l-2.75 1.25zm5.69-3.31L16 14l-.94-2.06L13 11l2.06-.94L16 8l.94 2.06L19 11l-2.06.94z" />
                </svg>
                Кинематограф
              </NavLink>
              <NavLink
                to="/youtube"
                className={({ isActive }) =>
                  isActive
                    ? 'btn btn-primary px-3 py-1 flex items-center gap-1.5'
                    : 'btn px-3 py-1 bg-white/90 hover:bg-white border-black/15 hover:border-black/20 flex items-center gap-1.5'
                }
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </NavLink>
            </nav>
            <AvatarMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
