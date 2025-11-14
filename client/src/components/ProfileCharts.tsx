import { memo, useMemo } from 'react';
import {
  GenresChart,
  YearsChart,
  RatingsChart,
  FilmsVsSeriesChart,
  MonthlyChart,
  AvgRatingByGenreChart,
  StatusesChart,
  DirectorsChart,
} from './StatsCharts';
import type { DetailedStats } from '../types';

interface ProfileChartsProps {
  stats: DetailedStats | null;
}

function ProfileChartsComponent({ stats }: ProfileChartsProps) {
  const {
    genres,
    years,
    ratings,
    filmsVsSeries,
    monthly,
    avgRatingByGenre,
    statuses,
    directors,
  } = useMemo(() => ({
    genres: stats?.genres ?? [],
    years: stats?.years ?? [],
    ratings: stats?.ratings ?? [],
    filmsVsSeries: stats?.filmsVsSeries ?? { films: 0, series: 0 },
    monthly: stats?.monthly ?? [],
    avgRatingByGenre: stats?.avgRatingByGenre ?? [],
    statuses: stats?.statuses ?? [],
    directors: stats?.directors ?? [],
  }), [stats]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenresChart data={genres} />
        <YearsChart data={years} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RatingsChart data={ratings} />
        <FilmsVsSeriesChart films={filmsVsSeries?.films ?? 0} series={filmsVsSeries?.series ?? 0} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyChart data={monthly} />
        <AvgRatingByGenreChart data={avgRatingByGenre} />
      </div>
      {statuses && statuses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatusesChart data={statuses} />
          {directors && directors.length > 0 && <DirectorsChart data={directors} />}
        </div>
      )}
      {(!statuses || statuses.length === 0) && directors && directors.length > 0 ? (
        <DirectorsChart data={directors} />
      ) : null}
    </div>
  );
}

export default memo(ProfileChartsComponent);
