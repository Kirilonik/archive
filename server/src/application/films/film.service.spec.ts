import type { FilmsRepository, UserFilmRow } from '../../domain/films/film.types.js';
import type { KinopoiskClient, KpEnriched } from '../../domain/integrations/kinopoisk.types.js';
import { FilmService } from './film.service.js';

const baseRow: UserFilmRow = {
  user_film_id: 1,
  film_catalog_id: 1,
  user_id: 1,
  title: 'Example Film',
  poster_url: null,
  rating: 7.5,
  year: 2020,
  description: null,
  kp_is_series: false,
  kp_episodes_count: null,
  kp_seasons_count: null,
  kp_id: 123,
  director: 'Director',
  budget: null,
  revenue: null,
  genres: ['Drama'],
  actors: ['Actor'],
  my_rating: 8,
  opinion: 'Great film',
  user_status: 'Просмотрено',
  created_at: new Date(),
  updated_at: new Date(),
};

function createRepositoryMock(overrides: Partial<FilmsRepository> = {}): FilmsRepository {
  return {
    listUserFilms: jest.fn().mockResolvedValue({ items: [baseRow], total: 1 }),
    getUserFilm: jest.fn().mockResolvedValue(baseRow),
    findCatalogIdByKpId: jest.fn().mockResolvedValue(null),
    findCatalogIdByTitleYear: jest.fn().mockResolvedValue(null),
    createCatalogEntry: jest.fn().mockResolvedValue(10),
    findUserFilmDuplicateByTitleYear: jest.fn().mockResolvedValue(null),
    createUserFilm: jest.fn().mockResolvedValue(1),
    updateUserFilm: jest.fn().mockResolvedValue(undefined),
    deleteUserFilm: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createKinopoiskMock(overrides: Partial<KinopoiskClient> = {}): KinopoiskClient {
  return {
    searchBestByTitle: jest.fn().mockResolvedValue({}) as any,
    fetchFilmDetails: jest.fn().mockResolvedValue({}) as any,
    fetchSeriesDetails: jest.fn().mockResolvedValue({}) as any,
    suggest: jest.fn().mockResolvedValue([]),
    extractKpIdFromPosterUrl: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

describe('FilmService', () => {
  it('возвращает список фильмов пользователя', async () => {
    const repository = createRepositoryMock();
    const kinopoisk = createKinopoiskMock();
    const service = new FilmService(repository, kinopoisk);

    const result = await service.listFilms({ userId: 1, query: undefined, status: undefined, ratingGte: undefined, limit: 10, offset: 0 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Example Film');
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(repository.listUserFilms).toHaveBeenCalledWith({ userId: 1, query: undefined, status: undefined, ratingGte: undefined, limit: 10, offset: 0 });
  });

  it('создает фильм и возвращает данные', async () => {
    const kpData: KpEnriched = { kp_id: 200 };
    const repository = createRepositoryMock({
      createCatalogEntry: jest.fn().mockResolvedValue(5),
    });
    const kinopoisk = createKinopoiskMock({
      searchBestByTitle: jest.fn().mockResolvedValue(kpData) as any,
    });
    const service = new FilmService(repository, kinopoisk);

    const created = await service.createFilm({ title: 'Example Film' } as any, 1);
    expect(created.id).toBe(1);
    expect(repository.createCatalogEntry).toHaveBeenCalled();
    expect(repository.createUserFilm).toHaveBeenCalledWith({
      userId: 1,
      filmCatalogId: 5,
      myRating: null,
      opinion: null,
      status: null,
    });
  });
});

