import { pool } from '../../../config/db.js';
import type { SeasonsRepository, SeasonRow } from '../../../domain/seasons/season.types.js';

export class SeasonsPgRepository implements SeasonsRepository {
  async findSeriesCatalogId(seriesUserId: number, userId: number): Promise<number | null> {
    const { rows } = await pool.query<{ series_catalog_id: number }>(
      'SELECT series_catalog_id FROM user_series WHERE id = $1 AND user_id = $2',
      [seriesUserId, userId],
    );
    return rows[0]?.series_catalog_id ?? null;
  }

  async listSeasons(seriesCatalogId: number, userId: number): Promise<SeasonRow[]> {
    const { rows } = await pool.query(
      `SELECT 
        sc.id as catalog_id,
        sc.number,
        us.id as user_season_id,
        us.watched,
        us.created_at as user_created_at,
        us.updated_at as user_updated_at
      FROM seasons_catalog sc
      LEFT JOIN user_seasons us ON sc.id = us.season_catalog_id AND us.user_id = $1
      WHERE sc.series_catalog_id = $2
      ORDER BY sc.number`,
      [userId, seriesCatalogId],
    );
    return rows.map((row: any) => ({
      catalog_id: row.catalog_id,
      user_season_id: row.user_season_id ?? null,
      number: row.number,
      watched: row.watched ?? null,
      created_at: row.user_created_at ?? null,
      updated_at: row.user_updated_at ?? null,
    }));
  }

  async findUserSeasonByCatalog(userId: number, seasonCatalogId: number): Promise<{ id: number; watched: boolean } | null> {
    const { rows } = await pool.query<{ id: number; watched: boolean }>(
      'SELECT id, watched FROM user_seasons WHERE user_id = $1 AND season_catalog_id = $2',
      [userId, seasonCatalogId],
    );
    return rows[0] ?? null;
  }

  async createUserSeason(userId: number, seasonCatalogId: number): Promise<{ id: number; watched: boolean }> {
    const { rows } = await pool.query<{ id: number; watched: boolean }>(
      'INSERT INTO user_seasons (user_id, season_catalog_id, watched) VALUES ($1, $2, false) RETURNING id, watched',
      [userId, seasonCatalogId],
    );
    return rows[0];
  }

  async getUserSeason(userSeasonId: number, userId: number): Promise<{ seasonCatalogId: number } | null> {
    const { rows } = await pool.query<{ season_catalog_id: number }>(
      'SELECT season_catalog_id FROM user_seasons WHERE id = $1 AND user_id = $2',
      [userSeasonId, userId],
    );
    if (!rows[0]) return null;
    return { seasonCatalogId: rows[0].season_catalog_id };
  }

  async deleteUserSeason(userSeasonId: number, userId: number): Promise<void> {
    await pool.query('DELETE FROM user_seasons WHERE id = $1 AND user_id = $2', [userSeasonId, userId]);
  }

  async markUserSeason(userSeasonId: number, userId: number, watched: boolean): Promise<{ id: number; watched: boolean } | null> {
    const { rows } = await pool.query<{ id: number; watched: boolean }>(
      'UPDATE user_seasons SET watched = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, watched',
      [watched, userSeasonId, userId],
    );
    return rows[0] ?? null;
  }

  async listSeasonEpisodeCatalogIds(seasonCatalogId: number): Promise<number[]> {
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM episodes_catalog WHERE season_catalog_id = $1',
      [seasonCatalogId],
    );
    return rows.map((row) => row.id);
  }

  async syncUserEpisode(userId: number, episodeCatalogId: number, watched: boolean): Promise<void> {
    await pool.query(
      `INSERT INTO user_episodes (user_id, episode_catalog_id, watched)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, episode_catalog_id)
       DO UPDATE SET watched = $3, updated_at = NOW()`,
      [userId, episodeCatalogId, watched],
    );
  }
}

