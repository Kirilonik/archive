import type { EpisodesRepository } from '../../domain/episodes/episode.types.js';
import type { SeriesRepository } from '../../domain/series/series.types.js';

export class EpisodeService {
  constructor(
    private readonly episodesRepository: EpisodesRepository,
    private readonly seriesRepository: SeriesRepository,
  ) {}

  private mapToResponse(
    row: {
      catalog_id: number;
      user_episode_id: number | null;
      user_season_id?: number | null;
      number: number;
      title: string | null;
      release_date: string | null;
      duration: number | null;
      watched: boolean | null;
      created_at: any;
      updated_at: any;
    },
    seasonId: number,
  ) {
    return {
      id: row.user_episode_id ?? row.catalog_id,
      season_id: row.user_season_id ?? seasonId,
      number: row.number,
      title: row.title,
      release_date: row.release_date,
      duration: row.duration,
      watched: row.watched ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async listEpisodes(seasonId: number, userId?: number) {
    if (!userId) return [];
    const seasonCatalogId = await this.episodesRepository.findSeasonCatalogId(seasonId, userId);
    if (!seasonCatalogId) return [];
    const rows = await this.episodesRepository.listEpisodes(seasonCatalogId, userId);
    return rows.map((row) => this.mapToResponse(row, seasonId));
  }

  async createEpisode(
    seasonId: number,
    number: number,
    title: string | undefined,
    userId?: number,
    releaseDate?: string | null,
    duration?: number | null,
  ) {
    if (!userId) {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const seasonCatalogId = await this.episodesRepository.findSeasonCatalogId(seasonId, userId);
    if (!seasonCatalogId) {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const episodeCatalogId = await this.seriesRepository.getOrCreateEpisodeCatalog(seasonCatalogId, number, {
      title: title ?? null,
      releaseDate: releaseDate ?? null,
      duration: duration ?? null,
    });
    const existing = await this.episodesRepository.findUserEpisodeByCatalog(userId, episodeCatalogId);
    if (existing) {
      return {
        id: existing.id,
        season_id: seasonId,
        number,
        title: title ?? null,
        release_date: releaseDate ?? null,
        duration: duration ?? null,
        watched: existing.watched,
      };
    }
    const created = await this.episodesRepository.createUserEpisode(userId, episodeCatalogId);
    return {
      id: created.id,
      season_id: seasonId,
      number,
      title: title ?? null,
      release_date: releaseDate ?? null,
      duration: duration ?? null,
      watched: created.watched,
    };
  }

  async updateEpisode(
    episodeId: number,
    fields: { number?: number; title?: string; release_date?: string | null; duration?: number | null },
    userId?: number,
  ) {
    if (!userId) return null;
    const userEpisode = await this.episodesRepository.getUserEpisode(episodeId, userId);
    if (!userEpisode) return null;
    const catalogId = userEpisode.catalog_id;
    await this.episodesRepository.updateEpisodeCatalog(catalogId, {
      title: fields.title ?? undefined,
      releaseDate: fields.release_date ?? undefined,
      duration: fields.duration ?? undefined,
    });
    const refreshed = await this.episodesRepository.getUserEpisode(episodeId, userId);
    if (!refreshed) return null;
    return this.mapToResponse(refreshed, refreshed.user_season_id ?? 0);
  }

  async deleteEpisode(episodeId: number, userId?: number) {
    if (!userId) return;
    await this.episodesRepository.deleteUserEpisode(episodeId, userId);
  }

  async markEpisodeWatched(episodeId: number, watched: boolean, userId?: number) {
    if (!userId) {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const updated = await this.episodesRepository.markUserEpisode(episodeId, userId, watched);
    return updated;
  }
}

