export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface UserProfileUpdate {
  name?: string | null;
  avatarUrl?: string | null;
}

export interface UsersRepository {
  findById(userId: number): Promise<UserProfile | null>;
  updateProfile(userId: number, data: UserProfileUpdate): Promise<UserProfile | null>;
  deleteById(userId: number): Promise<void>;
}

export interface AvatarProcessor {
  process(dataUrl: string): Promise<string>;
}

