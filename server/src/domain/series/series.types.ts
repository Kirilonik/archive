export interface SeriesCreateInput {
  title: string;
  kpId?: number;
  posterUrl?: string;
  rating?: number;
  status?: string;
  myRating?: number;
  opinion?: string;
  director?: string;
  budget?: number;
  revenue?: number;
  genres?: string[];
  actors?: string[];
}

export interface SeriesUpdateInput {
  status?: string | null;
  myRating?: number | null;
  opinion?: string | null;
}

export interface SeriesCatalogCreateInput {
  title: string;
  posterUrl?: string | null;
  posterUrlPreview?: string | null;
  logoUrl?: string | null;
  rating?: number | null;
  ratingKinopoisk?: number | null;
  year?: number | null;
  description?: string | null;
  kpIsSeries?: boolean | null;
  kpEpisodesCount?: number | null;
  kpSeasonsCount?: number | null;
  kpId?: number | null;
  webUrl?: string | null;
  director?: string | null;
  budget?: number | null;
  revenue?: number | null;
  genres?: string[] | null;
  actors?: string[] | null;
  filmLength?: number | null;
}

export interface UserSeriesRow {
  user_series_id: number;
  series_catalog_id: number;
  user_id: number;
  title: string;
  poster_url: string | null;
  poster_url_preview: string | null;
  logo_url: string | null;
  rating: number | null;
  rating_kinopoisk: number | null;
  year: number | null;
  description: string | null;
  kp_is_series: boolean | null;
  kp_episodes_count: number | null;
  kp_seasons_count: number | null;
  kp_id: number | null;
  web_url: string | null;
  director: string | null;
  budget: number | null;
  revenue: number | null;
  genres: string[] | null;
  actors: string[] | null;
  film_length: number | null;
  my_rating: number | null;
  opinion: string | null;
  user_status: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

export interface SeriesRepository {
  listUserSeries(params: {
    userId: number;
    query?: string;
    status?: string;
    ratingGte?: number;
    limit: number;
    offset: number;
  }): Promise<{ items: UserSeriesRow[]; total: number }>;
  getUserSeries(userSeriesId: number, userId: number): Promise<UserSeriesRow | null>;
  findCatalogIdByKpId(kpId: number): Promise<number | null>;
  findCatalogIdByTitleYear(title: string, year: number | null): Promise<number | null>;
  createCatalogEntry(input: SeriesCatalogCreateInput): Promise<number>;
  findUserSeriesDuplicateByTitleYear(title: string, year: number | null, userId: number): Promise<UserSeriesRow | null>;
  createUserSeries(params: { userId: number; seriesCatalogId: number; myRating?: number | null; opinion?: string | null; status?: string | null }): Promise<number>;
  updateUserSeries(userSeriesId: number, userId: number, data: { myRating?: number | null; opinion?: string | null; status?: string | null }): Promise<void>;
  deleteUserSeries(userSeriesId: number, userId: number): Promise<void>;
  getOrCreateSeasonCatalog(seriesCatalogId: number, seasonNumber: number): Promise<number>;
  getOrCreateEpisodeCatalog(seasonCatalogId: number, episodeNumber: number, options: { title?: string | null; releaseDate?: string | null; duration?: number | null }): Promise<number>;
  ensureUserSeason(userId: number, seasonCatalogId: number): Promise<void>;
  ensureUserEpisode(userId: number, episodeCatalogId: number): Promise<void>;
}

