import { Link } from 'react-router-dom';

interface Props {
  kind: 'film' | 'series';
  id: number;
  title: string;
  poster_url?: string;
  poster_url_preview?: string;
  rating_kinopoisk?: number;
  status?: string;
  genres?: string[];
  my_rating?: number;
}

export function Card({ kind, id, title, poster_url, poster_url_preview, rating_kinopoisk, status, genres, my_rating }: Props) {
  const href = kind === 'film' ? `/films/${id}` : `/series/${id}`;
  const imageSrc = poster_url_preview || poster_url;
  const kpRating = typeof rating_kinopoisk === 'number' ? Math.round(rating_kinopoisk * 10) / 10 : null;
  return (
    <Link to={href} className="card overflow-hidden p-0 relative">
      <div className="aspect-[2/3] bg-black/30 flex items-center justify-center relative">
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="text-sm text-textMuted px-2 text-center">Нет постера</span>
        )}
      </div>
      <div className="p-3">
        <div className="font-medium line-clamp-2 text-text">{title}</div>
        <div className="flex items-center gap-2 mt-2">
          {kpRating != null && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shadow bg-orange-500/90 text-black">
              KP {kpRating}
            </span>
          )}
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shadow bg-gradient-to-r from-indigo-400 via-fuchsia-500 to-pink-500 text-white">
            Я {typeof my_rating === 'number' ? Math.round(my_rating * 10) / 10 : '—'}
          </span>
        </div>
        {status && <div className="text-xs text-textMuted mt-1">{status}</div>}
        {genres && genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {genres.slice(0, 3).map((g, i) => (
          <span key={i} className="tag">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}


