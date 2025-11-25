import { jest } from '@jest/globals';
import { UserService } from './user.service.js';
import type {
  UsersRepository,
  AvatarProcessor,
  UserProfile,
} from '../../domain/users/user.types.js';

const profile: UserProfile = {
  id: 1,
  email: 'user@example.com',
  name: 'Test User',
  avatarUrl: null,
};

function createRepositoryMock(overrides: Partial<UsersRepository> = {}): UsersRepository {
  return {
    findById: jest.fn().mockResolvedValue(profile),
    updateProfile: jest.fn().mockResolvedValue(profile),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createAvatarProcessorMock(overrides: Partial<AvatarProcessor> = {}): AvatarProcessor {
  return {
    process: jest.fn((dataUrl: string) => Promise.resolve(dataUrl)),
    ...overrides,
  };
}

describe('UserService', () => {
  it('возвращает профиль', async () => {
    const repository = createRepositoryMock();
    const avatarProcessor = createAvatarProcessorMock();
    const service = new UserService(repository, avatarProcessor);

    const result = await service.getUserProfile(1);
    expect(result).toEqual(profile);
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it('возвращает null, если профиль не найден', async () => {
    const repository = createRepositoryMock({ findById: jest.fn().mockResolvedValue(null) });
    const avatarProcessor = createAvatarProcessorMock();
    const service = new UserService(repository, avatarProcessor);

    const result = await service.getUserProfile(1);
    expect(result).toBeNull();
  });

  it('обрабатывает аватар и обновляет профиль', async () => {
    const processedAvatar = 'data:image/webp;base64,processed';
    const repository = createRepositoryMock({
      updateProfile: jest.fn().mockResolvedValue({
        ...profile,
        avatarUrl: processedAvatar,
      }),
    });
    const avatarProcessor = createAvatarProcessorMock({
      process: jest.fn().mockResolvedValue(processedAvatar),
    });
    const service = new UserService(repository, avatarProcessor);

    const result = await service.updateUserProfile(1, {
      name: 'New Name',
      avatarUrl: 'data:image/png;base64,xyz',
    });

    expect(avatarProcessor.process).toHaveBeenCalledWith('data:image/png;base64,xyz');
    expect(repository.updateProfile).toHaveBeenCalledWith(1, {
      name: 'New Name',
      avatarUrl: processedAvatar,
    });
    expect(result?.avatarUrl).toBe(processedAvatar);
  });

  it('удаляет пользователя', async () => {
    const repository = createRepositoryMock();
    const avatarProcessor = createAvatarProcessorMock();
    const service = new UserService(repository, avatarProcessor);

    await service.deleteUser(1);
    expect(repository.deleteById).toHaveBeenCalledWith(1);
  });
});
