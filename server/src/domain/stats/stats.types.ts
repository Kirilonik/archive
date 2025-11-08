export interface UserSummaryStats {
  films: number;
  series: number;
  avgRating: number | null;
  watchedEpisodes: number;
  totalSeasons: number;
  totalEpisodes: number;
  filmsWithRating: number;
  seriesWithRating: number;
  filmsWithOpinion: number;
  seriesWithOpinion: number;
}

export interface GenreStat {
  genre: string;
  count: number;
}

export interface YearStat {
  year: number;
  count: number;
}

export interface RatingRangeStat {
  range: string;
  count: number;
}

export interface FilmsVsSeriesStat {
  films: number;
  series: number;
}

export interface MonthlyStat {
  month: string | null;
  count: number;
}

export interface AvgRatingByGenreStat {
  genre: string;
  avgRating: number;
  count: number;
}

export interface StatusStat {
  status: string;
  count: number;
}

export interface DirectorStat {
  director: string;
  count: number;
}

export interface UserDetailedStats {
  genres: GenreStat[];
  years: YearStat[];
  ratings: RatingRangeStat[];
  filmsVsSeries: FilmsVsSeriesStat;
  monthly: MonthlyStat[];
  avgRatingByGenre: AvgRatingByGenreStat[];
  statuses: StatusStat[];
  directors: DirectorStat[];
}

export interface StatsRepository {
  getSummary(userId: number): Promise<UserSummaryStats>;
  getDetailed(userId: number): Promise<UserDetailedStats>;
}

