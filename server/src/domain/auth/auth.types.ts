export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: string;
  googleId?: string | null;
  yandexId?: string | null;
}

export interface AuthUserWithPassword extends AuthUser {
  passwordHash: string | null;
}

export interface RegisterUserInput {
  name: string | null;
  email: string;
  passwordHash: string;
}

export interface CreateGoogleUserInput {
  name: string | null;
  email: string | null;
  googleId: string;
  avatarUrl: string | null;
}

export interface AttachGoogleAccountInput {
  userId: number;
  googleId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface CreateYandexUserInput {
  name: string | null;
  email: string | null;
  yandexId: string;
  avatarUrl: string | null;
}

export interface AttachYandexAccountInput {
  userId: number;
  yandexId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserWithPassword | null>;
  findByGoogleId(googleId: string): Promise<AuthUser | null>;
  findByYandexId(yandexId: string): Promise<AuthUser | null>;
  createUser(input: RegisterUserInput): Promise<AuthUser>;
  createUserFromGoogle(input: CreateGoogleUserInput): Promise<AuthUser>;
  attachGoogleAccount(input: AttachGoogleAccountInput): Promise<AuthUser>;
  createUserFromYandex(input: CreateYandexUserInput): Promise<AuthUser>;
  attachYandexAccount(input: AttachYandexAccountInput): Promise<AuthUser>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

