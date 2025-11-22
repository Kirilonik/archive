export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: string;
  googleId?: string | null;
  emailVerified: boolean;
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

export interface EmailVerificationToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserWithPassword | null>;
  findByGoogleId(googleId: string): Promise<AuthUser | null>;
  createUser(input: RegisterUserInput): Promise<AuthUser>;
  createUserFromGoogle(input: CreateGoogleUserInput): Promise<AuthUser>;
  attachGoogleAccount(input: AttachGoogleAccountInput): Promise<AuthUser>;
  createEmailVerificationToken(userId: number, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null>;
  markEmailVerificationTokenAsUsed(tokenId: number): Promise<void>;
  markUserEmailAsVerified(userId: number): Promise<void>;
  deleteExpiredEmailVerificationTokens(): Promise<number>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string | null): Promise<boolean>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

