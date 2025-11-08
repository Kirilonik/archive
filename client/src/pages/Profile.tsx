import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  GenresChart,
  YearsChart,
  RatingsChart,
  FilmsVsSeriesChart,
  MonthlyChart,
  AvgRatingByGenreChart,
  StatusesChart,
  DirectorsChart,
} from '../components/StatsCharts';

export function Profile() {
  const [data, setData] = useState<any | null>(null);
  const [detailedStats, setDetailedStats] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { user, refresh } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      try {
        const [profileResp, statsResp] = await Promise.all([
          apiFetch(`/api/users/${user.id}`),
          apiFetch(`/api/users/${user.id}/stats/detailed`),
        ]);

        if (!profileResp.ok) throw new Error();
        const profileData = await profileResp.json();
        if (!cancelled) {
          setData(profileData);
          setName(profileData.profile?.name ?? '');
          setAvatarUrl(profileData.profile?.avatar_url ?? null);
        }

        if (statsResp.ok) {
          const statsData = await statsResp.json();
          if (!cancelled) setDetailedStats(statsData);
        } else if (!cancelled) {
          setDetailedStats(null);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setDetailedStats(null);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function saveProfile() {
    try {
      setSaving(true);
      if (!user?.id) return;
      const body: any = { name, avatar_url: avatarUrl ?? null };
      const resp = await apiFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        toast.error('Ошибка при сохранении профиля');
        return;
      }
      const fresh = await apiFetch(`/api/users/${user.id}`);
      if (fresh.ok) {
        const payload = await fresh.json();
        setData(payload);
        await refresh();
      }
      toast.success('Профиль успешно сохранён');
    } catch (e) {
      toast.error('Ошибка при сохранении профиля');
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4 text-text">Профиль</h1>
      {!data ? (
        <div className="text-text">Загрузка...</div>
      ) : (
        <div className="space-y-6">
          {/* Блок профиля: аватарка и имя */}
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="relative size-20 aspect-square rounded-full overflow-hidden bg-white/15 border border-white/20 flex items-center justify-center group cursor-pointer shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name || 'avatar'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-textMuted text-xs">Нет аватара</span>
                )}
                {/* Overlay с кнопкой при наведении */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    className="btn px-3 py-1.5 text-sm"
                    onClick={() => inputRef.current?.click()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Изменить
                  </button>
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm text-textMuted mb-1">Имя</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="btn px-3 py-1" onClick={() => {
                setName(data.profile?.name ?? '');
                setAvatarUrl(data.profile?.avatar_url ?? null);
              }}>Отменить</button>
              <button className="btn btn-primary px-3 py-1" disabled={saving} onClick={saveProfile}>Сохранить</button>
            </div>
          </div>

          {/* Статистика */}
          <div className="space-y-6">
            {/* Основные метрики */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="card p-4 text-center">
                <div className="text-3xl font-semibold text-text">{data.stats?.films ?? 0}</div>
                <div className="text-sm text-textMuted mt-1">Фильмы</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-semibold text-text">{data.stats?.series ?? 0}</div>
                <div className="text-sm text-textMuted mt-1">Сериалы</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-semibold text-text">{data.stats?.avgRating ?? '—'}</div>
                <div className="text-sm text-textMuted mt-1">Средняя оценка</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-semibold text-text">{data.stats?.watchedEpisodes ?? 0}</div>
                <div className="text-sm text-textMuted mt-1">Просмотрено эпизодов</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-semibold text-text">{data.stats?.totalSeasons ?? 0}</div>
                <div className="text-sm text-textMuted mt-1">Всего сезонов</div>
              </div>
            </div>

            {/* Дополнительные метрики */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-semibold text-text">{data.stats?.totalEpisodes ?? 0}</div>
                <div className="text-sm text-textMuted mt-1">Всего эпизодов</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-semibold text-text">{data.stats?.filmsWithRating ?? 0}</div>
                <div className="text-sm text-textMuted mt-1">Фильмов с оценкой</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-semibold text-text">{data.stats?.seriesWithRating ?? 0}</div>
                <div className="text-sm text-textMuted mt-1">Сериалов с оценкой</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-semibold text-text">{(data.stats?.filmsWithOpinion ?? 0) + (data.stats?.seriesWithOpinion ?? 0)}</div>
                <div className="text-sm text-textMuted mt-1">С мнением</div>
              </div>
            </div>

            {/* Графики */}
            {detailedStats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GenresChart data={detailedStats.genres || []} />
                  <YearsChart data={detailedStats.years || []} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RatingsChart data={detailedStats.ratings || []} />
                  <FilmsVsSeriesChart films={detailedStats.filmsVsSeries?.films ?? 0} series={detailedStats.filmsVsSeries?.series ?? 0} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MonthlyChart data={detailedStats.monthly || []} />
                  <AvgRatingByGenreChart data={detailedStats.avgRatingByGenre || []} />
                </div>
                {detailedStats.statuses && detailedStats.statuses.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <StatusesChart data={detailedStats.statuses} />
                    {detailedStats.directors && detailedStats.directors.length > 0 && (
                      <DirectorsChart data={detailedStats.directors} />
                    )}
                  </div>
                )}
                {detailedStats.directors && detailedStats.directors.length > 0 && (!detailedStats.statuses || detailedStats.statuses.length === 0) && (
                  <DirectorsChart data={detailedStats.directors} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}


