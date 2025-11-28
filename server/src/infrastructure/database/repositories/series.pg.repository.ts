import { pool } from '../../../config/db.js';
import type {
  SeriesRepository,
  SeriesCatalogCreateInput,
  UserSeriesRow,
} from '../../../domain/series/series.types.js';

export class SeriesPgRepository implements SeriesRepository {
  async listUserSeries(params: {
    userId: number;
    query?: string;
    status?: string;
    ratingGte?: number;
    limit: number;
    offset: number;
  }): Promise<{ items: UserSeriesRow[]; total: number }> {
    const conditions: string[] = ['us.user_id = $1'];
    const values: unknown[] = [params.userId];
    let paramIndex = 2;

    if (params.query) {
      values.push(`%${params.query}%`);
      conditions.push(`sc.title ILIKE $${paramIndex}`);
      paramIndex++;
    }

    if (params.status) {
      values.push(params.status);
      conditions.push(`us.status = $${paramIndex}`);
      paramIndex++;
    }

    if (typeof params.ratingGte === 'number') {
      values.push(params.ratingGte);
      conditions.push(`sc.rating >= $${paramIndex}`);
      paramIndex++;
    }

    // Безопасное формирование WHERE через join параметризованных условий
    // Все условия формируются статически в коде, значения параметризованы через $1, $2 и т.д.
    const whereClause = conditions.join(' AND ');
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;

    // Базовые части SQL запроса (без интерполяции пользовательских данных)
    const fromJoin = 'FROM user_series us JOIN series_catalog sc ON us.series_catalog_id = sc.id';
    const wherePart = 'WHERE ' + whereClause;

    const [countResult, listResult] = await Promise.all([
      pool.query<{ total: number }>(
        'SELECT COUNT(*)::int as total ' + fromJoin + ' ' + wherePart,
        values,
      ),
      pool.query<UserSeriesRow>(
        'SELECT ' +
          'us.id as user_series_id, us.user_id, us.series_catalog_id, sc.title, sc.poster_url, ' +
          'sc.poster_url_preview, sc.logo_url, sc.rating, sc.rating_kinopoisk, sc.year, ' +
          'sc.description, sc.kp_is_series, sc.kp_episodes_count, sc.kp_seasons_count, ' +
          'sc.kp_id, sc.web_url, sc.director, sc.budget, sc.revenue, sc.genres, sc.actors, ' +
          'sc.film_length, us.my_rating, us.opinion, us.status as user_status, ' +
          'us.created_at, us.updated_at ' +
          fromJoin +
          ' ' +
          wherePart +
          ' ORDER BY us.created_at DESC LIMIT $' +
          limitParamIndex +
          ' OFFSET $' +
          offsetParamIndex,
        [...values, params.limit, params.offset],
      ),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return { items: listResult.rows, total };
  }

  async getUserSeries(userSeriesId: number, userId: number): Promise<UserSeriesRow | null> {
    const { rows } = await pool.query<UserSeriesRow>(
      `SELECT
        us.id as user_series_id,
        us.user_id,
        us.series_catalog_id,
        sc.title,
        sc.poster_url,
        sc.poster_url_preview,
        sc.logo_url,
        sc.rating,
        sc.rating_kinopoisk,
        sc.year,
        sc.description,
        sc.kp_is_series,
        sc.kp_episodes_count,
        sc.kp_seasons_count,
        sc.kp_id,
        sc.web_url,
        sc.director,
        sc.budget,
        sc.revenue,
        sc.genres,
        sc.actors,
        sc.film_length,
        us.my_rating,
        us.opinion,
        us.status as user_status,
        us.created_at,
        us.updated_at
      FROM user_series us
      JOIN series_catalog sc ON us.series_catalog_id = sc.id
      WHERE us.id = $1 AND us.user_id = $2`,
      [userSeriesId, userId],
    );
    return rows[0] ?? null;
  }

  async findCatalogIdByFilmId(filmId: number): Promise<number | null> {
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM series_catalog WHERE kp_id = $1',
      [filmId],
    );
    return rows[0]?.id ?? null;
  }

  async findCatalogIdByTitleYear(title: string, year: number | null): Promise<number | null> {
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM series_catalog WHERE LOWER(title) = LOWER($1) AND COALESCE(year, 0) = COALESCE($2, 0)',
      [title, year],
    );
    return rows[0]?.id ?? null;
  }

  async createCatalogEntry(input: SeriesCatalogCreateInput): Promise<number> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO series_catalog (
        title, poster_url, poster_url_preview, logo_url, rating, rating_kinopoisk, year, description, kp_is_series,
        kp_episodes_count, kp_seasons_count, kp_id, web_url, director, budget, revenue, genres, actors, film_length
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING id`,
      [
        input.title,
        input.posterUrl ?? null,
        input.posterUrlPreview ?? null,
        input.logoUrl ?? null,
        input.rating ?? null,
        input.ratingKinopoisk ?? null,
        input.year ?? null,
        input.description ?? null,
        input.kpIsSeries ?? null,
        input.kpEpisodesCount ?? null,
        input.kpSeasonsCount ?? null,
        input.filmId ?? null,
        input.webUrl ?? null,
        input.director ?? null,
        input.budget ?? null,
        input.revenue ?? null,
        input.genres ?? null,
        input.actors ?? null,
        input.filmLength ?? null,
      ],
    );
    return rows[0].id;
  }

  async findUserSeriesDuplicateByTitleYear(
    title: string,
    year: number | null,
    userId: number,
  ): Promise<UserSeriesRow | null> {
    // Безопасное формирование SQL с параметризованными значениями
    const params: unknown[] = [userId, title];
    const conditions = ['us.user_id = $1', 'LOWER(sc.title) = LOWER($2)'];

    if (typeof year === 'number') {
      params.push(year);
      conditions.push('COALESCE(sc.year, 0) = COALESCE($3, 0)');
    }

    // Безопасное формирование SQL с параметризованными значениями
    const whereClause = conditions.join(' AND ');
    const sql =
      'SELECT ' +
      'us.id as user_series_id, us.user_id, us.series_catalog_id, sc.title, sc.poster_url, ' +
      'sc.poster_url_preview, sc.logo_url, sc.rating, sc.rating_kinopoisk, sc.year, ' +
      'sc.description, sc.kp_is_series, sc.kp_episodes_count, sc.kp_seasons_count, ' +
      'sc.kp_id, sc.web_url, sc.director, sc.budget, sc.revenue, sc.genres, sc.actors, ' +
      'sc.film_length, us.my_rating, us.opinion, us.status as user_status, ' +
      'us.created_at, us.updated_at ' +
      'FROM user_series us JOIN series_catalog sc ON us.series_catalog_id = sc.id ' +
      'WHERE ' +
      whereClause;
    const { rows } = await pool.query<UserSeriesRow>(sql, params);
    return rows[0] ?? null;
  }

  async createUserSeries(params: {
    userId: number;
    seriesCatalogId: number;
    myRating?: number | null;
    opinion?: string | null;
    status?: string | null;
  }): Promise<number> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO user_series (user_id, series_catalog_id, my_rating, opinion, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        params.userId,
        params.seriesCatalogId,
        params.myRating ?? null,
        params.opinion ?? null,
        params.status ?? null,
      ],
    );
    return rows[0].id;
  }

  async updateUserSeries(
    userSeriesId: number,
    userId: number,
    data: { myRating?: number | null; opinion?: string | null; status?: string | null },
  ): Promise<void> {
    await pool.query(
      `UPDATE user_series
       SET my_rating = $1, opinion = $2, status = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [data.myRating ?? null, data.opinion ?? null, data.status ?? null, userSeriesId, userId],
    );
  }

  async deleteUserSeries(userSeriesId: number, userId: number): Promise<void> {
    const { rows: series } = await pool.query<{ series_catalog_id: number }>(
      'SELECT series_catalog_id FROM user_series WHERE id = $1 AND user_id = $2',
      [userSeriesId, userId],
    );
    if (!series[0]) return;
    const seriesCatalogId = series[0].series_catalog_id;

    const { rows: seasons } = await pool.query<{ id: number }>(
      'SELECT id FROM seasons_catalog WHERE series_catalog_id = $1',
      [seriesCatalogId],
    );

    for (const season of seasons) {
      const { rows: episodes } = await pool.query<{ id: number }>(
        'SELECT id FROM episodes_catalog WHERE season_catalog_id = $1',
        [season.id],
      );
      for (const episode of episodes) {
        await pool.query(
          'DELETE FROM user_episodes WHERE user_id = $1 AND episode_catalog_id = $2',
          [userId, episode.id],
        );
      }
      await pool.query('DELETE FROM user_seasons WHERE user_id = $1 AND season_catalog_id = $2', [
        userId,
        season.id,
      ]);
    }

    await pool.query('DELETE FROM user_series WHERE id = $1 AND user_id = $2', [
      userSeriesId,
      userId,
    ]);
  }

  async getOrCreateSeasonCatalog(seriesCatalogId: number, seasonNumber: number): Promise<number> {
    const { rows: existing } = await pool.query<{ id: number }>(
      'SELECT id FROM seasons_catalog WHERE series_catalog_id = $1 AND number = $2',
      [seriesCatalogId, seasonNumber],
    );
    if (existing[0]) {
      return existing[0].id;
    }
    const { rows } = await pool.query<{ id: number }>(
      'INSERT INTO seasons_catalog (series_catalog_id, number) VALUES ($1, $2) RETURNING id',
      [seriesCatalogId, seasonNumber],
    );
    return rows[0].id;
  }

  async getOrCreateEpisodeCatalog(
    seasonCatalogId: number,
    episodeNumber: number,
    options: { title?: string | null; releaseDate?: string | null; duration?: number | null },
  ): Promise<number> {
    const { rows: existing } = await pool.query<{ id: number }>(
      'SELECT id FROM episodes_catalog WHERE season_catalog_id = $1 AND number = $2',
      [seasonCatalogId, episodeNumber],
    );
    if (existing[0]) {
      await pool.query(
        'UPDATE episodes_catalog SET title = COALESCE($1, title), release_date = COALESCE($2, release_date), duration = COALESCE($3, duration) WHERE id = $4',
        [
          options.title ?? null,
          options.releaseDate ?? null,
          options.duration ?? null,
          existing[0].id,
        ],
      );
      return existing[0].id;
    }
    const { rows } = await pool.query<{ id: number }>(
      'INSERT INTO episodes_catalog (season_catalog_id, number, title, release_date, duration) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [
        seasonCatalogId,
        episodeNumber,
        options.title ?? null,
        options.releaseDate ?? null,
        options.duration ?? null,
      ],
    );
    return rows[0].id;
  }

  async ensureUserSeason(userId: number, seasonCatalogId: number): Promise<void> {
    await pool.query(
      `INSERT INTO user_seasons (user_id, season_catalog_id, watched)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, season_catalog_id) DO NOTHING`,
      [userId, seasonCatalogId, false],
    );
  }

  async ensureUserEpisode(userId: number, episodeCatalogId: number): Promise<void> {
    await pool.query(
      `INSERT INTO user_episodes (user_id, episode_catalog_id, watched)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, episode_catalog_id) DO NOTHING`,
      [userId, episodeCatalogId, false],
    );
  }
}
