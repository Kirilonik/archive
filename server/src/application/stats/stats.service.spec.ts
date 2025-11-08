import { StatsService } from './stats.service.js';
import type { StatsRepository, UserSummaryStats, UserDetailedStats } from '../../domain/stats/stats.types.js';

const summary: UserSummaryStats = {
  films: 4,
  series: 2,
  avgRating: 8.2,
  watchedEpisodes: 15,
  totalSeasons: 5,
  totalEpisodes: 30,
  filmsWithRating: 4,
  seriesWithRating: 2,
  filmsWithOpinion: 3,
  seriesWithOpinion: 1,
};

const detailed: UserDetailedStats = {
  genres: [{ genre: 'Drama', count: 3 }],
  years: [{ year: 2021, count: 2 }],
  ratings: [{ range: '8-10', count: 4 }],
  filmsVsSeries: { films: 4, series: 2 },
  monthly: [{ month: '2025-01', count: 3 }],
  avgRatingByGenre: [{ genre: 'Drama', avgRating: 8.5, count: 3 }],
  statuses: [{ status: 'Просмотрено', count: 5 }],
  directors: [{ director: 'John Doe', count: 2 }],
};

function createRepositoryMock(overrides: Partial<StatsRepository> = {}): StatsRepository {
  return {
    getSummary: jest.fn().mockResolvedValue(summary),
    getDetailed: jest.fn().mockResolvedValue(detailed),
    ...overrides,
  };
}

describe('StatsService', () => {
  it('возвращает сводную статистику', async () => {
    const repository = createRepositoryMock();
    const service = new StatsService(repository);

    const result = await service.getSummary(1);
    expect(result).toEqual(summary);
    expect(repository.getSummary).toHaveBeenCalledWith(1);
  });

  it('возвращает детальную статистику', async () => {
    const repository = createRepositoryMock();
    const service = new StatsService(repository);

    const result = await service.getDetailed(1);
    expect(result).toEqual(detailed);
    expect(repository.getDetailed).toHaveBeenCalledWith(1);
  });
});

