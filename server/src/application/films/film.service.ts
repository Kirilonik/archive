import type { FilmsRepository, FilmCatalogCreateInput, UserFilmRow } from '../../domain/films/film.types.js';
import type { KinopoiskClient, KpEnriched } from '../../domain/integrations/kinopoisk.types.js';
import type { FilmCreateDto, FilmUpdateDto } from '../../app/validators/films.schema.js';

function mapRowToResponse(row: UserFilmRow, userId: number) {
  return {
    id: row.user_film_id,
    title: row.title,
    poster_url: row.poster_url,
    poster_url_preview: row.poster_url_preview,
    logo_url: row.logo_url,
    rating: row.rating,
    rating_kinopoisk: row.rating_kinopoisk,
    year: row.year,
    description: row.description,
    kp_is_series: row.kp_is_series,
    kp_episodes_count: row.kp_episodes_count,
    kp_seasons_count: row.kp_seasons_count,
    kp_id: row.kp_id,
    web_url: row.web_url,
    director: row.director,
    budget: row.budget,
    budget_currency_code: row.budget_currency_code,
    budget_currency_symbol: row.budget_currency_symbol,
    revenue: row.revenue,
    genres: row.genres,
    actors: row.actors,
    film_length: row.film_length,
    my_rating: row.my_rating,
    opinion: row.opinion,
    status: row.user_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: userId,
  };
}

interface ListParams {
  query?: string;
  status?: string;
  ratingGte?: number;
  limit: number;
  offset: number;
  userId?: number;
}

export class FilmService {
  constructor(
    private readonly repository: FilmsRepository,
    private readonly kinopoiskClient: KinopoiskClient,
  ) {}

  async listFilms(params: ListParams) {
    const { userId } = params;
    if (!userId) {
      return {
        items: [],
        total: 0,
        limit: params.limit,
        offset: params.offset,
        hasMore: false,
      };
    }
    const { items, total } = await this.repository.listUserFilms({
      userId,
      query: params.query,
      status: params.status,
      ratingGte: params.ratingGte,
      limit: params.limit,
      offset: params.offset,
    });
    const mapped = items.map((row) => mapRowToResponse(row, userId));
    return {
      items: mapped,
      total,
      limit: params.limit,
      offset: params.offset,
      hasMore: params.offset + mapped.length < total,
    };
  }

  async getFilm(userFilmId: number, userId?: number) {
    if (!userId) return null;
    const row = await this.repository.getUserFilm(userFilmId, userId);
    if (!row) return null;
    return mapRowToResponse(row, userId);
  }

  async getFilmConceptArt(userFilmId: number, userId?: number) {
    return this.getFilmImagesByType(userFilmId, userId, 'CONCEPT');
  }

  async getFilmPosters(userFilmId: number, userId?: number) {
    return this.getFilmImagesByType(userFilmId, userId, 'POSTER');
  }

  private async resolveCatalogId(input: FilmCreateDto, kpData: KpEnriched): Promise<number> {
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

    const catalogInput: FilmCatalogCreateInput = {
      title: input.title,
      posterUrl: input.poster_url ?? kpData.kp_poster ?? null,
      posterUrlPreview: kpData.kp_posterPreview ?? input.poster_url ?? kpData.kp_poster ?? null,
      logoUrl: kpData.kp_logo ?? null,
      rating: input.rating ?? null,
      ratingKinopoisk: kpData.kp_ratingKinopoisk ?? null,
      year,
      description: kpData.kp_description ?? null,
      kpIsSeries: kpData.kp_isSeries ?? null,
      kpEpisodesCount: kpData.kp_episodesCount ?? null,
      kpSeasonsCount: kpData.kp_seasonsCount ?? null,
      kpId: kpIdToUse,
      webUrl: kpData.kp_webUrl ?? null,
      director: input.director ?? kpData.kp_director ?? null,
      budget: input.budget ?? kpData.kp_budget ?? null,
      budgetCurrencyCode: kpData.kp_budgetCurrencyCode ?? null,
      budgetCurrencySymbol: kpData.kp_budgetCurrencySymbol ?? null,
      revenue: input.revenue ?? kpData.kp_revenue ?? null,
      genres: input.genres ?? kpData.kp_genres ?? null,
      actors: input.actors ?? kpData.kp_actors ?? null,
      filmLength: kpData.kp_filmLength ?? null,
    };

    return this.repository.createCatalogEntry(catalogInput);
  }

  private async getFilmImagesByType(userFilmId: number, userId: number | undefined, type: string) {
    if (!userId) return null;
    const row = await this.repository.getUserFilm(userFilmId, userId);
    if (!row) return null;
    if (!row.kp_id) {
      return { items: [] };
    }
    const response = await this.kinopoiskClient.fetchFilmImages(row.kp_id, type, 1);
    const items =
      response?.items
        ?.filter(
          (item): item is { imageUrl: string; previewUrl: string } =>
            typeof item?.imageUrl === 'string' && typeof item?.previewUrl === 'string',
        )
        .map((item) => ({
          imageUrl: item.imageUrl,
          previewUrl: item.previewUrl,
        })) ?? [];
    return { items };
  }

  private async loadKpDataForCreate(input: FilmCreateDto): Promise<KpEnriched> {
    if (input.kp_id) {
      const detailed = await this.kinopoiskClient.fetchFilmDetails(input.kp_id);
      return detailed ?? {};
    }
    return this.kinopoiskClient.searchBestByTitle(input.title);
  }

  async createFilm(input: FilmCreateDto, userId: number) {
    const kpData = await this.loadKpDataForCreate(input);
    const duplicate = await this.repository.findUserFilmDuplicateByTitleYear(
      input.title,
      kpData.kp_year ?? null,
      userId,
    );
    if (duplicate) {
      const err: any = new Error('Duplicate film');
      err.status = 409;
      err.code = 'DUPLICATE_FILM';
      throw err;
    }

    const catalogId = await this.resolveCatalogId(input, kpData);
    const userFilmId = await this.repository.createUserFilm({
      userId,
      filmCatalogId: catalogId,
      myRating: input.my_rating ?? null,
      opinion: input.opinion ?? null,
      status: input.status ?? null,
    });
    const row = await this.repository.getUserFilm(userFilmId, userId);
    if (!row) {
      throw new Error('Failed to load created film');
    }
    return mapRowToResponse(row, userId);
  }

  async updateFilm(userFilmId: number, input: FilmUpdateDto, userId?: number) {
    if (!userId) return null;
    const existing = await this.repository.getUserFilm(userFilmId, userId);
    if (!existing) return null;
    await this.repository.updateUserFilm(userFilmId, userId, {
      myRating: input.my_rating ?? null,
      opinion: input.opinion ?? null,
      status: input.status ?? null,
    });
    const updated = await this.repository.getUserFilm(userFilmId, userId);
    return updated ? mapRowToResponse(updated, userId) : null;
  }

  async deleteFilm(userFilmId: number, userId?: number) {
    if (!userId) return;
    await this.repository.deleteUserFilm(userFilmId, userId);
  }
}

