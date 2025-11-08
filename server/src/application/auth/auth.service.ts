import jwt from 'jsonwebtoken';
import type {
  AuthRepository,
  PasswordHasher,
  AuthUser,
  TokenPair,
  AuthUserWithPassword,
} from '../../domain/auth/auth.types.js';
import { env } from '../../config/env.js';

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  private signAccessToken(payload: { id: number; email: string }): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m` });
  }

  private signRefreshToken(payload: { id: number; email: string }): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });
  }

  private buildTokens(user: AuthUser): TokenPair {
    const accessToken = this.signAccessToken({ id: user.id, email: user.email });
    const refreshToken = this.signRefreshToken({ id: user.id, email: user.email });
    return { accessToken, refreshToken };
  }

  async register(input: { name?: string | null; email: string; password: string }): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      const err: any = new Error('User exists');
      err.status = 409;
      throw err;
    }
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createUser({
      name: input.name ?? null,
      email: input.email,
      passwordHash,
    });
    return { user, tokens: this.buildTokens(user) };
  }

  private ensureUserHasPassword(user: AuthUserWithPassword | null): AuthUserWithPassword | null {
    if (!user) return null;
    if (!user.passwordHash) return null;
    return user;
  }

  async login(input: { email: string; password: string }): Promise<{ user: AuthUser; tokens: TokenPair } | null> {
    const user = this.ensureUserHasPassword(await this.repository.findByEmail(input.email));
    if (!user) return null;
    const ok = await this.passwordHasher.compare(input.password, user.passwordHash!);
    if (!ok) return null;
    const stripped: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
    return { user: stripped, tokens: this.buildTokens(stripped) };
  }

  verifyRefreshToken(token: string): { id: number; email: string; iat: number; exp: number } {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number; email: string; iat: number; exp: number };
  }

  rotateTokens(user: AuthUser): TokenPair {
    return this.buildTokens(user);
  }
}

