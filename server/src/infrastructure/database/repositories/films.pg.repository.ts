import { pool } from '../../../config/db.js';
import type { FilmsRepository, FilmCatalogCreateInput, UserFilmRow } from '../../../domain/films/film.types.js';

export class FilmsPgRepository implements FilmsRepository {
  async listUserFilms(params: {
    userId: number;
    query?: string;
    status?: string;
    ratingGte?: number;
    limit: number;
    offset: number;
  }): Promise<{ items: UserFilmRow[]; total: number }> {
    const conditions: string[] = ['uf.user_id = $1'];
    const values: unknown[] = [params.userId];
    let paramIndex = 2;

    if (params.query) {
      values.push(`%${params.query}%`);
      conditions.push(`fc.title ILIKE $${paramIndex}`);
      paramIndex++;
    }

    if (params.status) {
      values.push(params.status);
      conditions.push(`uf.status = $${paramIndex}`);
      paramIndex++;
    }

    if (typeof params.ratingGte === 'number') {
      values.push(params.ratingGte);
      conditions.push(`fc.rating >= $${paramIndex}`);
      paramIndex++;
    }

    const where = conditions.join(' AND ');
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;

    const [countResult, listResult] = await Promise.all([
      pool.query<{ total: number }>(
        `SELECT COUNT(*)::int as total
         FROM user_films uf
         JOIN films_catalog fc ON uf.film_catalog_id = fc.id
         WHERE ${where}`,
        values,
      ),
      pool.query<UserFilmRow>(
      `SELECT 
        uf.id as user_film_id,
        uf.user_id,
        uf.film_catalog_id,
        fc.title,
        fc.poster_url,
        fc.poster_url_preview,
        fc.logo_url,
        fc.rating,
        fc.rating_kinopoisk,
        fc.year,
        fc.description,
        fc.kp_is_series,
        fc.kp_episodes_count,
        fc.kp_seasons_count,
        fc.kp_id,
        fc.web_url,
        fc.director,
        fc.budget,
        fc.budget_currency_code,
        fc.budget_currency_symbol,
        fc.revenue,
        fc.genres,
        fc.actors,
        fc.film_length,
        uf.my_rating,
        uf.opinion,
        uf.status as user_status,
        uf.created_at,
        uf.updated_at
      FROM user_films uf
      JOIN films_catalog fc ON uf.film_catalog_id = fc.id
      WHERE ${where}
      ORDER BY uf.created_at DESC
      LIMIT $${limitParamIndex}
      OFFSET $${offsetParamIndex}`,
        [...values, params.limit, params.offset],
      ),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    return { items: listResult.rows, total };
  }

  async getUserFilm(userFilmId: number, userId: number): Promise<UserFilmRow | null> {
    const { rows } = await pool.query<UserFilmRow>(
      `SELECT 
        uf.id as user_film_id,
        uf.user_id,
        uf.film_catalog_id,
        fc.title,
        fc.poster_url,
        fc.poster_url_preview,
        fc.logo_url,
        fc.rating,
        fc.rating_kinopoisk,
        fc.year,
        fc.description,
        fc.kp_is_series,
        fc.kp_episodes_count,
        fc.kp_seasons_count,
        fc.kp_id,
        fc.web_url,
        fc.director,
        fc.budget,
        fc.budget_currency_code,
        fc.budget_currency_symbol,
        fc.revenue,
        fc.genres,
        fc.actors,
        fc.film_length,
        uf.my_rating,
        uf.opinion,
        uf.status as user_status,
        uf.created_at,
        uf.updated_at
      FROM user_films uf
      JOIN films_catalog fc ON uf.film_catalog_id = fc.id
      WHERE uf.id = $1 AND uf.user_id = $2`,
      [userFilmId, userId],
    );
    return rows[0] ?? null;
  }

  async findCatalogIdByKpId(kpId: number): Promise<number | null> {
    const { rows } = await pool.query<{ id: number }>('SELECT id FROM films_catalog WHERE kp_id = $1', [kpId]);
    return rows[0]?.id ?? null;
  }

  async findCatalogIdByTitleYear(title: string, year: number | null): Promise<number | null> {
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM films_catalog WHERE LOWER(title) = LOWER($1) AND COALESCE(year, 0) = COALESCE($2, 0)',
      [title, year],
    );
    return rows[0]?.id ?? null;
  }

  async createCatalogEntry(input: FilmCatalogCreateInput): Promise<number> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO films_catalog (
        title, poster_url, poster_url_preview, logo_url, rating, rating_kinopoisk, year, description, kp_is_series,
        kp_episodes_count, kp_seasons_count, kp_id, web_url, director, budget, budget_currency_code, budget_currency_symbol,
        revenue, genres, actors, film_length
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
        input.kpId ?? null,
        input.webUrl ?? null,
        input.director ?? null,
        input.budget ?? null,
        input.budgetCurrencyCode ?? null,
        input.budgetCurrencySymbol ?? null,
        input.revenue ?? null,
        input.genres ?? null,
        input.actors ?? null,
        input.filmLength ?? null,
      ],
    );
    return rows[0].id;
  }

  async findUserFilmDuplicateByTitleYear(title: string, year: number | null, userId: number): Promise<UserFilmRow | null> {
    const params: unknown[] = [userId, title];
    let sql = `
      SELECT 
        uf.id as user_film_id,
        uf.user_id,
        uf.film_catalog_id,
        fc.title,
        fc.poster_url,
        fc.poster_url_preview,
        fc.logo_url,
        fc.rating,
        fc.rating_kinopoisk,
        fc.year,
        fc.description,
        fc.kp_is_series,
        fc.kp_episodes_count,
        fc.kp_seasons_count,
        fc.kp_id,
        fc.web_url,
        fc.director,
        fc.budget,
        fc.budget_currency_code,
        fc.budget_currency_symbol,
        fc.revenue,
        fc.genres,
        fc.actors,
        fc.film_length,
        uf.my_rating,
        uf.opinion,
        uf.status as user_status,
        uf.created_at,
        uf.updated_at
      FROM user_films uf
      JOIN films_catalog fc ON uf.film_catalog_id = fc.id
      WHERE uf.user_id = $1 AND LOWER(fc.title) = LOWER($2)
    `;
    if (typeof year === 'number') {
      params.push(year);
      sql += ' AND COALESCE(fc.year, 0) = COALESCE($3, 0)';
    }
    const { rows } = await pool.query<UserFilmRow>(sql, params);
    return rows[0] ?? null;
  }

  async createUserFilm(params: { userId: number; filmCatalogId: number; myRating?: number | null; opinion?: string | null; status?: string | null }): Promise<number> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO user_films (user_id, film_catalog_id, my_rating, opinion, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        params.userId,
        params.filmCatalogId,
        params.myRating ?? null,
        params.opinion ?? null,
        params.status ?? null,
      ],
    );
    return rows[0].id;
  }

  async updateUserFilm(userFilmId: number, userId: number, data: { myRating?: number | null; opinion?: string | null; status?: string | null }): Promise<void> {
    await pool.query(
      `UPDATE user_films 
       SET my_rating = $1, opinion = $2, status = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5`,
      [
        data.myRating ?? null,
        data.opinion ?? null,
        data.status ?? null,
        userFilmId,
        userId,
      ],
    );
  }

  async deleteUserFilm(userFilmId: number, userId: number): Promise<void> {
    await pool.query('DELETE FROM user_films WHERE id = $1 AND user_id = $2', [userFilmId, userId]);
  }
}

