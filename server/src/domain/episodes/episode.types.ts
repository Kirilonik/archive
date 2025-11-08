export interface EpisodeListItem {
  id: number;
  seasonId: number;
  number: number;
  title: string | null;
  releaseDate: string | null;
  duration: number | null;
  watched: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface EpisodeRow {
  catalog_id: number;
  user_episode_id: number | null;
  user_season_id?: number | null;
  number: number;
  title: string | null;
  release_date: string | null;
  duration: number | null;
  watched: boolean | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

export interface EpisodesRepository {
  findSeasonCatalogId(seasonUserId: number, userId: number): Promise<number | null>;
  listEpisodes(seasonCatalogId: number, userId: number): Promise<EpisodeRow[]>;
  findUserEpisodeByCatalog(userId: number, episodeCatalogId: number): Promise<{ id: number; watched: boolean } | null>;
  createUserEpisode(userId: number, episodeCatalogId: number): Promise<{ id: number; watched: boolean }>;
  updateEpisodeCatalog(episodeCatalogId: number, data: { title?: string | null; releaseDate?: string | null; duration?: number | null }): Promise<void>;
  getUserEpisode(userEpisodeId: number, userId: number): Promise<EpisodeRow | null>;
  deleteUserEpisode(userEpisodeId: number, userId: number): Promise<void>;
  markUserEpisode(userEpisodeId: number, userId: number, watched: boolean): Promise<{ id: number; watched: boolean } | null>;
}

