import type { StatsRepository, UserSummaryStats, UserDetailedStats } from '../../domain/stats/stats.types.js';

export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  getSummary(userId: number): Promise<UserSummaryStats> {
    return this.statsRepository.getSummary(userId);
  }

  getDetailed(userId: number): Promise<UserDetailedStats> {
    return this.statsRepository.getDetailed(userId);
  }
}

