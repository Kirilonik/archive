interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemType: 'фильма' | 'сериала';
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  deleting: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  itemType,
  onConfirm,
  onCancel,
  deleting,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[20px] px-4"
      onClick={() => !deleting && onCancel()}
    >
      <div className="card card-modal max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold text-text mb-2">Удалить {itemType}</div>
        <div className="text-sm text-textMuted mb-4">
          {itemType === 'фильма' ? (
            <>Фильм «{title}» будет удалён из библиотеки. Это действие нельзя отменить.</>
          ) : (
            <>
              Сериал «{title}» и все его сезоны/эпизоды будут удалены. Это действие нельзя отменить.
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn px-3 py-1" onClick={onCancel} disabled={deleting}>
            Отмена
          </button>
          <button
            className="btn px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white border border-red-500/40"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Удаление…' : 'Да, удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}
