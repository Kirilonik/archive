import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MarkdownEditor } from './MarkdownEditor';
import { StarRating } from './StarRating';
import { apiFetch } from '../lib/api';
import type { SuggestItem } from '../types';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  existingKpIds?: Set<number>;
}

export function AddModal({ isOpen, onClose, onSuccess, existingKpIds = new Set() }: AddModalProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SuggestItem | null>(null);
  const [myRating, setMyRating] = useState<number>(0);
  const [opinion, setOpinion] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Сброс состояния при закрытии модального окна
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setItems([]);
      setOpen(false);
      setSelected(null);
      setMyRating(0);
      setOpinion('');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  }, [isOpen]);

  // Debounce для поиска - запрос отправляется через 1 секунду после последнего изменения
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Если запрос пустой, сразу очищаем результаты
    if (!query.trim()) {
      setItems([]);
      setOpen(false);
      return;
    }

    // Устанавливаем новый таймер
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const resp = await apiFetch(`/api/search/suggest?query=${encodeURIComponent(query)}`);
        if (!resp.ok) {
          setItems([]);
          setOpen(false);
          return;
        }
        const data = await resp.json();
        // Фильтруем результаты: исключаем уже добавленные в библиотеку
        const filteredData = Array.isArray(data)
          ? data.filter((item: SuggestItem) => {
              // Если у элемента нет id (film_id), показываем его (на случай если film_id не определен)
              if (!item.id) return true;
              // Исключаем элементы, которые уже есть в библиотеке
              return !existingKpIds.has(item.id);
            })
          : [];
        setItems(filteredData);
        // Открываем предложения только если есть результаты
        if (filteredData.length > 0) {
          setOpen(true);
        }
      } catch {
        setItems([]);
        setOpen(false);
      }
    }, 500);

    // Очистка таймера при размонтировании
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, existingKpIds]);

  // Закрываем предложения при клике вне области поиска
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        // Не закрываем, если открыто модальное окно добавления
        if (!selected) {
          setOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selected, isOpen]);

  async function addToLibrary(item: SuggestItem) {
    setSelected(item);
    setMyRating(0);
    setOpinion('');
  }

  async function handleAdd() {
    if (!selected) return;

    try {
      const body: { title: string; film_id?: number; my_rating?: number; opinion?: string } = {
        title: selected.title,
      };
      // Передаем film_id (ID с Кинопоиска) если он есть в выбранном элементе
      if (selected.id) {
        body.film_id = selected.id;
      }
      if (myRating > 0) body.my_rating = myRating;
      if (opinion) body.opinion = opinion;
      const url = selected.isSeries ? '/api/series' : '/api/films';
      const resp = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Ошибка при добавлении' }));
        toast.error(errorData.error || 'Ошибка при добавлении в библиотеку');
        return;
      }
      toast.success(
        selected.isSeries ? 'Сериал добавлен в библиотеку' : 'Фильм добавлен в библиотеку',
      );
      setSelected(null);
      setMyRating(0);
      setOpinion('');
      setQuery('');
      setItems([]);
      setOpen(false);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      toast.error('Ошибка при добавлении в библиотеку. Попробуйте еще раз.');
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Модальное окно поиска */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[20px] z-50 px-4 pt-8"
        onClick={onClose}
      >
        <div className="mx-auto max-w-6xl">
          <div
            className="card card-modal relative overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-text font-semibold">Начните вводить название</div>
            <div className="relative" ref={searchContainerRef}>
              <div className="relative">
                <input
                  className="input w-full text-lg py-3 pr-10"
                  placeholder="Название фильма или сериала"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => items.length > 0 && setOpen(true)}
                />
                {query && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-textMuted hover:text-text transition-colors p-1"
                    onClick={() => {
                      setQuery('');
                      setItems([]);
                      setOpen(false);
                    }}
                    type="button"
                    title="Очистить"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {open && items.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 popover-panel max-h-[70vh] overflow-auto z-[100]">
                  <ul className="divide-y divide-black/10">
                    {items.map((it, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 p-3 hover:bg-black/5 transition-colors rounded-lg"
                      >
                        <div className="w-12 h-18 shrink-0 bg-black/5 rounded-soft overflow-hidden flex items-center justify-center">
                          {it.poster ? (
                            <img
                              src={it.poster}
                              alt={it.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-textMuted">Нет постера</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-text truncate font-medium">{it.title}</div>
                          <div className="text-sm text-textMuted">
                            {it.year ? `Год: ${it.year}` : ''}
                            {it.isSeries ? (it.year ? ' · ' : '') + 'Сериал' : ''}
                          </div>
                        </div>
                        <button
                          className="btn btn-primary px-3 py-1"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addToLibrary(it)}
                        >
                          Добавить
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[20px] flex items-center justify-center z-[60] px-4"
          onClick={() => {
            setSelected(null);
            setMyRating(0);
            setOpinion('');
          }}
        >
          <div className="card card-modal max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-xl font-semibold text-text mb-4">Добавить в библиотеку</div>

            {/* Информация о фильме/сериале */}
            <div className="flex items-center gap-4 mb-6 p-3 rounded-xl bg-black/5 border border-black/10">
              <div className="w-16 h-24 shrink-0 bg-black/5 rounded-soft overflow-hidden flex items-center justify-center">
                {selected.poster ? (
                  <img
                    src={selected.poster}
                    alt={selected.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-textMuted text-center px-1">Нет постера</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold text-text truncate">{selected.title}</div>
                <div className="text-sm text-textMuted mt-1">
                  {selected.year ? `Год: ${selected.year}` : ''}
                  {selected.isSeries ? (selected.year ? ' · ' : '') + 'Сериал' : ''}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-textMuted mb-2">Ваша оценка (0-10)</label>
                <StarRating value={myRating} onChange={setMyRating} max={10} />
              </div>
              <div>
                <label className="block text-sm text-textMuted mb-1">
                  Мнение (Markdown, необязательно)
                </label>
                <MarkdownEditor value={opinion} onChange={(val) => setOpinion(val)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="btn px-3 py-1"
                onClick={() => {
                  setSelected(null);
                  setMyRating(0);
                  setOpinion('');
                }}
              >
                Отмена
              </button>
              <button className="btn btn-primary px-3 py-1" onClick={handleAdd}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
