import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { Card } from '../components/Card';
import { AddModal } from '../components/AddModal';
import { apiJson } from '../lib/api';
import type { LibraryItemUnion } from '../types';

const LOAD_STEP = 24;
const PAGE_SIZE = 24;

interface PaginationState {
  offset: number;
  total: number;
  done: boolean;
}

interface LibraryResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

function createPaginationState(): PaginationState {
  return { offset: 0, total: 0, done: false };
}

export function Home() {
  const [query, setQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [isGenresExpanded, setIsGenresExpanded] = useState(false);
  const [items, setItems] = useState<LibraryItemUnion[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [filmsState, setFilmsState] = useState<PaginationState>(createPaginationState);
  const [seriesState, setSeriesState] = useState<PaginationState>(createPaginationState);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const filmsStateRef = useRef(filmsState);
  const seriesStateRef = useRef(seriesState);
  
  // Собираем все уникальные жанры из библиотеки
  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>();
    items.forEach((item) => {
      if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach((genre) => genresSet.add(genre));
      }
    });
    return Array.from(genresSet).sort();
  }, [items]);

  // Фильтруем элементы по выбранным жанрам
  const filteredItems = useMemo(() => {
    if (selectedGenres.size === 0) return items;
    return items.filter((item) => {
      if (!item.genres || item.genres.length === 0) return false;
      return item.genres.some((genre) => selectedGenres.has(genre));
    });
  }, [items, selectedGenres]);

  const visibleItems = useMemo(() => {
    const count = visibleCount === 0 && filteredItems.length > 0 
      ? Math.min(LOAD_STEP, filteredItems.length) 
      : visibleCount;
    return filteredItems.slice(0, count);
  }, [filteredItems, visibleCount]);
  const hasMore = !filmsState.done || !seriesState.done;

  useEffect(() => {
    filmsStateRef.current = filmsState;
  }, [filmsState]);

  useEffect(() => {
    seriesStateRef.current = seriesState;
  }, [seriesState]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchResource = useCallback(
    (resource: 'films' | 'series', offset: number, signal: AbortSignal) => {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      return apiJson<LibraryResponse<any>>(`/api/${resource}?${params.toString()}`, { signal });
    },
    [query],
  );

  const loadMore = useCallback(
    async (reset = false) => {
      if (loadingRef.current) {
        if (!reset) return;
        abortRef.current?.abort();
        loadingRef.current = false;
        setIsLoading(false);
      }

      const baseFilmsState = reset ? createPaginationState() : filmsStateRef.current;
      const baseSeriesState = reset ? createPaginationState() : seriesStateRef.current;

      if (reset) {
        setItems([]);
        setVisibleCount(0);
        setFilmsState(createPaginationState());
        setSeriesState(createPaginationState());
      }

      const controller = new AbortController();
      abortRef.current = controller;
      loadingRef.current = true;
      setIsLoading(true);

      try {
        const [filmsData, seriesData] = await Promise.all([
          fetchResource('films', baseFilmsState.offset, controller.signal),
          fetchResource('series', baseSeriesState.offset, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        let nextLength = 0;
        setItems((prev) => {
          const base = reset ? [] : prev;
          const combined = [
            ...base,
            ...filmsData.items.map((f) => ({ ...f, _kind: 'film' as const })),
            ...seriesData.items.map((s) => ({ ...s, _kind: 'series' as const })),
          ];
          nextLength = combined.length;
          return combined;
        });

        setFilmsState({
          offset: filmsData.offset + filmsData.items.length,
          total: filmsData.total,
          done: !filmsData.hasMore,
        });
        setSeriesState({
          offset: seriesData.offset + seriesData.items.length,
          total: seriesData.total,
          done: !seriesData.hasMore,
        });

        if (reset) {
          setVisibleCount(Math.min(LOAD_STEP, nextLength));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Не удалось загрузить библиотеку', error);
        setItems([]);
        setVisibleCount(0);
        setFilmsState(createPaginationState());
        setSeriesState(createPaginationState());
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [fetchResource],
  );

  useEffect(() => {
    loadMore(true);
  }, [query, loadMore]);

  // Автоматически показываем начальные элементы при изменении фильтров
  useEffect(() => {
    if (filteredItems.length > 0 && visibleCount === 0) {
      setVisibleCount(Math.min(LOAD_STEP, filteredItems.length));
    }
  }, [filteredItems.length, visibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) => {
            const next = Math.min(filteredItems.length, prev + LOAD_STEP);
            return next === prev ? prev : next;
          });
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredItems.length]);

  useEffect(() => {
    if (visibleCount >= filteredItems.length && hasMore && !isLoading) {
      loadMore(false);
    }
  }, [visibleCount, filteredItems.length, hasMore, isLoading, loadMore]);

  const handleAddSuccess = useCallback(() => {
    // Перезагружаем библиотеку после успешного добавления
    loadMore(true);
  }, [loadMore]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      // Сбрасываем счетчик видимых элементов при изменении фильтров
      setVisibleCount(0);
      return next;
    });
  }, []);

  // Сбрасываем счетчик при сбросе фильтров
  const handleResetGenres = useCallback(() => {
    setSelectedGenres(new Set());
    setVisibleCount(0);
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="card">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary px-4 py-2 whitespace-nowrap"
            onClick={() => setIsAddModalOpen(true)}
          >
            Добавить
          </button>
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </div>
        {availableGenres.length > 0 && (
          <div className="mt-4 pt-4 border-t border-black/10">
            <button
              type="button"
              onClick={() => setIsGenresExpanded(!isGenresExpanded)}
              className="flex items-center gap-2 text-sm text-textMuted hover:text-text transition-colors mb-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 transition-transform ${isGenresExpanded ? 'rotate-90' : ''}`}
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
              Фильтр по жанрам
              {selectedGenres.size > 0 && (
                <span className="text-xs bg-[rgba(10,132,255,0.15)] text-[rgb(10,132,255)] px-2 py-0.5 rounded-full">
                  {selectedGenres.size}
                </span>
              )}
            </button>
            {isGenresExpanded && (
              <div className="flex flex-wrap gap-2">
                {selectedGenres.size > 0 && (
                  <button
                    type="button"
                    onClick={handleResetGenres}
                    className="btn px-4 py-2 text-sm text-red-600 border-red-300/50 bg-red-50 hover:bg-red-100 hover:border-red-400/50"
                  >
                    Сбросить
                  </button>
                )}
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`tag transition-all cursor-pointer ${
                      selectedGenres.has(genre)
                        ? 'bg-[rgba(10,132,255,0.15)] border-[rgba(10,132,255,0.3)] text-[rgb(10,132,255)]'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 mt-6">
        {visibleItems.map((it) => (
          <Card
            key={`${it._kind}-${it.id}`}
            kind={it._kind}
            id={it.id}
            title={it.title}
            poster_url={it.poster_url ?? undefined}
            poster_url_preview={it.poster_url_preview ?? undefined}
            rating={it.rating}
            rating_kinopoisk={it.rating_kinopoisk ?? undefined}
            my_rating={it.my_rating ?? undefined}
            status={it.status ?? undefined}
            genres={it.genres ?? undefined}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="py-6 text-center text-textMuted">
        {isLoading ? 'Загружаем ещё...' : hasMore ? 'Показать ещё' : filteredItems.length === 0 ? 'Ничего не найдено' : 'Это всё'}
      </div>
    </main>
  );
}
