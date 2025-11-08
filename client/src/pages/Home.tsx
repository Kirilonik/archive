import { useEffect, useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { Card } from '../components/Card';
import { apiFetch } from '../lib/api';

export function Home() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set('query', query);
    let cancelled = false;

    async function load() {
      try {
        const [filmsResp, seriesResp] = await Promise.all([
          apiFetch(`/api/films?${p.toString()}`),
          apiFetch(`/api/series?${p.toString()}`),
        ]);
        const films = filmsResp.ok ? await filmsResp.json() : [];
        const series = seriesResp.ok ? await seriesResp.json() : [];
        if (cancelled) return;
        const merged = [
          ...(films || []).map((f: any) => ({ ...f, _kind: 'film' })),
          ...(series || []).map((s: any) => ({ ...s, _kind: 'series' })),
        ];
        setItems(merged);
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

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
        {items.map((it) => (
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
    </main>
  );
}


