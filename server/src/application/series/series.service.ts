import type { SeriesRepository, SeriesCatalogCreateInput, UserSeriesRow } from '../../domain/series/series.types.js';
import type { KinopoiskClient, KpEnriched } from '../../domain/integrations/kinopoisk.types.js';
import type { SeriesCreateDto, SeriesUpdateDto } from '../../app/validators/series.schema.js';

function mapRowToResponse(row: UserSeriesRow, userId: number) {
  return {
    id: row.user_series_id,
    title: row.title,
    poster_url: row.poster_url,
    rating: row.rating,
    year: row.year,
    description: row.description,
    kp_is_series: row.kp_is_series,
    kp_episodes_count: row.kp_episodes_count,
    kp_seasons_count: row.kp_seasons_count,
    kp_id: row.kp_id,
    director: row.director,
    budget: row.budget,
    revenue: row.revenue,
    genres: row.genres,
    actors: row.actors,
    my_rating: row.my_rating,
    opinion: row.opinion,
    status: row.user_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: userId,
  };
}

export class SeriesService {
  constructor(
    private readonly repository: SeriesRepository,
    private readonly kinopoiskClient: KinopoiskClient,
  ) {}

  async listSeries(query: string | undefined, status: string | undefined, ratingGte: number | undefined, userId?: number) {
    if (!userId) return [];
    const rows = await this.repository.listUserSeries({ userId, query, status, ratingGte });
    return rows.map((row) => mapRowToResponse(row, userId));
  }

  async getSeries(userSeriesId: number, userId?: number) {
    if (!userId) return null;
    const row = await this.repository.getUserSeries(userSeriesId, userId);
    if (!row) return null;
    return mapRowToResponse(row, userId);
  }

  private async loadKpDataForCreate(input: SeriesCreateDto): Promise<KpEnriched> {
    if (input.kp_id) {
      return this.kinopoiskClient.fetchFilmDetails(input.kp_id);
    }
    return this.kinopoiskClient.searchBestByTitle(input.title);
  }

  private async resolveCatalogId(input: SeriesCreateDto, kpData: KpEnriched): Promise<number> {
    let kpIdToUse: number | null = input.kp_id ?? kpData.kp_id ?? null;
    if (!kpIdToUse) {
      const posterToCheck = input.poster_url ?? kpData.kp_poster ?? null;
      kpIdToUse = this.kinopoiskClient.extractKpIdFromPosterUrl(posterToCheck);
    }

    if (kpIdToUse) {
      const existing = await this.repository.findCatalogIdByKpId(kpIdToUse);
      if (existing) {
        return existing;
      }
    }

    const year = kpData.kp_year ?? null;
    const existingByTitle = await this.repository.findCatalogIdByTitleYear(input.title, year);
    if (existingByTitle) {
      return existingByTitle;
    }

    const catalogInput: SeriesCatalogCreateInput = {
      title: input.title,
      posterUrl: input.poster_url ?? kpData.kp_poster ?? null,
      rating: input.rating ?? null,
      year,
      description: kpData.kp_description ?? null,
      kpIsSeries: kpData.kp_isSeries ?? true,
      kpEpisodesCount: kpData.kp_episodesCount ?? null,
      kpSeasonsCount: kpData.kp_seasonsCount ?? null,
      kpId: kpIdToUse,
      director: input.director ?? kpData.kp_director ?? null,
      budget: input.budget ?? kpData.kp_budget ?? null,
      revenue: input.revenue ?? kpData.kp_revenue ?? null,
      genres: input.genres ?? kpData.kp_genres ?? null,
      actors: input.actors ?? kpData.kp_actors ?? null,
    };

    return this.repository.createCatalogEntry(catalogInput);
  }

  private async ensureSeasonsAndEpisodes(userId: number, seriesCatalogId: number, kpId: number | null) {
    if (!kpId) return;
    const details = await this.kinopoiskClient.fetchSeriesDetails(kpId);
    const seasons = details.seasons ?? [];
    for (const season of seasons) {
      if (season.number === undefined) continue;
      const seasonCatalogId = await this.repository.getOrCreateSeasonCatalog(seriesCatalogId, season.number);
      await this.repository.ensureUserSeason(userId, seasonCatalogId);
      const episodes = season.episodes ?? [];
      for (const episode of episodes) {
        if (episode.number === undefined) continue;
        const episodeCatalogId = await this.repository.getOrCreateEpisodeCatalog(seasonCatalogId, episode.number, {
          title: episode.name ?? null,
          releaseDate: episode.releaseDate ?? null,
          duration: episode.duration ?? null,
        });
        await this.repository.ensureUserEpisode(userId, episodeCatalogId);
      }
    }
  }

  async createSeries(input: SeriesCreateDto, userId: number) {
    const kpData = await this.loadKpDataForCreate(input);
    const duplicate = await this.repository.findUserSeriesDuplicateByTitleYear(
      input.title,
      kpData.kp_year ?? null,
      userId,
    );
    if (duplicate) {
      const err: any = new Error('Duplicate series');
      err.status = 409;
      err.code = 'DUPLICATE_SERIES';
      throw err;
    }

    const catalogId = await this.resolveCatalogId(input, kpData);
    const userSeriesId = await this.repository.createUserSeries({
      userId,
      seriesCatalogId: catalogId,
      myRating: input.my_rating ?? null,
      opinion: input.opinion ?? null,
      status: input.status ?? null,
    });

    const kpIdToUse = input.kp_id ?? kpData.kp_id ?? null;
    await this.ensureSeasonsAndEpisodes(userId, catalogId, kpIdToUse);

    const row = await this.repository.getUserSeries(userSeriesId, userId);
    if (!row) throw new Error('Failed to load created series');
    return mapRowToResponse(row, userId);
  }

  async updateSeries(userSeriesId: number, input: SeriesUpdateDto, userId?: number) {
    if (!userId) return null;
    const existing = await this.repository.getUserSeries(userSeriesId, userId);
    if (!existing) return null;
    await this.repository.updateUserSeries(userSeriesId, userId, {
      myRating: input.my_rating ?? null,
      opinion: input.opinion ?? null,
      status: input.status ?? null,
    });
    const updated = await this.repository.getUserSeries(userSeriesId, userId);
    return updated ? mapRowToResponse(updated, userId) : null;
  }

  async deleteSeries(userSeriesId: number, userId?: number) {
    if (!userId) return;
    await this.repository.deleteUserSeries(userSeriesId, userId);
  }
}

