/**
 * Типы для клиентской части приложения
 * Соответствуют структуре данных, возвращаемых API
 */

export interface Film {
  id: number;
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
  budget_currency_code: string | null;
  budget_currency_symbol: string | null;
  revenue: number | null;
  genres: string[] | null;
  actors: string[] | null;
  film_length: number | null;
  my_rating: number | null;
  opinion: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Series {
  id: number;
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
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Season {
  id: number;
  number: number;
  watched: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Episode {
  id: number;
  number: number;
  title: string | null;
  release_date: string | null;
  duration: number | null;
  watched: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface UserStats {
  films: number;
  filmsWithRating: number;
  filmsWithOpinion: number;
  filmsDurationMinutes: number | null;
  series: number;
  seriesWithRating: number;
  seriesWithOpinion: number;
  totalSeasons: number;
  totalEpisodes: number;
  seriesDurationMinutes: number | null;
}

export interface UserProfileResponse {
  profile: UserProfile;
  stats: UserStats;
}

export interface SuggestItem {
  id?: number;
  title: string;
  poster?: string | null;
  year?: number | null;
  isSeries?: boolean;
  description?: string;
}

