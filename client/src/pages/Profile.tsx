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
  const [profileLoading, setProfileLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { user, refresh } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const userId = user.id;

    async function load() {
      setProfileLoading(true);
      setStatsLoading(true);
      setStatsError(null);
      try {
        const [profileResp, statsResp] = await Promise.all([
          apiFetch(`/api/users/${userId}`),
          apiFetch(`/api/users/${userId}/stats/detailed`),
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
          if (!cancelled) {
            setDetailedStats(statsData);
          }
        } else if (!cancelled) {
          setDetailedStats(null);
          setStatsError('Не удалось загрузить детальную статистику');
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setDetailedStats(null);
          setStatsError('Не удалось загрузить данные профиля');
          toast.error('Не удалось загрузить профиль');
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
          setStatsLoading(false);
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

  function formatMinutes(total?: number | null): string {
    if (!total || total <= 0) return '—';
    const hours = Math.round(total / 60);
    return `${hours} ч`;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4 text-text">Профиль</h1>
      {profileLoading ? (
        <ProfileSkeleton />
      ) : !data ? (
        <div className="card p-6 text-center text-text">
          Не удалось загрузить профиль. Попробуйте обновить страницу позже.
        </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
                  <input className="input sm:flex-1" value={name} onChange={(e) => setName(e.target.value)} />
                  <div className="flex gap-2 sm:justify-end">
                    <button
                      className="btn px-3 py-1"
                      onClick={() => {
                        setName(data.profile?.name ?? '');
                        setAvatarUrl(data.profile?.avatar_url ?? null);
                      }}
                    >
                      Отменить
                    </button>
                    <button className="btn btn-primary px-3 py-1" disabled={saving} onClick={saveProfile}>
                      Сохранить
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-textMuted">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-text">
                    <span>Email:</span>
                    <span>{user?.email ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-4 space-y-4">
                <div className="text-lg font-semibold text-text">Фильмы</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.films ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">Фильмы</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.filmsWithRating ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">С оценкой</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.filmsWithOpinion ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">С мнением</div>
                  </div>
                  <div className="card p-4 text-center">
                <div className="text-3xl font-semibold text-text">
                      {formatMinutes(data.stats?.filmsDurationMinutes)}
                    </div>
                    <div className="text-sm text-textMuted mt-1">Хронометраж</div>
                  </div>
                </div>
              </div>

              <div className="card p-4 space-y-4">
                <div className="text-lg font-semibold text-text">Сериалы</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.series ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">Сериалы</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.seriesWithRating ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">С оценкой</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.seriesWithOpinion ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">С мнением</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.totalSeasons ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">Сезоны</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">{data.stats?.totalEpisodes ?? 0}</div>
                    <div className="text-sm text-textMuted mt-1">Эпизоды</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-3xl font-semibold text-text">
                      {formatMinutes(data.stats?.seriesDurationMinutes)}
                    </div>
                    <div className="text-sm text-textMuted mt-1">Хронометраж</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Графики */}
            {statsLoading ? (
              <StatsSkeleton />
            ) : detailedStats ? (
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
            ) : (
              <div className="card p-6 text-center text-textMuted">
                {statsError ?? 'Недостаточно данных для отображения статистики.'}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="size-20 rounded-full bg-white/10" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-white/10 rounded w-1/3" />
            <div className="h-10 bg-white/10 rounded" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <div className="h-9 w-24 bg-white/10 rounded" />
          <div className="h-9 w-28 bg-white/10 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="card p-4 animate-pulse space-y-3">
            <div className="h-8 bg-white/10 rounded" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, block) => (
        <div key={block} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((__, idx) => (
            <div key={idx} className="card h-64 animate-pulse bg-white/5" />
          ))}
        </div>
      ))}
    </div>
  );
}


