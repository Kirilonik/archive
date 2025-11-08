import type { UsersRepository, AvatarProcessor, UserProfile } from '../../domain/users/user.types.js';

export interface UpdateUserProfileInput {
  name?: string | null;
  avatarUrl?: string | null;
}

export class UserService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly avatarProcessor: AvatarProcessor,
  ) {}

  async getUserProfile(userId: number): Promise<UserProfile | null> {
    const profile = await this.usersRepository.findById(userId);
    if (!profile) return null;
    return profile;
  }

  async updateUserProfile(userId: number, input: UpdateUserProfileInput): Promise<UserProfile | null> {
    const profile = await this.usersRepository.findById(userId);
    if (!profile) return null;

    let avatarUrlToSave = input.avatarUrl ?? undefined;
    if (avatarUrlToSave) {
      avatarUrlToSave = await this.avatarProcessor.process(avatarUrlToSave);
    }

    return this.usersRepository.updateProfile(userId, {
      name: input.name ?? profile.name ?? null,
      avatarUrl: avatarUrlToSave ?? profile.avatarUrl ?? null,
    });
  }

  async deleteUser(userId: number): Promise<void> {
    await this.usersRepository.deleteById(userId);
  }

  async getUserById(userId: number): Promise<UserProfile | null> {
    return this.usersRepository.findById(userId);
  }
}

