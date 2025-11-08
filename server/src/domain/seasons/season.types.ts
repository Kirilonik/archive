export interface SeasonListItem {
  id: number;
  seriesId: number;
  number: number;
  watched: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface SeasonRow {
  catalog_id: number;
  user_season_id: number | null;
  number: number;
  watched: boolean | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

export interface SeasonsRepository {
  findSeriesCatalogId(seriesUserId: number, userId: number): Promise<number | null>;
  listSeasons(seriesCatalogId: number, userId: number): Promise<SeasonRow[]>;
  findUserSeasonByCatalog(userId: number, seasonCatalogId: number): Promise<{ id: number; watched: boolean } | null>;
  createUserSeason(userId: number, seasonCatalogId: number): Promise<{ id: number; watched: boolean }>;
  getUserSeason(userSeasonId: number, userId: number): Promise<{ seasonCatalogId: number } | null>;
  deleteUserSeason(userSeasonId: number, userId: number): Promise<void>;
  markUserSeason(userSeasonId: number, userId: number, watched: boolean): Promise<{ id: number; watched: boolean } | null>;
  listSeasonEpisodeCatalogIds(seasonCatalogId: number): Promise<number[]>;
  syncUserEpisode(userId: number, episodeCatalogId: number, watched: boolean): Promise<void>;
}

