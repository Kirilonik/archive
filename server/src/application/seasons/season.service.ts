import type { SeasonsRepository } from '../../domain/seasons/season.types.js';
import type { SeriesRepository } from '../../domain/series/series.types.js';
import type { StatsService } from '../stats/stats.service.js';

export class SeasonService {
  constructor(
    private readonly seasonsRepository: SeasonsRepository,
    private readonly seriesRepository: SeriesRepository,
    private readonly statsService?: StatsService,
  ) {}

  private invalidateStats(userId: number) {
    this.statsService?.clearCacheFor(userId);
  }

  private mapToResponse(row: { catalog_id: number; user_season_id: number | null; number: number; watched: boolean | null; created_at: any; updated_at: any }, seriesId: number) {
    return {
      id: row.user_season_id ?? row.catalog_id,
      series_id: seriesId,
      number: row.number,
      watched: row.watched ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async listSeasons(seriesId: number, userId?: number) {
    if (!userId) return [];
    const seriesCatalogId = await this.seasonsRepository.findSeriesCatalogId(seriesId, userId);
    if (!seriesCatalogId) return [];
    const rows = await this.seasonsRepository.listSeasons(seriesCatalogId, userId);
    return rows.map((row) => this.mapToResponse(row, seriesId));
  }

  async createSeason(seriesId: number, number: number, userId?: number) {
    if (!userId) {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const seriesCatalogId = await this.seasonsRepository.findSeriesCatalogId(seriesId, userId);
    if (!seriesCatalogId) {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const seasonCatalogId = await this.seriesRepository.getOrCreateSeasonCatalog(seriesCatalogId, number);
    const existing = await this.seasonsRepository.findUserSeasonByCatalog(userId, seasonCatalogId);
    if (existing) {
      return {
        id: existing.id,
        series_id: seriesId,
        number,
        watched: existing.watched,
      };
    }
    const created = await this.seasonsRepository.createUserSeason(userId, seasonCatalogId);
    this.invalidateStats(userId);
    return {
      id: created.id,
      series_id: seriesId,
      number,
      watched: created.watched,
    };
  }

  async deleteSeason(seasonId: number, userId?: number) {
    if (!userId) return;
    await this.seasonsRepository.deleteUserSeason(seasonId, userId);
    this.invalidateStats(userId);
  }

  async markSeasonWatched(seasonId: number, watched: boolean, userId?: number) {
    if (!userId) {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const seasonRef = await this.seasonsRepository.getUserSeason(seasonId, userId);
    if (!seasonRef) {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const updated = await this.seasonsRepository.markUserSeason(seasonId, userId, watched);
    if (!updated) return null;
    const episodeIds = await this.seasonsRepository.listSeasonEpisodeCatalogIds(seasonRef.seasonCatalogId);
    await Promise.all(episodeIds.map((episodeId) => this.seasonsRepository.syncUserEpisode(userId, episodeId, watched)));
    this.invalidateStats(userId);
    return {
      id: updated.id,
      watched: updated.watched,
    };
  }
}

