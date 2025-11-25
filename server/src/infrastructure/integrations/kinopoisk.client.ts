import { env } from '../../config/env.js';
import type {
  KinopoiskClient,
  KpEnriched,
  KpImageResponse,
  KpSeriesDetails,
  KpSuggestItem,
} from '../../domain/integrations/kinopoisk.types.js';
import { logger } from '../../shared/logger.js';

// Устанавливаем таймауты для undici (Node.js fetch) ДО первого использования fetch
// Дефолтные таймауты: 10 секунд на подключение, 10 секунд на сокет
if (typeof process !== 'undefined' && process.env) {
  if (!process.env.UNDICI_CONNECT_TIMEOUT) {
    process.env.UNDICI_CONNECT_TIMEOUT = '30000'; // 30 секунд на подключение
  }
  if (!process.env.UNDICI_SOCKET_TIMEOUT) {
    process.env.UNDICI_SOCKET_TIMEOUT = '30000'; // 30 секунд на сокет
  }
}

const API_URL = env.KINOPOISK_API_URL;
const API_KEY = env.KINOPOISK_API_KEY;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.kinopoisk.ru/',
    'Origin': 'https://www.kinopoisk.ru',
  };
  if (API_KEY) {
    headers['X-API-KEY'] = API_KEY;
  } else {
    logger.warn('KINOPOISK_API_KEY is not set');
  }
  return headers;
}

type StaffItem = { staffId?: number; nameRu?: string; nameEn?: string; professionText?: string; professionKey?: string };
type BoxOfficeItem = { type?: string; amount?: number; currencyCode?: string; symbol?: string };

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

  private async fetchJson<T>(url: string, retries = 2): Promise<T | null> {
    const timeoutMs = 30000; // 30 секунд вместо дефолтных 10
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = getHeaders();
      // Логируем заголовки для диагностики (без API ключа)
      const headersForLog = { ...headers };
      if (headersForLog['X-API-KEY']) {
        headersForLog['X-API-KEY'] = headersForLog['X-API-KEY'].substring(0, 8) + '...';
      }
      logger.debug({ url, headers: headersForLog }, '[kinopoisk] Making request');
      
      const resp = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          logger.error(
            { 
              status: resp.status, 
              statusText: resp.statusText, 
              url, 
              body: body.substring(0, 500), // Ограничиваем длину для логов
              headers: Object.fromEntries(resp.headers.entries()),
            },
            '[kinopoisk] request failed',
          );
          return null;
        }
        
        const responseText = await resp.text();
        if (!responseText || responseText.trim() === '') {
          logger.warn({ url, status: resp.status }, '[kinopoisk] Empty response body');
          return null;
        }
        
        try {
          return JSON.parse(responseText) as T;
        } catch (parseError) {
          logger.error(
            { 
              url, 
              status: resp.status, 
              body: responseText.substring(0, 500),
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
            },
            '[kinopoisk] Failed to parse JSON response',
          );
          return null;
        }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Если это таймаут или ошибка соединения, и есть попытки - повторяем
      if (retries > 0 && (error?.name === 'AbortError' || error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET' || error?.message?.includes('timeout'))) {
        logger.warn({ url, retriesLeft: retries, error: error.message }, 'Kinopoisk request timeout, retrying');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду перед повтором
        return this.fetchJson<T>(url, retries - 1);
      }

      logger.error({ err: error, url, retries }, 'Error fetching from Kinopoisk API');
      return null;
    }
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

  private async fetchBudgetInfo(kpId: number): Promise<{ amount: number | null; currencyCode: string | null; currencySymbol: string | null }> {
    try {
      const url = `${API_URL}/api/v2.2/films/${kpId}/box_office`;
      const data = await this.fetchJson<{ items?: BoxOfficeItem[] }>(url);
      if (!data?.items) {
        return { amount: null, currencyCode: null, currencySymbol: null };
      }
      const budgetItem = data.items.find((item) => item.type === 'BUDGET');
      if (!budgetItem) {
        return { amount: null, currencyCode: null, currencySymbol: null };
      }
      return {
        amount: typeof budgetItem.amount === 'number' ? budgetItem.amount : null,
        currencyCode: budgetItem.currencyCode ?? null,
        currencySymbol: budgetItem.symbol ?? null,
      };
    } catch (error) {
      logger.error({ err: error, kpId }, 'Error fetching Kinopoisk budget info');
      return { amount: null, currencyCode: null, currencySymbol: null };
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
      const budgetInfo = await this.fetchBudgetInfo(kpId);
      const budgetAmount =
        detail.budget != null
          ? typeof detail.budget === 'number'
            ? detail.budget
            : Number.parseInt(detail.budget, 10)
          : null;
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
        kp_budget: budgetAmount ?? budgetInfo.amount ?? null,
        kp_budgetCurrencyCode: budgetInfo.currencyCode ?? null,
        kp_budgetCurrencySymbol: budgetInfo.currencySymbol ?? null,
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
      // Используем URL объект для правильной кодировки
      const urlObj = new URL('/api/v2.1/films/search-by-keyword', API_URL);
      urlObj.searchParams.set('keyword', title);
      urlObj.searchParams.set('page', '1');
      const url = urlObj.toString();
      
      logger.debug({ title, encodedUrl: url }, '[kinopoisk] searchBestByTitle request');
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
      const budgetInfo = filmKpId ? await this.fetchBudgetInfo(filmKpId) : { amount: null, currencyCode: null, currencySymbol: null };

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
        kp_budget: budgetInfo.amount ?? null,
        kp_budgetCurrencyCode: budgetInfo.currencyCode ?? null,
        kp_budgetCurrencySymbol: budgetInfo.currencySymbol ?? null,
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
      // Используем URL объект для правильной кодировки
      const urlObj = new URL('/api/v2.1/films/search-by-keyword', API_URL);
      urlObj.searchParams.set('keyword', query);
      urlObj.searchParams.set('page', '1');
      const url = urlObj.toString();
      
      logger.debug({ query, encodedUrl: url }, '[kinopoisk] suggest request');
      const data = await this.fetchJson<any>(url);
      if (!data) {
        logger.warn({ query, url }, 'Kinopoisk suggest returned null');
        return [];
      }
      const films = data?.films ?? [];
      if (films.length === 0) {
        logger.debug({ query, url }, 'Kinopoisk suggest returned empty films array');
      }
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

  async fetchFilmImages(kpId: number, type: string, page = 1): Promise<KpImageResponse | null> {
    if (!kpId) {
      logger.warn({ kpId, type, page }, 'fetchFilmImages: kpId is missing or invalid');
      return null;
    }
    try {
      const url = `${API_URL}/api/v2.2/films/${kpId}/images?type=${encodeURIComponent(type)}&page=${page}`;
      const resp = await this.fetchJson<KpImageResponse>(url);
      return resp ?? null;
    } catch (error) {
      logger.error({ err: error, kpId, type, page }, 'Error fetching Kinopoisk film images');
      return null;
    }
  }
}

