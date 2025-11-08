export interface FilmCreateInput {
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

export interface FilmUpdateInput {
  status?: string | null;
  myRating?: number | null;
  opinion?: string | null;
}

export interface FilmCatalogCreateInput {
  title: string;
  posterUrl?: string | null;
  rating?: number | null;
  year?: number | null;
  description?: string | null;
  kpIsSeries?: boolean | null;
  kpEpisodesCount?: number | null;
  kpSeasonsCount?: number | null;
  kpId?: number | null;
  director?: string | null;
  budget?: number | null;
  revenue?: number | null;
  genres?: string[] | null;
  actors?: string[] | null;
}

export interface UserFilmRow {
  user_film_id: number;
  film_catalog_id: number;
  user_id: number;
  title: string;
  poster_url: string | null;
  rating: number | null;
  year: number | null;
  description: string | null;
  kp_is_series: boolean | null;
  kp_episodes_count: number | null;
  kp_seasons_count: number | null;
  kp_id: number | null;
  director: string | null;
  budget: number | null;
  revenue: number | null;
  genres: string[] | null;
  actors: string[] | null;
  my_rating: number | null;
  opinion: string | null;
  user_status: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

export interface FilmsRepository {
  listUserFilms(params: {
    userId: number;
    query?: string;
    status?: string;
    ratingGte?: number;
    limit: number;
    offset: number;
  }): Promise<{ items: UserFilmRow[]; total: number }>;
  getUserFilm(userFilmId: number, userId: number): Promise<UserFilmRow | null>;
  findCatalogIdByKpId(kpId: number): Promise<number | null>;
  findCatalogIdByTitleYear(title: string, year: number | null): Promise<number | null>;
  createCatalogEntry(input: FilmCatalogCreateInput): Promise<number>;
  findUserFilmDuplicateByTitleYear(title: string, year: number | null, userId: number): Promise<UserFilmRow | null>;
  createUserFilm(params: { userId: number; filmCatalogId: number; myRating?: number | null; opinion?: string | null; status?: string | null }): Promise<number>;
  updateUserFilm(userFilmId: number, userId: number, data: { myRating?: number | null; opinion?: string | null; status?: string | null }): Promise<void>;
  deleteUserFilm(userFilmId: number, userId: number): Promise<void>;
}

