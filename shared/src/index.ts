export type RatingStatus = 'Смотрю' | 'Просмотрено' | 'Отложено';

export interface Film {
  id: number;
  title: string;
  poster_url?: string;
  rating?: number;
  status?: RatingStatus;
  created_at?: string;
}

export interface Series {
  id: number;
  title: string;
  poster_url?: string;
  rating?: number;
  status?: RatingStatus;
  created_at?: string;
}

export interface Season {
  id: number;
  series_id: number;
  number: number;
}

export interface Episode {
  id: number;
  season_id: number;
  number: number;
  title?: string;
  watched: boolean;
}

export interface UserProfile {
  id: number;
  name?: string;
  email: string;
  avatar_url?: string;
}

export { resolveAppConfig } from './config/app-config.js';
export type { AppConfig } from './config/app-config.js';
