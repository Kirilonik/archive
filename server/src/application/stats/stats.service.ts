import type { StatsRepository, UserSummaryStats, UserDetailedStats } from '../../domain/stats/stats.types.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class StatsService {
  private readonly cacheTtlMs = 60_000;
  private summaryCache = new Map<number, CacheEntry<UserSummaryStats>>();
  private detailedCache = new Map<number, CacheEntry<UserDetailedStats>>();

  constructor(private readonly statsRepository: StatsRepository) {}

  async getSummary(userId: number): Promise<UserSummaryStats> {
    const cached = this.summaryCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await this.statsRepository.getSummary(userId);
    this.summaryCache.set(userId, { data, expiresAt: Date.now() + this.cacheTtlMs });
    return data;
  }

  async getDetailed(userId: number): Promise<UserDetailedStats> {
    const cached = this.detailedCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    const data = await this.statsRepository.getDetailed(userId);
    this.detailedCache.set(userId, { data, expiresAt: Date.now() + this.cacheTtlMs });
    return data;
  }

  clearCacheFor(userId: number) {
    this.summaryCache.delete(userId);
    this.detailedCache.delete(userId);
  }
}

