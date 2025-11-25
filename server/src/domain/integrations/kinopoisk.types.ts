export type KpEnriched = {
  kp_id?: number | null;
  kp_poster?: string | null;
  kp_posterPreview?: string | null;
  kp_logo?: string | null;
  kp_description?: string | null;
  kp_year?: number | null;
  kp_isSeries?: boolean | null;
  kp_episodesCount?: number | null;
  kp_seasonsCount?: number | null;
  kp_genres?: string[] | null;
  kp_director?: string | null;
  kp_actors?: string[] | null;
  kp_budget?: number | null;
  kp_revenue?: number | null;
  kp_budgetCurrencyCode?: string | null;
  kp_budgetCurrencySymbol?: string | null;
  kp_ratingKinopoisk?: number | null;
  kp_webUrl?: string | null;
  kp_filmLength?: number | null;
};

export type KpSuggestItem = {
  id?: number;
  title: string;
  poster?: string | null;
  year?: number | null;
  isSeries?: boolean;
};

export type KpSeriesEpisode = {
  number?: number;
  name?: string;
  releaseDate?: string;
  duration?: number;
};

export type KpSeriesSeason = {
  number?: number;
  episodes?: KpSeriesEpisode[];
};

export type KpSeriesDetails = {
  seasons?: KpSeriesSeason[];
};

export type KpImageItem = {
  imageUrl?: string | null;
  previewUrl?: string | null;
};

export type KpImageResponse = {
  total?: number;
  totalPages?: number;
  items?: KpImageItem[];
};

export interface KinopoiskClient {
  searchBestByTitle(title: string): Promise<KpEnriched>;
  fetchFilmDetails(kpId: number): Promise<KpEnriched>;
  fetchSeriesDetails(kpId: number): Promise<KpSeriesDetails>;
  suggest(query: string): Promise<KpSuggestItem[]>;
  extractKpIdFromPosterUrl(posterUrl: string | null | undefined): number | null;
  fetchFilmImages(kpId: number, type: string, page?: number): Promise<KpImageResponse | null>;
}
