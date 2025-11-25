import { useParams } from 'react-router-dom';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { RatingEditModal } from '../components/RatingEditModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { ConceptArtCarousel } from '../components/ConceptArtCarousel';
import { formatMinutes, formatBudget } from '../lib/utils';
import { useMediaAssets } from '../hooks/useMediaAssets';
import { useMediaItem } from '../hooks/useMediaItem';
import type { Film } from '../types';

export function FilmDetails() {
  const { id } = useParams();
  const {
    data,
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
  } = useMediaItem<Film>({ id, type: 'film' });

  const {
    items: conceptArtItems,
    loading: conceptLoading,
    error: conceptError,
  } = useMediaAssets(id, 'film', 'concept-art');
  const {
    items: posterItems,
    loading: posterLoading,
    error: posterError,
  } = useMediaAssets(id, 'film', 'posters');

  if (!data) return <main className="mx-auto max-w-5xl px-4 py-6 text-text">Загрузка...</main>;

  const kpRating =
    typeof data.rating_kinopoisk === 'number' ? Math.round(data.rating_kinopoisk * 10) / 10 : null;
  const formattedDuration = formatMinutes(data.film_length);
  const formattedBudget = formatBudget(
    data.budget,
    data.budget_currency_symbol,
    data.budget_currency_code,
  );
  const myRatingValue =
    typeof data.my_rating === 'number' ? Math.round(data.my_rating * 10) / 10 : null;

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
                      className="relative inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 cursor-pointer group"
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
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-textMuted bg-white/10 backdrop-blur-[20px] backdrop-saturate-[180%]">
                        {formattedDuration}
                      </span>
                    )}
                    {data.rating && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-xs text-textMuted bg-white/10 backdrop-blur-[20px] backdrop-saturate-[180%]">
                        Рейтинг каталога: {data.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {(data.web_url || data.kp_id) && (
                    <a
                      href={
                        data.web_url ||
                        (data.kp_id ? `https://www.kinopoisk.ru/film/${data.kp_id}/` : '#')
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
                {data.year && <span>Год: {data.year}</span>}
                {formattedBudget && <span>Бюджет: {formattedBudget}</span>}
                {typeof data.revenue === 'number' && (
                  <span>Сборы: {data.revenue.toLocaleString()} ₽</span>
                )}
              </div>
              {data.director && (
                <div>
                  <span>Режиссёр: {data.director}</span>
                </div>
              )}
              {Array.isArray(data.genres) && data.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.genres.map((g: string, i: number) => (
                    <span key={i} className="tag">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {data.description && (
                <div className="text-sm text-textMuted mt-4 leading-relaxed max-w-2xl">
                  {data.description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title={data.title}
        itemType="фильма"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        deleting={deleting}
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
              <button
                className="btn px-3 py-1"
                onClick={() => {
                  setOpinionEditMode(false);
                  setOpinionDraft(data.opinion ?? '');
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
      <RatingEditModal
        isOpen={ratingEditMode}
        title={data.title}
        ratingDraft={ratingDraft}
        onRatingDraftChange={setRatingDraft}
        onSave={handleSaveRating}
        onCancel={() => setRatingEditMode(false)}
        saving={saving}
      />
    </main>
  );
}
