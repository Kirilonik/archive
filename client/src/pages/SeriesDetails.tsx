import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { RatingEditModal } from '../components/RatingEditModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { apiFetch } from '../lib/api';
import { ConceptArtCarousel } from '../components/ConceptArtCarousel';
import { useMediaAssets } from '../hooks/useMediaAssets';
import { useMediaItem } from '../hooks/useMediaItem';
import type { Series, Season, Episode } from '../types';
import { formatDate, formatDuration } from '../lib/utils';

export function SeriesDetails() {
  const { id } = useParams();
  const {
    data: series,
    saving,
    deleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    ratingEditMode,
    setRatingEditMode,
    ratingDraft,
    setRatingDraft,
    opinionEditMode,
    setOpinionEditMode,
    opinionDraft,
    setOpinionDraft,
    handleSaveRating,
    handleSaveOpinion,
    handleDelete,
  } = useMediaItem<Series>({ id, type: 'series' });

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const {
    items: conceptArtItems,
    loading: conceptLoading,
    error: conceptError,
  } = useMediaAssets(id, 'series', 'concept-art');
  const {
    items: posterItems,
    loading: posterLoading,
    error: posterError,
  } = useMediaAssets(id, 'series', 'posters');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadSeasons() {
      try {
        const resp = await apiFetch(`/api/seasons/${id}`);
        if (!resp.ok) throw new Error();
        const items: Season[] = await resp.json();
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

  const episodesUrl = activeSeason ? `/api/episodes/${activeSeason}` : '';

  async function fetchEpisodesData(url: string): Promise<Episode[]> {
    try {
      const resp = await apiFetch(url);
      if (!resp.ok) return [];
      const payload: Episode[] = await resp.json();
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
    if (!episodesUrl) {
      setEpisodes([]);
      return;
    }
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
        let errorMessage = 'Ошибка при изменении статуса эпизода';
        try {
          const errorData = await resp.json();
          if (errorData?.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData?.message && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          // Если не удалось распарсить JSON, используем дефолтное сообщение
        }
        toast.error(errorMessage);
        return;
      }
      toast.success(watched ? 'Эпизод отмечен как просмотренный' : 'Отметка просмотра снята');
    } catch (error: any) {
      // откатываем оптимистичное обновление
      setEpisodes((prev) => prev.map((e) => (e.id === epId ? { ...e, watched: !watched } : e)));
      const errorMessage = error?.message || 'Ошибка при изменении статуса эпизода';
      toast.error(errorMessage);
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
        setSeasons((prev) =>
          prev.map((s) => (s.id === seasonId ? { ...s, watched: !watched } : s)),
        );
        if (activeSeason === seasonId) {
          // Перезагружаем эпизоды, чтобы откатить изменения
          if (episodesUrl) {
            reloadActiveSeasonEpisodes();
          }
        }
        let errorMessage = 'Ошибка при изменении статуса сезона';
        try {
          const errorData = await resp.json();
          if (errorData?.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData?.message && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        } catch {
          // Если не удалось распарсить JSON, используем дефолтное сообщение
        }
        toast.error(errorMessage);
        return;
      }

      // Перезагружаем эпизоды активного сезона, если это тот же сезон
      if (activeSeason === seasonId && episodesUrl) {
        reloadActiveSeasonEpisodes();
      }

      toast.success(
        watched
          ? 'Сезон и все эпизоды отмечены как просмотренные'
          : 'Отметка просмотра снята со сезона и всех эпизодов',
      );
    } catch (error: any) {
      // откатываем оптимистичное обновление
      setSeasons((prev) => prev.map((s) => (s.id === seasonId ? { ...s, watched: !watched } : s)));
      if (activeSeason === seasonId) {
        // Перезагружаем эпизоды, чтобы откатить изменения
        if (episodesUrl) {
          reloadActiveSeasonEpisodes();
        }
      }
      const errorMessage = error?.message || 'Ошибка при изменении статуса сезона';
      toast.error(errorMessage);
    }
  }

  if (!series) return <main className="mx-auto max-w-5xl px-4 py-6 text-text">Загрузка...</main>;

  const kpRating =
    typeof series?.rating_kinopoisk === 'number'
      ? Math.round(series.rating_kinopoisk * 10) / 10
      : null;
  const episodeDuration =
    typeof series?.film_length === 'number' ? formatDuration(series.film_length) : null;
  const myRatingValue =
    typeof series?.my_rating === 'number' ? Math.round(series.my_rating * 10) / 10 : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="card relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6 items-start">
          <div className="w-full overflow-hidden rounded-soft bg-black/30 aspect-[2/3]">
            {series.poster_url ? (
              <img
                src={series.poster_url}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-semibold tracking-wide text-text">{series.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {kpRating != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold text-black shadow">
                        KP {kpRating}
                      </span>
                    )}
                    <span
                      className="relative inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 cursor-pointer group"
                      onClick={() => {
                        setRatingEditMode(true);
                        setRatingDraft(series.my_rating != null ? String(series.my_rating) : '');
                      }}
                    >
                      Я {myRatingValue ?? '—'}
                      <span className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4 text-white drop-shadow"
                        >
                          <path d="M15.414 3.586a2 2 0 0 1 0 2.828l-.793.793-2.828-2.828.793-.793a2 2 0 0 1 2.828 0ZM10.5 5.207 3 12.707V16h3.293l7.5-7.5-3.293-3.293Z" />
                        </svg>
                      </span>
                    </span>
                    {episodeDuration && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-textMuted bg-white/10 backdrop-blur-[20px] backdrop-saturate-[180%]">
                        Серия: {episodeDuration}
                      </span>
                    )}
                    {series.rating && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-xs text-textMuted bg-white/10 backdrop-blur-[20px] backdrop-saturate-[180%]">
                        Рейтинг каталога: {series.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {(series.web_url || series.kp_id) && (
                    <a
                      href={
                        series.web_url ||
                        (series.kp_id ? `https://www.kinopoisk.ru/series/${series.kp_id}/` : '#')
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn px-3 py-1 flex items-center gap-2"
                      title="Открыть на Кинопоиске"
                    >
                      <img
                        src="/kinopoisk-logo-colored-on-whitebackground-rus.png"
                        alt="Кинопоиск"
                        className="h-5 w-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </a>
                  )}
                  <button
                    className="btn px-3 py-1 text-red-400 hover:bg-red-500/20 border-red-500/30"
                    disabled={deleting}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 text-textMuted space-y-2">
              <div className="flex flex-wrap gap-3 items-center">
                {series.year && <span>Год: {series.year}</span>}
                {series.kp_seasons_count && <span>Сезонов: {series.kp_seasons_count}</span>}
                {series.kp_episodes_count && <span>Эпизодов: {series.kp_episodes_count}</span>}
              </div>
              {series.director && (
                <div>
                  <span>Режиссёр: {series.director}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 items-center">
                {typeof series.budget === 'number' && (
                  <span>Бюджет: {series.budget.toLocaleString()} ₽</span>
                )}
                {typeof series.revenue === 'number' && (
                  <span>Сборы: {series.revenue.toLocaleString()} ₽</span>
                )}
                {episodeDuration && <span>Длительность серии: {episodeDuration}</span>}
              </div>
            </div>
            {Array.isArray(series.genres) && series.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {series.genres.map((g: string, i: number) => (
                  <span key={i} className="tag">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {series.description && (
              <div className="text-sm text-textMuted mt-4 leading-relaxed max-w-2xl">
                {series.description}
              </div>
            )}
          </div>
        </div>
      </div>
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title={series.title}
        itemType="сериала"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        deleting={deleting}
      />
      <RatingEditModal
        isOpen={ratingEditMode}
        title={series.title}
        ratingDraft={ratingDraft}
        onRatingDraftChange={setRatingDraft}
        onSave={handleSaveRating}
        onCancel={() => setRatingEditMode(false)}
        saving={saving}
      />

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-semibold text-text">Моё мнение</div>
          {!opinionEditMode && (
            <button className="btn px-3 py-1" onClick={() => setOpinionEditMode(true)}>
              Редактировать
            </button>
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
              <button
                className="btn px-3 py-1"
                onClick={() => {
                  setOpinionEditMode(false);
                  setOpinionDraft(series.opinion ?? '');
                }}
              >
                Отмена
              </button>
              <button
                className="btn btn-primary px-3 py-1"
                disabled={saving}
                onClick={handleSaveOpinion}
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-text">Концепт-арты</div>
          {conceptLoading && <div className="text-sm text-textMuted">Загрузка…</div>}
        </div>
        {!conceptLoading && conceptError ? (
          <div className="mt-3 text-sm text-red-300">{conceptError}</div>
        ) : null}
        {!conceptLoading && !conceptError && conceptArtItems.length === 0 ? (
          <div className="mt-3 text-sm text-textMuted">Нет доступных концепт-артов.</div>
        ) : null}
        {conceptArtItems.length > 0 ? (
          <div className="mt-4">
            <ConceptArtCarousel items={conceptArtItems} />
          </div>
        ) : null}
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-text">Постеры</div>
          {posterLoading && <div className="text-sm text-textMuted">Загрузка…</div>}
        </div>
        {!posterLoading && posterError ? (
          <div className="mt-3 text-sm text-red-300">{posterError}</div>
        ) : null}
        {!posterLoading && !posterError && posterItems.length === 0 ? (
          <div className="mt-3 text-sm text-textMuted">Нет доступных постеров.</div>
        ) : null}
        {posterItems.length > 0 ? (
          <div className="mt-4">
            <ConceptArtCarousel items={posterItems} />
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-text mb-4">Сезоны и эпизоды</h2>
        <div className="flex gap-2 overflow-x-auto overflow-y-visible pb-2 pt-1">
          {seasons.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(s.watched)}
                onChange={(event) => markSeasonWatched(s.id, event.target.checked)}
                className="peer size-6 cursor-pointer appearance-none rounded-full border-2 border-white/70 bg-white/30 transition-all duration-200 hover:border-white/90 hover:bg-white/40 checked:bg-emerald-400/90 checked:border-emerald-300 checked:shadow-lg checked:shadow-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                title={s.watched ? 'Снять отметку' : 'Отметить как просмотренный'}
              />
              <button
                onClick={() => setActiveSeason(s.id)}
                className={`soft-button px-3 py-1 whitespace-nowrap ${
                  activeSeason === s.id ? 'bg-primary/25 border-primary/60' : ''
                }`}
                style={{ boxShadow: 'none' }}
              >
                Сезон {s.number}
              </button>
            </div>
          ))}
        </div>
        {activeSeason && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-text mb-3">
              {seasons.find((s) => s.id === activeSeason) &&
                `Сезон ${seasons.find((s) => s.id === activeSeason)?.number}`}
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
                          <input
                            type="checkbox"
                            checked={Boolean(e.watched)}
                            onChange={(event) => markEpisodeWatched(e.id, event.target.checked)}
                            className="peer size-6 cursor-pointer appearance-none rounded-full border-2 border-white/50 bg-white/20 transition-all duration-200 hover:border-white/70 hover:bg-white/30 checked:bg-emerald-400/80 checked:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                            title={e.watched ? 'Снять отметку' : 'Отметить как просмотренный'}
                          />
                        </div>
                        {e.title && <div className="text-text font-medium mb-2">{e.title}</div>}
                        <div className="flex flex-wrap gap-4 text-sm text-textMuted">
                          {e.release_date && <span>📅 {formatDate(e.release_date)}</span>}
                          {e.duration && <span>⏱ {formatDuration(e.duration)}</span>}
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
