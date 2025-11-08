import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { apiFetch } from '../lib/api';

export function FilmDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inline edit states
  const [ratingEditMode, setRatingEditMode] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<string>('');

  const [opinionEditMode, setOpinionEditMode] = useState(false);
  const [opinionDraft, setOpinionDraft] = useState<string>('');

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

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6 items-start">
          <div className="w-full overflow-hidden rounded-soft bg-black/30 aspect-[2/3]">
            {data.poster_url ? (
              <img src={data.poster_url} alt={data.title} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h1 className="text-3xl font-semibold tracking-wide text-text">{data.title}</h1>
              <button
                className="btn px-3 py-1 text-red-400 hover:bg-red-500/20 border-red-500/30"
                disabled={deleting}
                onClick={async () => {
                  if (!id) return;
                  if (!confirm(`Вы уверены, что хотите удалить фильм "${data.title}"? Это действие нельзя отменить.`)) {
                    return;
                  }
                  try {
                    setDeleting(true);
                    const resp = await apiFetch(`/api/films/${id}`, { method: 'DELETE' });
                    if (!resp.ok) {
                      toast.error('Ошибка при удалении фильма');
                      return;
                    }
                    toast.success('Фильм удален из библиотеки');
                    navigate('/');
                  } catch (e) {
                    toast.error('Ошибка при удалении фильма');
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
                {data.year && <span>Год: {data.year}</span>}
                <span className="inline-flex items-center gap-2">
                  <span>Моя оценка: {data.my_rating != null ? data.my_rating : '—'}</span>
                  {!ratingEditMode ? (
                    <button className="btn px-2 py-0.5" onClick={() => { setRatingEditMode(true); setRatingDraft(data.my_rating != null ? String(data.my_rating) : ''); }}>Изменить</button>
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
                          } catch (e) {
                            toast.error('Ошибка при сохранении оценки');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >Сохранить</button>
                      <button className="btn px-2 py-0.5" onClick={() => { setRatingEditMode(false); setRatingDraft(data.my_rating != null ? String(data.my_rating) : ''); }}>Отмена</button>
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                {data.director && <span>Режиссёр: {data.director}</span>}
                {typeof data.budget === 'number' && <span>Бюджет: {data.budget.toLocaleString()} ₽</span>}
                {typeof data.revenue === 'number' && <span>Сборы: {data.revenue.toLocaleString()} ₽</span>}
              </div>
            </div>
            {Array.isArray(data.genres) && data.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.genres.map((g: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-white/15 border border-white/20 rounded-soft text-text">{g}</span>
                ))}
              </div>
            )}
            {data.description && (
              <div className="text-sm text-textMuted mt-4 leading-relaxed max-w-2xl">{data.description}</div>
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
    </main>
  );
}


