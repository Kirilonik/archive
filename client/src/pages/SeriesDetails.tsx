import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { apiFetch } from '../lib/api';

export function SeriesDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState<any | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);

  // inline edit states
  const [ratingEditMode, setRatingEditMode] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<string>('');
  const [opinionEditMode, setOpinionEditMode] = useState(false);
  const [opinionDraft, setOpinionDraft] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadSeries() {
      try {
        const resp = await apiFetch(`/api/series/${id}`);
        if (!resp.ok) throw new Error();
        const payload = await resp.json();
        if (cancelled) return;
        setSeries(payload);
        setRatingDraft(payload?.my_rating != null ? String(payload.my_rating) : '');
        setOpinionDraft(payload?.opinion ?? '');
      } catch {
        if (!cancelled) setSeries(null);
      }
    }

    loadSeries();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadSeasons() {
      try {
        const resp = await apiFetch(`/api/seasons/${id}`);
        if (!resp.ok) throw new Error();
        const items = await resp.json();
        if (cancelled) return;
        setSeasons(items);
        if (items.length) setActiveSeason(items[0].id);
      } catch {
        if (!cancelled) setSeasons([]);
      }
    }

    loadSeasons();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const episodesUrl = useMemo(() => {
    return activeSeason ? `/api/episodes/${activeSeason}` : '';
  }, [activeSeason]);

  async function fetchEpisodesData(url: string): Promise<any[]> {
    try {
      const resp = await apiFetch(url);
      if (!resp.ok) return [];
      const payload = await resp.json();
      return Array.isArray(payload) ? payload : [];
    } catch {
      return [];
    }
  }

  async function reloadActiveSeasonEpisodes() {
    if (!episodesUrl) return;
    const data = await fetchEpisodesData(episodesUrl);
    setEpisodes(data);
  }

  useEffect(() => {
    if (!episodesUrl) return;
    let cancelled = false;

    fetchEpisodesData(episodesUrl)
      .then((data) => {
        if (!cancelled) setEpisodes(data);
      })
      .catch(() => {
        if (!cancelled) setEpisodes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [episodesUrl]);

  async function markEpisodeWatched(epId: number, watched: boolean) {
    // оптимистично
    setEpisodes((prev) => prev.map((e) => (e.id === epId ? { ...e, watched } : e)));
    try {
      const resp = await apiFetch(`/api/episodes/${epId}/watched`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched }),
      });
      if (!resp.ok) {
        // откатываем оптимистичное обновление
        setEpisodes((prev) => prev.map((e) => (e.id === epId ? { ...e, watched: !watched } : e)));
        toast.error('Ошибка при изменении статуса эпизода');
        return;
      }
      toast.success(watched ? 'Эпизод отмечен как просмотренный' : 'Отметка просмотра снята');
    } catch (e) {
      // откатываем оптимистичное обновление
      setEpisodes((prev) => prev.map((e) => (e.id === epId ? { ...e, watched: !watched } : e)));
      toast.error('Ошибка при изменении статуса эпизода');
    }
  }

  async function markSeasonWatched(seasonId: number, watched: boolean) {
    // оптимистично обновляем сезон
    setSeasons((prev) => prev.map((s) => (s.id === seasonId ? { ...s, watched } : s)));
    
    // Если это активный сезон, оптимистично обновляем все эпизоды
    if (activeSeason === seasonId) {
      setEpisodes((prev) => prev.map((e) => ({ ...e, watched })));
    }
    
    try {
      const resp = await apiFetch(`/api/seasons/${seasonId}/watched`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched }),
      });
      if (!resp.ok) {
        // откатываем оптимистичное обновление
        setSeasons((prev) => prev.map((s) => (s.id === seasonId ? { ...s, watched: !watched } : s)));
        if (activeSeason === seasonId) {
          // Перезагружаем эпизоды, чтобы откатить изменения
          if (episodesUrl) {
            reloadActiveSeasonEpisodes();
          }
        }
        toast.error('Ошибка при изменении статуса сезона');
        return;
      }
      
      // Перезагружаем эпизоды активного сезона, если это тот же сезон
      if (activeSeason === seasonId && episodesUrl) {
        reloadActiveSeasonEpisodes();
      }
      
      toast.success(watched 
        ? 'Сезон и все эпизоды отмечены как просмотренные' 
        : 'Отметка просмотра снята со сезона и всех эпизодов');
    } catch (e) {
      // откатываем оптимистичное обновление
      setSeasons((prev) => prev.map((s) => (s.id === seasonId ? { ...s, watched: !watched } : s)));
      if (activeSeason === seasonId) {
        // Перезагружаем эпизоды, чтобы откатить изменения
        if (episodesUrl) {
          reloadActiveSeasonEpisodes();
        }
      }
      toast.error('Ошибка при изменении статуса сезона');
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function formatDuration(duration: number | null | undefined): string {
    if (!duration) return '—';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours > 0) {
      return `${hours} ч ${minutes} мин`;
    }
    return `${minutes} мин`;
  }

  if (!series) return <main className="mx-auto max-w-5xl px-4 py-6 text-text">Загрузка...</main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6 items-start">
          <div className="w-full overflow-hidden rounded-soft bg-black/30 aspect-[2/3]">
            {series.poster_url ? (
              <img src={series.poster_url} alt={series.title} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h1 className="text-3xl font-semibold tracking-wide text-text">{series.title}</h1>
              <button
                className="btn px-3 py-1 text-red-400 hover:bg-red-500/20 border-red-500/30"
                disabled={deleting}
                onClick={async () => {
                  if (!id) return;
                  if (!confirm(`Вы уверены, что хотите удалить сериал "${series.title}"? Это действие удалит все сезоны и эпизоды и его нельзя отменить.`)) {
                    return;
                  }
                  try {
                    setDeleting(true);
                    const resp = await apiFetch(`/api/series/${id}`, { method: 'DELETE' });
                    if (!resp.ok) {
                      toast.error('Ошибка при удалении сериала');
                      return;
                    }
                    toast.success('Сериал удален из библиотеки');
                    navigate('/');
                  } catch (e) {
                    toast.error('Ошибка при удалении сериала');
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
            <div className="mt-2 text-textMuted space-y-2">
              <div className="flex flex-wrap gap-3 items-center">
                {series.year && <span>Год: {series.year}</span>}
                <span className="inline-flex items-center gap-2">
                  <span>Моя оценка: {series.my_rating != null ? series.my_rating : '—'}</span>
                  {!ratingEditMode ? (
                    <button className="btn px-2 py-0.5" onClick={() => { setRatingEditMode(true); setRatingDraft(series.my_rating != null ? String(series.my_rating) : ''); }}>Изменить</button>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <input type="number" min={0} max={10} step={0.1} className="input w-20" value={ratingDraft} onChange={(e) => setRatingDraft(e.target.value)} />
                      <button
                        className="btn btn-primary px-2 py-0.5"
                        disabled={saving}
                        onClick={async () => {
                          if (!id) return;
                          try {
                            setSaving(true);
                            const body: any = { my_rating: ratingDraft === '' ? null : Number(ratingDraft) };
                            const resp = await apiFetch(`/api/series/${id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(body),
                            });
                            if (!resp.ok) {
                              toast.error('Ошибка при сохранении оценки');
                              return;
                            }
                            const fresh = await apiFetch(`/api/series/${id}`);
                            if (fresh.ok) {
                              const payload = await fresh.json();
                              setSeries(payload);
                            }
                            setRatingEditMode(false);
                            toast.success('Оценка сохранена');
                          } catch (e) {
                            toast.error('Ошибка при сохранении оценки');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >Сохранить</button>
                      <button className="btn px-2 py-0.5" onClick={() => { setRatingEditMode(false); setRatingDraft(series.my_rating != null ? String(series.my_rating) : ''); }}>Отмена</button>
                    </span>
                  )}
                </span>
                {series.kp_seasonsCount && <span>Сезонов: {series.kp_seasonsCount}</span>}
                {series.kp_episodesCount && <span>Эпизодов: {series.kp_episodesCount}</span>}
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                {series.director && <span>Режиссёр: {series.director}</span>}
                {typeof series.budget === 'number' && <span>Бюджет: {series.budget.toLocaleString()} ₽</span>}
                {typeof series.revenue === 'number' && <span>Сборы: {series.revenue.toLocaleString()} ₽</span>}
              </div>
            </div>
            {Array.isArray(series.genres) && series.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {series.genres.map((g: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-white/15 border border-white/20 rounded-soft text-text">{g}</span>
                ))}
              </div>
            )}
            {series.description && (
              <div className="text-sm text-textMuted mt-4 leading-relaxed max-w-2xl">{series.description}</div>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-semibold text-text">Моё мнение</div>
          {!opinionEditMode && (
            <button className="btn px-3 py-1" onClick={() => setOpinionEditMode(true)}>Редактировать</button>
          )}
        </div>
        {!opinionEditMode ? (
          <div className="markdown-preview-wrapper" data-color-mode="dark">
            <MarkdownPreview source={series.opinion ?? ''} />
          </div>
        ) : (
          <div className="space-y-3">
            <MarkdownEditor
              value={opinionDraft}
              onChange={(val) => setOpinionDraft(val)}
              placeholder="Поделитесь своим мнением в Markdown"
            />
            <div className="flex gap-2 justify-end">
              <button className="btn px-3 py-1" onClick={() => { setOpinionEditMode(false); setOpinionDraft(series.opinion ?? ''); }}>Отмена</button>
              <button
                className="btn btn-primary px-3 py-1"
                disabled={saving}
                onClick={async () => {
                  if (!id) return;
                  try {
                    setSaving(true);
                    const body: any = { opinion: opinionDraft };
                    const resp = await apiFetch(`/api/series/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });
                    if (!resp.ok) {
                      toast.error('Ошибка при сохранении мнения');
                      return;
                    }
                    const fresh = await apiFetch(`/api/series/${id}`);
                    if (fresh.ok) {
                      const payload = await fresh.json();
                      setSeries(payload);
                    }
                    setOpinionEditMode(false);
                    toast.success('Мнение сохранено');
                  } catch (e) {
                    toast.error('Ошибка при сохранении мнения');
                  } finally {
                    setSaving(false);
                  }
                }}
              >Сохранить</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-text mb-4">Сезоны и эпизоды</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {seasons.map((s) => (
            <div key={s.id} className="flex flex-col gap-2">
              <button
                onClick={() => setActiveSeason(s.id)}
                className={`soft-button px-3 py-1 whitespace-nowrap ${activeSeason === s.id ? 'bg-primary/30 shadow-[0_0_20px_rgba(0,191,255,0.4)] border-primary/60' : ''}`}
              >
                Сезон {s.number}
              </button>
              <button
                onClick={() => markSeasonWatched(s.id, !s.watched)}
                className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                  s.watched 
                    ? 'bg-green-500/20 border-green-500/50 text-green-300' 
                    : 'bg-white/5 border-white/10 text-textMuted hover:bg-white/10'
                }`}
                title={s.watched ? 'Снять отметку' : 'Отметить как просмотренный'}
              >
                {s.watched ? '✓ Просмотрен' : 'Не просмотрен'}
              </button>
            </div>
          ))}
        </div>
        {activeSeason && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-text mb-3">
              {seasons.find(s => s.id === activeSeason) && `Сезон ${seasons.find(s => s.id === activeSeason)?.number}`}
            </h3>
            <div className="space-y-2">
              {episodes.length === 0 ? (
                <div className="text-textMuted text-center py-8">Нет эпизодов в этом сезоне</div>
              ) : (
                episodes.map((e) => (
                  <div key={e.id} className="glass-panel p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-text">Серия {e.number}</span>
                          <button
                            onClick={() => markEpisodeWatched(e.id, !e.watched)}
                            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                              e.watched 
                                ? 'bg-green-500/20 border-green-500/50 text-green-300' 
                                : 'bg-white/5 border-white/10 text-textMuted hover:bg-white/10'
                            }`}
                          >
                            {e.watched ? '✓ Просмотрен' : 'Не просмотрен'}
                          </button>
                        </div>
                        {e.title && (
                          <div className="text-text font-medium mb-2">{e.title}</div>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-textMuted">
                          {e.release_date && (
                            <span>📅 {formatDate(e.release_date)}</span>
                          )}
                          {e.duration && (
                            <span>⏱ {formatDuration(e.duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


