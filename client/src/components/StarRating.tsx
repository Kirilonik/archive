import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export function StarRating({ value, onChange, max = 10 }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleStarClick = (rating: number) => {
    onChange(rating);
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayValue;

        return (
          <button
            key={i}
            type="button"
            className="focus:outline-none transition-all hover:scale-125 active:scale-95"
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseLeave={() => setHoverValue(null)}
            aria-label={`Оценить ${starValue} из ${max}`}
          >
            <svg
              className={`w-10 h-10 transition-all duration-200 ${
                isFilled
                  ? 'text-amber-500 fill-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.5)]'
                  : 'text-amber-200 fill-amber-200/40'
              }`}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
      {value > 0 && (
        <>
          <span className="ml-3 text-sm text-textMuted font-medium">
            {value} / {max}
          </span>
          <button
            type="button"
            className="btn ml-3 px-3 py-1 text-sm text-red-600 border-red-300/50 bg-red-50 hover:bg-red-100 hover:border-red-400/50"
            onClick={() => onChange(0)}
          >
            Сбросить
          </button>
        </>
      )}
    </div>
  );
}
