import { useState, useEffect } from 'react';
import { StarRating } from './StarRating';

interface RatingEditModalProps {
  isOpen: boolean;
  title: string;
  ratingDraft: string;
  onRatingDraftChange: (value: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function RatingEditModal({
  isOpen,
  title,
  ratingDraft,
  onRatingDraftChange,
  onSave,
  onCancel,
  saving,
}: RatingEditModalProps) {
  const [starRating, setStarRating] = useState<number>(0);

  useEffect(() => {
    if (ratingDraft) {
      const num = parseFloat(ratingDraft);
      setStarRating(isNaN(num) ? 0 : Math.round(num));
    } else {
      setStarRating(0);
    }
  }, [ratingDraft]);

  const handleStarChange = (value: number) => {
    setStarRating(value);
    onRatingDraftChange(String(value));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[20px] px-4" onClick={() => !saving && onCancel()}>
      <div className="card card-modal max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold text-text mb-2">Изменить оценку</div>
        <div className="text-sm text-textMuted mb-4">Обновите свою оценку для «{title}».</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-textMuted mb-2">Новая оценка (0-10)</label>
            <StarRating value={starRating} onChange={handleStarChange} max={10} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn px-3 py-1" onClick={onCancel} disabled={saving}>
            Отмена
          </button>
          <button className="btn btn-primary px-3 py-1" disabled={saving} onClick={onSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

