import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { Card } from '../components/Card';
import { apiJson } from '../lib/api';

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
  const [items, setItems] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [filmsState, setFilmsState] = useState<PaginationState>(createPaginationState);
  const [seriesState, setSeriesState] = useState<PaginationState>(createPaginationState);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const filmsStateRef = useRef(filmsState);
  const seriesStateRef = useRef(seriesState);
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
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
            ...filmsData.items.map((f: any) => ({ ...f, _kind: 'film' })),
            ...seriesData.items.map((s: any) => ({ ...s, _kind: 'series' })),
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

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) => {
            const next = Math.min(items.length, prev + LOAD_STEP);
            return next === prev ? prev : next;
          });
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    if (visibleCount >= items.length && hasMore && !isLoading) {
      loadMore(false);
    }
  }, [visibleCount, items.length, hasMore, isLoading, loadMore]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 mt-6">
        {visibleItems.map((it) => (
          <Card
            key={`${it._kind}-${it.id}`}
            kind={it._kind}
            id={it.id}
            title={it.title}
            poster_url={it.poster_url}
            rating={it.rating}
            my_rating={it.my_rating}
            status={it.status}
            genres={it.genres}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="py-6 text-center text-textMuted">
        {isLoading ? 'Загружаем ещё...' : hasMore ? 'Показать ещё' : items.length === 0 ? 'Ничего не найдено' : 'Это всё'}
      </div>
    </main>
  );
}
