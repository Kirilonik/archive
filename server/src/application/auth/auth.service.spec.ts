import type { AuthRepository, PasswordHasher, AuthUser, AuthUserWithPassword } from '../../domain/auth/auth.types.js';
import { AuthService } from './auth.service.js';

const baseUser: AuthUser = {
  id: 1,
  email: 'user@example.com',
  name: 'Test User',
  avatarUrl: null,
  authProvider: 'local',
  googleId: null,
  yandexId: null,
};

function createRepositoryMock(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByEmail: jest.fn().mockResolvedValue({
      ...baseUser,
      passwordHash: 'hash',
    } as AuthUserWithPassword) as AuthRepository['findByEmail'],
    createUser: jest.fn().mockResolvedValue(baseUser) as AuthRepository['createUser'],
    findByGoogleId: jest.fn().mockResolvedValue(null),
    findByYandexId: jest.fn().mockResolvedValue(null),
    createUserFromGoogle: jest.fn().mockResolvedValue({
      ...baseUser,
      id: 2,
      authProvider: 'google',
      googleId: 'google-123',
      yandexId: null,
    }),
    attachGoogleAccount: jest.fn().mockResolvedValue({
      ...baseUser,
      authProvider: 'google',
      googleId: 'google-123',
      yandexId: null,
    }),
    createUserFromYandex: jest.fn().mockResolvedValue({
      ...baseUser,
      id: 3,
      authProvider: 'yandex',
      yandexId: 'ya-123',
      googleId: null,
    }),
    attachYandexAccount: jest.fn().mockResolvedValue({
      ...baseUser,
      authProvider: 'yandex',
      yandexId: 'ya-123',
      googleId: null,
    }),
    ...overrides,
  } as AuthRepository;
}

function createPasswordHasherMock(overrides: Partial<PasswordHasher> = {}): PasswordHasher {
  return {
    hash: jest.fn().mockResolvedValue('hashed'),
    compare: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function createGoogleClientMock(overrides: Partial<{ verifyIdToken: jest.Mock }> = {}) {
  return {
    verifyIdToken: jest
      .fn()
      .mockResolvedValue({ getPayload: () => ({ sub: 'google-123', email: baseUser.email, name: baseUser.name }) }),
    ...overrides,
  };
}

function createYandexMocks(overrides?: {
  exchange?: () => Promise<any>;
  info?: () => Promise<any>;
}) {
  return {
    exchange: jest.fn(overrides?.exchange ?? (() => Promise.resolve({ access_token: 'token', token_type: 'bearer', expires_in: 3600 }))),
    info: jest.fn(
      overrides?.info ??
        (() =>
          Promise.resolve({
            id: 'ya-123',
            default_email: baseUser.email,
            display_name: 'Yandex User',
          })),
    ),
  };
}

describe('AuthService', () => {
  it('регистрирует нового пользователя и возвращает токены', async () => {
    const repository = createRepositoryMock({ findByEmail: jest.fn().mockResolvedValue(null) });
    const passwordHasher = createPasswordHasherMock();
    const service = new AuthService(repository, passwordHasher, createGoogleClientMock() as any);

    const result = await service.register({ name: 'User', email: baseUser.email, password: 'password' });
    expect(result.user).toEqual(baseUser);
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(repository.createUser).toHaveBeenCalledWith({
      name: 'User',
      email: baseUser.email,
      passwordHash: 'hashed',
    });
  });

  it('бросает 409, если пользователь уже существует', async () => {
    const repository = createRepositoryMock();
    const passwordHasher = createPasswordHasherMock();
    const service = new AuthService(repository, passwordHasher, createGoogleClientMock() as any);

    await expect(service.register({ email: baseUser.email, password: 'password' })).rejects.toMatchObject({ status: 409 });
  });

  it('возвращает пользователя при успешном входе', async () => {
    const repository = createRepositoryMock();
    const passwordHasher = createPasswordHasherMock({ compare: jest.fn().mockResolvedValue(true) });
    const service = new AuthService(repository, passwordHasher, createGoogleClientMock() as any);

    const result = await service.login({ email: baseUser.email, password: 'password' });
    expect(result?.user).toEqual(baseUser);
    expect(result?.tokens.accessToken).toBeTruthy();
  });

  it('возвращает null, если пароль неверен', async () => {
    const repository = createRepositoryMock();
    const passwordHasher = createPasswordHasherMock({ compare: jest.fn().mockResolvedValue(false) });
    const service = new AuthService(repository, passwordHasher, createGoogleClientMock() as any);

    const result = await service.login({ email: baseUser.email, password: 'wrong' });
    expect(result).toBeNull();
  });

  it('верифицирует refresh-токен', () => {
    const repository = createRepositoryMock();
    const passwordHasher = createPasswordHasherMock();
    const service = new AuthService(repository, passwordHasher, createGoogleClientMock() as any);

    const tokens = service.rotateTokens(baseUser);
    const payload = service.verifyRefreshToken(tokens.refreshToken);
    expect(payload.id).toBe(baseUser.id);
  });

  it('создаёт пользователя через Google, если не найден', async () => {
    const repository = createRepositoryMock({
      findByEmail: jest.fn().mockResolvedValue(null),
      createUserFromGoogle: jest.fn().mockResolvedValue({
        ...baseUser,
        id: 5,
        authProvider: 'google',
        googleId: 'google-123',
      }),
    });
    const passwordHasher = createPasswordHasherMock();
    const service = new AuthService(repository, passwordHasher, createGoogleClientMock() as any);

    const result = await service.loginWithGoogle('token');
    expect(result.user.id).toBe(5);
    expect(repository.createUserFromGoogle).toHaveBeenCalled();
  });

  it('создаёт пользователя через Yandex, если не найден', async () => {
    const repository = createRepositoryMock({
      findByEmail: jest.fn().mockResolvedValue(null),
    });
    const passwordHasher = createPasswordHasherMock();
    const yaMocks = createYandexMocks();

    const service = new AuthService(repository, passwordHasher, createGoogleClientMock() as any);
    // Подменяем приватные методы через any
    (service as any).exchangeYandexCode = yaMocks.exchange;
    (service as any).fetchYandexUserInfo = yaMocks.info;

    const result = await service.loginWithYandex('code');
    expect(result.user.id).toBe(3);
    expect(repository.createUserFromYandex).toHaveBeenCalled();
  });
});

