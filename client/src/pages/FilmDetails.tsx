import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { apiFetch } from '../lib/api';
import { ConceptArtCarousel } from '../components/ConceptArtCarousel';
import { formatMinutes, formatBudget } from '../lib/utils';
import { useMediaAssets } from '../hooks/useMediaAssets';

export function FilmDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Inline edit states
  const [ratingEditMode, setRatingEditMode] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<string>('');

  const [opinionEditMode, setOpinionEditMode] = useState(false);
  const [opinionDraft, setOpinionDraft] = useState<string>('');

  const { items: conceptArtItems, loading: conceptLoading, error: conceptError } = useMediaAssets(id, 'film', 'concept-art');
  const { items: posterItems, loading: posterLoading, error: posterError } = useMediaAssets(id, 'film', 'posters');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const resp = await apiFetch(`/api/films/${id}`);
        if (!resp.ok) throw new Error();
        const d = await resp.json();
        if (cancelled) return;
        setData(d);
        setRatingDraft(d?.my_rating != null ? String(d.my_rating) : '');
        setOpinionDraft(d?.opinion ?? '');
      } catch {
        if (!cancelled) setData(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);


  if (!data) return <main className="mx-auto max-w-5xl px-4 py-6 text-text">Загрузка...</main>;

  const kpRating = typeof data.rating_kinopoisk === 'number' ? Math.round(data.rating_kinopoisk * 10) / 10 : null;
  const formattedDuration = formatMinutes(data.film_length);
  const formattedBudget = formatBudget(data.budget, data.budget_currency_symbol, data.budget_currency_code);
  const myRatingValue = typeof data.my_rating === 'number' ? Math.round(data.my_rating * 10) / 10 : null;

  async function handleDelete() {
    if (!id) return;
    try {
      setDeleting(true);
      const resp = await apiFetch(`/api/films/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        toast.error('Ошибка при удалении фильма');
        return;
      }
      toast.success('Фильм удален из библиотеки');
      navigate('/');
    } catch {
      toast.error('Ошибка при удалении фильма');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="card relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6 items-start">
          <div className="w-full overflow-hidden rounded-soft bg-black/30 aspect-[2/3]">
            {data.poster_url ? (
              <img src={data.poster_url} alt={data.title} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div>
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-semibold tracking-wide text-text">{data.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {kpRating != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold text-black shadow">
                        KP {kpRating}
                      </span>
                    )}
                    <span
                      className="relative inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow bg-gradient-to-r from-indigo-400 via-fuchsia-500 to-pink-500 cursor-pointer group"
                      onClick={() => {
                        setRatingEditMode(true);
                        setRatingDraft(data.my_rating != null ? String(data.my_rating) : '');
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
                    {formattedDuration && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-textMuted">
                        {formattedDuration}
                      </span>
                    )}
                    {data.rating && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-textMuted">
                        Рейтинг каталога: {data.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {data.web_url && (
                    <a
                      href={data.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn px-3 py-1 flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20"
                    >
                      <img src="/kinopoisk-logo-white-on-blackbackground-rus.png" alt="Кинопоиск" className="h-5" />
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
                {data.year && <span>Год: {data.year}</span>}
                {data.director && <span className="basis-full sm:basis-auto">Режиссёр: {data.director}</span>}
                {formattedBudget && <span>Бюджет: {formattedBudget}</span>}
                {typeof data.revenue === 'number' && <span>Сборы: {data.revenue.toLocaleString()} ₽</span>}
              </div>
              {Array.isArray(data.genres) && data.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.genres.map((g: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-white/15 border border-white/20 rounded-soft text-text">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {data.description && (
                <div className="text-sm text-textMuted mt-4 leading-relaxed max-w-2xl">{data.description}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold text-text mb-2">Удалить фильм</div>
            <div className="text-sm text-textMuted mb-4">
              Фильм «{data.title}» будет удалён из библиотеки. Это действие нельзя отменить.
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn px-3 py-1" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Отмена
              </button>
              <button
                className="btn px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white border border-red-500/40"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Удаление…' : 'Да, удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {conceptArtItems.length > 0 ? <div className="mt-4"><ConceptArtCarousel items={conceptArtItems} /></div> : null}
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-text">Постеры</div>
          {posterLoading && <div className="text-sm text-textMuted">Загрузка…</div>}
        </div>
        {!posterLoading && posterError ? <div className="mt-3 text-sm text-red-300">{posterError}</div> : null}
        {!posterLoading && !posterError && posterItems.length === 0 ? (
          <div className="mt-3 text-sm text-textMuted">Нет доступных постеров.</div>
        ) : null}
        {posterItems.length > 0 ? <div className="mt-4"><ConceptArtCarousel items={posterItems} /></div> : null}
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
            <MarkdownPreview source={data.opinion ?? ''} />
          </div>
        ) : (
          <div className="space-y-3">
            <MarkdownEditor
              value={opinionDraft}
              onChange={(val) => setOpinionDraft(val)}
              placeholder="Напишите развернутое мнение в Markdown"
            />
            <div className="flex gap-2 justify-end">
              <button className="btn px-3 py-1" onClick={() => { setOpinionEditMode(false); setOpinionDraft(data.opinion ?? ''); }}>Отмена</button>
              <button
                className="btn btn-primary px-3 py-1"
                disabled={saving}
                onClick={async () => {
                  if (!id) return;
                  try {
                    setSaving(true);
                    const body: any = { opinion: opinionDraft };
                    const resp = await apiFetch(`/api/films/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });
                    if (!resp.ok) {
                      toast.error('Ошибка при сохранении мнения');
                      return;
                    }
                    const fresh = await apiFetch(`/api/films/${id}`);
                    if (fresh.ok) {
                      const payload = await fresh.json();
                      setData(payload);
                    }
                    setOpinionEditMode(false);
                    toast.success('Мнение сохранено');
                  } catch {
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
      {ratingEditMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => !saving && setRatingEditMode(false)}>
          <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold text-text mb-2">Изменить оценку</div>
            <div className="text-sm text-textMuted mb-4">Обновите свою оценку для фильма «{data.title}».</div>
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
                  onChange={(e) => setRatingDraft(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn px-3 py-1" onClick={() => setRatingEditMode(false)} disabled={saving}>
                Отмена
              </button>
              <button
                className="btn btn-primary px-3 py-1"
                disabled={saving}
                onClick={async () => {
                  if (!id) return;
                  try {
                    setSaving(true);
                    const body: any = { my_rating: ratingDraft === '' ? null : Number(ratingDraft) };
                    const resp = await apiFetch(`/api/films/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });
                    if (!resp.ok) {
                      toast.error('Ошибка при сохранении оценки');
                      return;
                    }
                    const fresh = await apiFetch(`/api/films/${id}`);
                    if (fresh.ok) {
                      const payload = await fresh.json();
                      setData(payload);
                    }
                    setRatingEditMode(false);
                    toast.success('Оценка сохранена');
                  } catch {
                    toast.error('Ошибка при сохранении оценки');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


