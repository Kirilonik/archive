interface RatingEditModalProps {
  isOpen: boolean;
  title: string;
  currentRating: number | null;
  ratingDraft: string;
  onRatingDraftChange: (value: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function RatingEditModal({
  isOpen,
  title,
  currentRating,
  ratingDraft,
  onRatingDraftChange,
  onSave,
  onCancel,
  saving,
}: RatingEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => !saving && onCancel()}>
      <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold text-text mb-2">Изменить оценку</div>
        <div className="text-sm text-textMuted mb-4">Обновите свою оценку для «{title}».</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-textMuted mb-1">Новая оценка (0-10)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              className="input"
              value={ratingDraft}
              onChange={(e) => onRatingDraftChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
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

