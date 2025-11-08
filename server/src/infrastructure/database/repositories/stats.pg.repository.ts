import { pool } from '../../../config/db.js';
import type {
  StatsRepository,
  UserSummaryStats,
  UserDetailedStats,
  GenreStat,
  YearStat,
  RatingRangeStat,
  FilmsVsSeriesStat,
  MonthlyStat,
  AvgRatingByGenreStat,
  StatusStat,
  DirectorStat,
} from '../../../domain/stats/stats.types.js';

function parseIntField(value: any): number {
  if (value == null) return 0;
  const num = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isNaN(num) ? 0 : num;
}

function parseFloatField(value: any): number | null {
  if (value == null) return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(num)) return null;
  return num;
}

export class StatsPgRepository implements StatsRepository {
  async getSummary(userId: number): Promise<UserSummaryStats> {
    const [
      [filmsCount],
      [seriesCount],
      [avgAll],
      [watchedEpisodes],
      [totalSeasons],
      [totalEpisodes],
      [filmsWithRating],
      [seriesWithRating],
      [filmsWithOpinion],
      [seriesWithOpinion],
      [filmsDuration],
      [seriesDuration],
    ] =
      await Promise.all([
        pool.query('SELECT COUNT(*)::int as c FROM user_films WHERE user_id=$1', [userId]).then((r) => r.rows),
        pool.query('SELECT COUNT(*)::int as c FROM user_series WHERE user_id=$1', [userId]).then((r) => r.rows),
        pool.query(
          `SELECT ROUND(AVG(my_rating)::numeric, 2) as avg
           FROM (
             SELECT my_rating FROM user_films WHERE user_id=$1 AND my_rating IS NOT NULL
             UNION ALL
             SELECT my_rating FROM user_series WHERE user_id=$1 AND my_rating IS NOT NULL
           ) t`,
          [userId],
        ).then((r) => r.rows),
        pool.query(
          'SELECT COUNT(*)::int as c FROM user_episodes WHERE user_id=$1 AND watched = true',
          [userId],
        ).then((r) => r.rows),
        pool.query(
          'SELECT COUNT(*)::int as c FROM user_seasons WHERE user_id=$1',
          [userId],
        ).then((r) => r.rows),
        pool.query(
          'SELECT COUNT(*)::int as c FROM user_episodes WHERE user_id=$1',
          [userId],
        ).then((r) => r.rows),
        pool.query(
          'SELECT COUNT(*)::int as c FROM user_films WHERE user_id=$1 AND my_rating IS NOT NULL',
          [userId],
        ).then((r) => r.rows),
        pool.query(
          'SELECT COUNT(*)::int as c FROM user_series WHERE user_id=$1 AND my_rating IS NOT NULL',
          [userId],
        ).then((r) => r.rows),
        pool.query(
          "SELECT COUNT(*)::int as c FROM user_films WHERE user_id=$1 AND opinion IS NOT NULL AND opinion <> ''",
          [userId],
        ).then((r) => r.rows),
        pool.query(
          "SELECT COUNT(*)::int as c FROM user_series WHERE user_id=$1 AND opinion IS NOT NULL AND opinion <> ''",
          [userId],
        ).then((r) => r.rows),
        pool
          .query(
            `SELECT COALESCE(SUM(fc.film_length), 0)::int as total_minutes
             FROM user_films uf
             JOIN films_catalog fc ON uf.film_catalog_id = fc.id
             WHERE uf.user_id = $1`,
            [userId],
          )
          .then((r) => r.rows),
        pool
          .query(
            `SELECT COALESCE(SUM(COALESCE(sc.film_length, 0) * COALESCE(sc.kp_episodes_count, 1)), 0)::int as total_minutes
             FROM user_series us
             JOIN series_catalog sc ON us.series_catalog_id = sc.id
             WHERE us.user_id = $1`,
            [userId],
          )
          .then((r) => r.rows),
      ]);

    const avg = avgAll?.avg != null ? parseFloatField(avgAll.avg) : null;

    return {
      films: parseIntField(filmsCount?.c),
      series: parseIntField(seriesCount?.c),
      avgRating: avg,
      watchedEpisodes: parseIntField(watchedEpisodes?.c),
      totalSeasons: parseIntField(totalSeasons?.c),
      totalEpisodes: parseIntField(totalEpisodes?.c),
      filmsWithRating: parseIntField(filmsWithRating?.c),
      seriesWithRating: parseIntField(seriesWithRating?.c),
      filmsWithOpinion: parseIntField(filmsWithOpinion?.c),
      seriesWithOpinion: parseIntField(seriesWithOpinion?.c),
      filmsDurationMinutes: parseIntField(filmsDuration?.total_minutes),
      seriesDurationMinutes: parseIntField(seriesDuration?.total_minutes),
    };
  }

  async getDetailed(userId: number): Promise<UserDetailedStats> {
    const [
      genresData,
      yearsData,
      ratingsData,
      filmsCount,
      seriesCount,
      monthlyData,
      avgRatingByGenre,
      statusData,
      directorsData,
    ] = await Promise.all([
      pool.query(
        `SELECT genre, COUNT(*)::int as count
         FROM (
           SELECT unnest(fc.genres) as genre
           FROM user_films uf
           JOIN films_catalog fc ON uf.film_catalog_id = fc.id
           WHERE uf.user_id=$1 AND fc.genres IS NOT NULL
           UNION ALL
           SELECT unnest(sc.genres) as genre
           FROM user_series us
           JOIN series_catalog sc ON us.series_catalog_id = sc.id
           WHERE us.user_id=$1 AND sc.genres IS NOT NULL
         ) t
         GROUP BY genre
         ORDER BY count DESC
         LIMIT 10`,
        [userId],
      ),
      pool.query(
        `SELECT year, COUNT(*)::int as count
         FROM (
           SELECT fc.year as year
           FROM user_films uf
           JOIN films_catalog fc ON uf.film_catalog_id = fc.id
           WHERE uf.user_id=$1 AND fc.year IS NOT NULL
           UNION ALL
           SELECT sc.year as year
           FROM user_series us
           JOIN series_catalog sc ON us.series_catalog_id = sc.id
           WHERE us.user_id=$1 AND sc.year IS NOT NULL
         ) t
         GROUP BY year
         ORDER BY year ASC`,
        [userId],
      ),
      pool.query(
        `SELECT range, COUNT(*)::int as count
         FROM (
           SELECT CASE
             WHEN my_rating < 2 THEN '0-2'
             WHEN my_rating < 4 THEN '2-4'
             WHEN my_rating < 6 THEN '4-6'
             WHEN my_rating < 8 THEN '6-8'
             ELSE '8-10'
           END as range
           FROM (
             SELECT my_rating FROM user_films WHERE user_id=$1 AND my_rating IS NOT NULL
             UNION ALL
             SELECT my_rating FROM user_series WHERE user_id=$1 AND my_rating IS NOT NULL
           ) mm
         ) ranges
         GROUP BY range
         ORDER BY range`,
        [userId],
      ),
      pool.query('SELECT COUNT(*)::int as c FROM user_films WHERE user_id=$1', [userId]),
      pool.query('SELECT COUNT(*)::int as c FROM user_series WHERE user_id=$1', [userId]),
      pool.query(
        `SELECT month, COUNT(*)::int as count
         FROM (
           SELECT DATE_TRUNC('month', created_at) as month
           FROM user_films WHERE user_id=$1
           UNION ALL
           SELECT DATE_TRUNC('month', created_at) as month
           FROM user_series WHERE user_id=$1
         ) t
         GROUP BY month
         ORDER BY month ASC`,
        [userId],
      ),
      pool.query(
        `SELECT genre, ROUND(AVG(rating)::numeric, 2) as avg_rating, COUNT(*)::int as count
         FROM (
           SELECT unnest(fc.genres) as genre, uf.my_rating as rating
           FROM user_films uf
           JOIN films_catalog fc ON uf.film_catalog_id = fc.id
           WHERE uf.user_id=$1 AND fc.genres IS NOT NULL AND uf.my_rating IS NOT NULL
           UNION ALL
           SELECT unnest(sc.genres) as genre, us.my_rating as rating
           FROM user_series us
           JOIN series_catalog sc ON us.series_catalog_id = sc.id
           WHERE us.user_id=$1 AND sc.genres IS NOT NULL AND us.my_rating IS NOT NULL
         ) t
         GROUP BY genre
         HAVING COUNT(*) >= 2
         ORDER BY avg_rating DESC
         LIMIT 10`,
        [userId],
      ),
      pool.query(
        `SELECT status, COUNT(*)::int as count
         FROM (
           SELECT status FROM user_films WHERE user_id=$1 AND status IS NOT NULL AND status <> ''
           UNION ALL
           SELECT status FROM user_series WHERE user_id=$1 AND status IS NOT NULL AND status <> ''
         ) t
         GROUP BY status
         ORDER BY count DESC`,
        [userId],
      ),
      pool.query(
        `SELECT director, COUNT(*)::int as count
         FROM (
           SELECT fc.director as director
           FROM user_films uf
           JOIN films_catalog fc ON uf.film_catalog_id = fc.id
           WHERE uf.user_id=$1 AND fc.director IS NOT NULL AND fc.director <> ''
           UNION ALL
           SELECT sc.director as director
           FROM user_series us
           JOIN series_catalog sc ON us.series_catalog_id = sc.id
           WHERE us.user_id=$1 AND sc.director IS NOT NULL AND sc.director <> ''
         ) t
         GROUP BY director
         ORDER BY count DESC
         LIMIT 10`,
        [userId],
      ),
    ]);

    const genres: GenreStat[] = genresData.rows.map((row) => ({
      genre: row.genre,
      count: parseIntField(row.count),
    }));

    const years: YearStat[] = yearsData.rows.map((row) => ({
      year: row.year,
      count: parseIntField(row.count),
    }));

    const ratings: RatingRangeStat[] = ratingsData.rows.map((row) => ({
      range: row.range,
      count: parseIntField(row.count),
    }));

    const filmsVsSeries: FilmsVsSeriesStat = {
      films: parseIntField(filmsCount.rows[0]?.c),
      series: parseIntField(seriesCount.rows[0]?.c),
    };

    const monthly: MonthlyStat[] = monthlyData.rows.map((row) => ({
      month: row.month ? new Date(row.month).toISOString().slice(0, 7) : null,
      count: parseIntField(row.count),
    }));

    const avgByGenre: AvgRatingByGenreStat[] = avgRatingByGenre.rows.map((row) => ({
      genre: row.genre,
      avgRating: parseFloatField(row.avg_rating) ?? 0,
      count: parseIntField(row.count),
    }));

    const statuses: StatusStat[] = statusData.rows.map((row) => ({
      status: row.status,
      count: parseIntField(row.count),
    }));

    const directors: DirectorStat[] = directorsData.rows.map((row) => ({
      director: row.director,
      count: parseIntField(row.count),
    }));

    return {
      genres,
      years,
      ratings,
      filmsVsSeries,
      monthly,
      avgRatingByGenre: avgByGenre,
      statuses,
      directors,
    };
  }
}

