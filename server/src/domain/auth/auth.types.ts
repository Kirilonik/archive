export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthUserWithPassword extends AuthUser {
  passwordHash: string | null;
}

export interface RegisterUserInput {
  name: string | null;
  email: string;
  passwordHash: string;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserWithPassword | null>;
  createUser(input: RegisterUserInput): Promise<AuthUser>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

