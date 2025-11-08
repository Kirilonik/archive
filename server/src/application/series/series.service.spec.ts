import type { SeriesRepository, UserSeriesRow } from '../../domain/series/series.types.js';
import type { KinopoiskClient, KpEnriched } from '../../domain/integrations/kinopoisk.types.js';
import { SeriesService } from './series.service.js';

const baseRow: UserSeriesRow = {
  user_series_id: 1,
  series_catalog_id: 1,
  user_id: 1,
  title: 'Example Series',
  poster_url: null,
  rating: 8,
  year: 2021,
  description: null,
  kp_is_series: true,
  kp_episodes_count: 10,
  kp_seasons_count: 1,
  kp_id: 456,
  director: 'Director',
  budget: null,
  revenue: null,
  genres: ['Drama'],
  actors: ['Actor'],
  my_rating: 9,
  opinion: 'Nice series',
  user_status: 'Смотрю',
  created_at: new Date(),
  updated_at: new Date(),
};

function createRepositoryMock(overrides: Partial<SeriesRepository> = {}): SeriesRepository {
  return {
    listUserSeries: jest.fn().mockResolvedValue([baseRow]),
    getUserSeries: jest.fn().mockResolvedValue(baseRow),
    findCatalogIdByKpId: jest.fn().mockResolvedValue(null),
    findCatalogIdByTitleYear: jest.fn().mockResolvedValue(null),
    createCatalogEntry: jest.fn().mockResolvedValue(7),
    findUserSeriesDuplicateByTitleYear: jest.fn().mockResolvedValue(null),
    createUserSeries: jest.fn().mockResolvedValue(1),
    updateUserSeries: jest.fn().mockResolvedValue(undefined),
    deleteUserSeries: jest.fn().mockResolvedValue(undefined),
    getOrCreateSeasonCatalog: jest.fn().mockResolvedValue(100),
    getOrCreateEpisodeCatalog: jest.fn().mockResolvedValue(200),
    ensureUserSeason: jest.fn().mockResolvedValue(undefined),
    ensureUserEpisode: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createKinopoiskMock(overrides: Partial<KinopoiskClient> = {}): KinopoiskClient {
  return {
    searchBestByTitle: jest.fn().mockResolvedValue({}) as any,
    fetchFilmDetails: jest.fn().mockResolvedValue({}) as any,
    fetchSeriesDetails: jest.fn().mockResolvedValue({ seasons: [] }) as any,
    suggest: jest.fn().mockResolvedValue([]),
    extractKpIdFromPosterUrl: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

describe('SeriesService', () => {
  it('возвращает список сериалов пользователя', async () => {
    const repository = createRepositoryMock();
    const kinopoisk = createKinopoiskMock();
    const service = new SeriesService(repository, kinopoisk);

    const result = await service.listSeries(undefined, undefined, undefined, 1);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Example Series');
  });

  it('создает сериал и загружает сезоны', async () => {
    const kpData: KpEnriched = { kp_id: 321, kp_year: 2021 };
    const repository = createRepositoryMock();
    const kinopoisk = createKinopoiskMock({
      searchBestByTitle: jest.fn().mockResolvedValue(kpData) as any,
      fetchSeriesDetails: jest.fn().mockResolvedValue({
        seasons: [
          {
            number: 1,
            episodes: [{ number: 1, name: 'Episode 1' }],
          },
        ],
      }) as any,
    });
    const service = new SeriesService(repository, kinopoisk);

    const result = await service.createSeries({ title: 'Example Series' } as any, 1);
    expect(result.id).toBe(1);
    expect(repository.createCatalogEntry).toHaveBeenCalled();
    expect(repository.getOrCreateSeasonCatalog).toHaveBeenCalledWith(expect.any(Number), 1);
  });
});

