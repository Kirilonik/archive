import { pool } from '../../../config/db.js';
import type { EpisodesRepository, EpisodeRow } from '../../../domain/episodes/episode.types.js';

export class EpisodesPgRepository implements EpisodesRepository {
  async findSeasonCatalogId(seasonUserId: number, userId: number): Promise<number | null> {
    const { rows } = await pool.query<{ season_catalog_id: number }>(
      'SELECT season_catalog_id FROM user_seasons WHERE id = $1 AND user_id = $2',
      [seasonUserId, userId],
    );
    return rows[0]?.season_catalog_id ?? null;
  }

  async listEpisodes(seasonCatalogId: number, userId: number): Promise<EpisodeRow[]> {
    const { rows } = await pool.query(
      `SELECT 
        ec.id as catalog_id,
        ec.number,
        ec.title,
        ec.release_date,
        ec.duration,
        ue.id as user_episode_id,
        ue.watched,
        ue.created_at as user_created_at,
        ue.updated_at as user_updated_at,
        us.id as user_season_id
      FROM episodes_catalog ec
      LEFT JOIN user_episodes ue ON ec.id = ue.episode_catalog_id AND ue.user_id = $1
      LEFT JOIN user_seasons us ON us.season_catalog_id = ec.season_catalog_id AND us.user_id = $1
      WHERE ec.season_catalog_id = $2
      ORDER BY ec.number`,
      [userId, seasonCatalogId],
    );
    return rows.map((row: any) => ({
      catalog_id: row.catalog_id,
      user_episode_id: row.user_episode_id ?? null,
      number: row.number,
      title: row.title ?? null,
      release_date: row.release_date ?? null,
      duration: row.duration ?? null,
      watched: row.watched ?? null,
      created_at: row.user_created_at ?? null,
      updated_at: row.user_updated_at ?? null,
    }));
  }

  async findUserEpisodeByCatalog(userId: number, episodeCatalogId: number): Promise<{ id: number; watched: boolean } | null> {
    const { rows } = await pool.query<{ id: number; watched: boolean }>(
      'SELECT id, watched FROM user_episodes WHERE user_id = $1 AND episode_catalog_id = $2',
      [userId, episodeCatalogId],
    );
    return rows[0] ?? null;
  }

  async createUserEpisode(userId: number, episodeCatalogId: number): Promise<{ id: number; watched: boolean }> {
    const { rows } = await pool.query<{ id: number; watched: boolean }>(
      'INSERT INTO user_episodes (user_id, episode_catalog_id, watched) VALUES ($1, $2, false) RETURNING id, watched',
      [userId, episodeCatalogId],
    );
    return rows[0];
  }

  async updateEpisodeCatalog(episodeCatalogId: number, data: { title?: string | null; releaseDate?: string | null; duration?: number | null }): Promise<void> {
    if (data.title === undefined && data.releaseDate === undefined && data.duration === undefined) {
      return;
    }
    await pool.query(
      'UPDATE episodes_catalog SET title = COALESCE($1, title), release_date = COALESCE($2, release_date), duration = COALESCE($3, duration) WHERE id = $4',
      [data.title ?? null, data.releaseDate ?? null, data.duration ?? null, episodeCatalogId],
    );
  }

  async getUserEpisode(userEpisodeId: number, userId: number): Promise<EpisodeRow | null> {
    const { rows } = await pool.query(
      `SELECT 
        ec.id as catalog_id,
        ec.number,
        ec.title,
        ec.release_date,
        ec.duration,
        ue.id as user_episode_id,
        ue.watched,
        ue.created_at as user_created_at,
        ue.updated_at as user_updated_at,
        us.id as user_season_id
      FROM episodes_catalog ec
      JOIN user_episodes ue ON ec.id = ue.episode_catalog_id
      LEFT JOIN user_seasons us ON us.season_catalog_id = ec.season_catalog_id AND us.user_id = ue.user_id
      WHERE ue.id = $1 AND ue.user_id = $2`,
      [userEpisodeId, userId],
    );
    if (!rows[0]) return null;
    const row: any = rows[0];
    return {
      catalog_id: row.catalog_id,
      user_episode_id: row.user_episode_id,
      number: row.number,
      title: row.title ?? null,
      release_date: row.release_date ?? null,
      duration: row.duration ?? null,
      watched: row.watched ?? null,
      created_at: row.user_created_at ?? null,
      updated_at: row.user_updated_at ?? null,
    };
  }

  async deleteUserEpisode(userEpisodeId: number, userId: number): Promise<void> {
    await pool.query('DELETE FROM user_episodes WHERE id = $1 AND user_id = $2', [userEpisodeId, userId]);
  }

  async markUserEpisode(userEpisodeId: number, userId: number, watched: boolean): Promise<{ id: number; watched: boolean } | null> {
    const { rows } = await pool.query<{ id: number; watched: boolean }>(
      'UPDATE user_episodes SET watched = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, watched',
      [watched, userEpisodeId, userId],
    );
    return rows[0] ?? null;
  }
}

