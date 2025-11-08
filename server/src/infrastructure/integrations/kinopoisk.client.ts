import { env } from '../../config/env.js';
import type { KinopoiskClient, KpEnriched, KpSeriesDetails, KpSuggestItem } from '../../domain/integrations/kinopoisk.types.js';
import { logger } from '../../shared/logger.js';

const API_URL = env.KINOPOISK_API_URL;
const API_KEY = env.KINOPOISK_API_KEY;

function getHeaders(): Record<string, string> {
  return {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json',
  };
}

type StaffItem = { staffId?: number; nameRu?: string; nameEn?: string; professionText?: string; professionKey?: string };

export class KinopoiskHttpClient implements KinopoiskClient {
  extractKpIdFromPosterUrl(posterUrl: string | null | undefined): number | null {
    if (!posterUrl) return null;
    const match = posterUrl.match(/\/kp\/(\d+)\.(jpg|jpeg|png|webp)/i);
    if (match && match[1]) {
      const id = parseInt(match[1], 10);
      if (!Number.isNaN(id) && id > 0) {
        return id;
      }
    }
    return null;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const resp = await fetch(url, { headers: getHeaders() });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      logger.error(
        { status: resp.status, statusText: resp.statusText, url, body },
        '[kinopoisk] request failed',
      );
      return null;
    }
    return resp.json() as Promise<T>;
  }

  private mapStaff(staff: StaffItem[]): { director: string | null; actors: string[] | null } {
    const directors = staff
      .filter((s) => s.professionKey === 'DIRECTOR' || s.professionText?.toLowerCase().includes('режиссер'))
      .map((s) => s.nameRu || s.nameEn)
      .filter(Boolean) as string[];
    const actors = staff
      .filter((s) => s.professionKey === 'ACTOR' || s.professionText?.toLowerCase().includes('актер'))
      .map((s) => s.nameRu || s.nameEn)
      .filter(Boolean) as string[];
    return {
      director: directors[0] ?? null,
      actors: actors.length ? actors.slice(0, 10) : null,
    };
  }

  private async fetchStaff(kpId: number): Promise<{ director: string | null; actors: string[] | null }> {
    try {
      const staffUrl = `${API_URL}/api/v1/staff?filmId=${kpId}`;
      const staff = await this.fetchJson<StaffItem[]>(staffUrl);
      if (!staff) {
        return { director: null, actors: null };
      }
      return this.mapStaff(staff);
    } catch (error) {
      logger.error({ err: error, kpId }, 'Error fetching Kinopoisk staff');
      return { director: null, actors: null };
    }
  }

  async fetchFilmDetails(kpId: number): Promise<KpEnriched> {
    if (!kpId) return {};
    try {
      const detailUrl = `${API_URL}/api/v2.2/films/${kpId}`;
      const detail = await this.fetchJson<any>(detailUrl);
      if (!detail) return {};
      const genres = (detail.genres || []).map((g: any) => g.genre).filter(Boolean) as string[];
      const { director, actors } = await this.fetchStaff(kpId);
      const episodeLength = detail.episodeLength ?? detail.seriesLength ?? null;
      const episodesCount =
        detail.episodesLength ??
        detail.serialEpisodesNumber ??
        detail.serialEpisodesCount ??
        detail.totalEpisodes ??
        null;
      const seasonsCount = detail.seasons?.length ?? detail.serialSeasonsNumber ?? detail.totalSeasons ?? null;
      return {
        kp_id: detail.kinopoiskId ?? kpId,
        kp_poster: detail.posterUrl || detail.posterUrlPreview || null,
        kp_posterPreview: detail.posterUrlPreview || detail.posterUrl || null,
        kp_logo: detail.logoUrl ?? null,
        kp_description: detail.description ?? null,
        kp_year: detail.year ?? detail.startYear ?? null,
        kp_isSeries: detail.type === 'TV_SERIES' || detail.type === 'MINI_SERIES' || detail.serial === true,
        kp_episodesCount: episodesCount ?? null,
        kp_seasonsCount: seasonsCount ?? null,
        kp_genres: genres.length ? genres : null,
        kp_director: director,
        kp_actors: actors,
        kp_budget: detail.budget ?? null,
        kp_revenue: null,
        kp_ratingKinopoisk: detail.ratingKinopoisk ?? null,
        kp_webUrl: detail.webUrl ?? null,
        kp_filmLength: episodeLength ?? detail.filmLength ?? null,
      };
    } catch (error) {
      logger.error({ err: error, kpId }, 'Error fetching film details by kp_id');
      return {};
    }
  }

  async searchBestByTitle(title: string): Promise<KpEnriched> {
    try {
      if (!title) return {};
      const url = `${API_URL}/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(title)}&page=1`;
      const data = await this.fetchJson<any>(url);
      const film = data?.films?.[0];
      if (!film) {
        return {};
      }
      let filmKpId = film.kinopoiskId ?? null;
      if (!filmKpId) {
        const posterId = this.extractKpIdFromPosterUrl(film.posterUrl || film.posterUrlPreview);
        if (posterId) {
          filmKpId = posterId;
        }
      }
      if (filmKpId) {
        return this.fetchFilmDetails(filmKpId);
      }
      const genres = (film.genres || []).map((g: any) => g.genre).filter(Boolean) as string[];
      const posterId = this.extractKpIdFromPosterUrl(film.posterUrl || film.posterUrlPreview);
      return {
        kp_id: film.kinopoiskId ?? posterId,
        kp_poster: film.posterUrl || film.posterUrlPreview || null,
        kp_posterPreview: film.posterUrlPreview || film.posterUrl || null,
        kp_logo: film.logoUrl ?? null,
        kp_description: film.description ?? null,
        kp_year: film.year ?? null,
        kp_isSeries: film.type === 'TV_SERIES' || film.type === 'MINI_SERIES' || film.serial === true,
        kp_episodesCount: film.episodesLength ?? film.serialEpisodesNumber ?? film.serialEpisodesCount ?? null,
        kp_seasonsCount: film.seasonsCount ?? film.serialSeasonsNumber ?? null,
        kp_genres: genres.length ? genres : null,
        kp_director: null,
        kp_actors: null,
        kp_budget: null,
        kp_revenue: null,
        kp_ratingKinopoisk: film.rating ?? null,
        kp_webUrl: film.webUrl ?? null,
        kp_filmLength: film.episodeLength ?? film.filmLength ?? null,
      };
    } catch (error) {
      logger.error({ err: error, title }, 'Error in searchBestByTitle');
      return {};
    }
  }

  async fetchSeriesDetails(kpId: number): Promise<KpSeriesDetails> {
    if (!kpId) {
      logger.warn({ kpId }, 'fetchSeriesDetails: kpId is missing or invalid');
      return {};
    }
    try {
      const url = `${API_URL}/api/v2.2/films/${kpId}/seasons`;
      const resp = await this.fetchJson<any>(url);
      if (!resp?.items || resp.items.length === 0) {
        return {};
      }
      const seasons = resp.items.map((s: any) => ({
        number: s.number,
        episodes: (s.episodes || []).map((e: any) => ({
          number: e.episodeNumber,
          name: e.nameRu || e.nameEn || undefined,
          releaseDate: e.releaseDate || undefined,
          duration: e.episodeLength ?? e.duration ?? null,
        })),
      }));
      return { seasons };
    } catch (error) {
      logger.error({ err: error, kpId }, 'Error in fetchSeriesDetails');
      return {};
    }
  }

  async suggest(query: string): Promise<KpSuggestItem[]> {
    if (!query) return [];
    try {
      const url = `${API_URL}/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}&page=1`;
      const data = await this.fetchJson<any>(url);
      const films = data?.films ?? [];
      return films.slice(0, 10).map((f: any) => {
        let filmId = f.kinopoiskId ?? null;
        if (!filmId) {
          const posterId = this.extractKpIdFromPosterUrl(f.posterUrlPreview || f.posterUrl);
          if (posterId) {
            filmId = posterId;
          }
        }
        return {
          id: filmId ?? undefined,
          title: f.nameRu || f.nameEn || f.nameOriginal || '',
          poster: f.posterUrlPreview || f.posterUrl || null,
          year: f.year ?? null,
          isSeries: f.type === 'TV_SERIES' || f.type === 'MINI_SERIES' || f.serial === true,
        };
      });
    } catch (error) {
      logger.error({ err: error, query }, 'Error in Kinopoisk suggest');
      return [];
    }
  }
}

