export type KpEnriched = {
  kp_id?: number | null;
  kp_poster?: string | null;
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

export interface KinopoiskClient {
  searchBestByTitle(title: string): Promise<KpEnriched>;
  fetchFilmDetails(kpId: number): Promise<KpEnriched>;
  fetchSeriesDetails(kpId: number): Promise<KpSeriesDetails>;
  suggest(query: string): Promise<KpSuggestItem[]>;
  extractKpIdFromPosterUrl(posterUrl: string | null | undefined): number | null;
}

