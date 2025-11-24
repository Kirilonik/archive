import { pool } from '../../../config/db.js';
import type {
  AttachGoogleAccountInput,
  AuthRepository,
  AuthUser,
  AuthUserWithPassword,
  CreateGoogleUserInput,
  EmailVerificationToken,
  PasswordResetToken,
  RegisterUserInput,
} from '../../../domain/auth/auth.types.js';

function mapRow(row: any): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    authProvider: row.auth_provider ?? 'local',
    googleId: row.google_id ?? null,
    emailVerified: row.email_verified ?? false,
  };
}

function mapRowWithPassword(row: any): AuthUserWithPassword {
  return {
    ...mapRow(row),
    passwordHash: row.password_hash ?? null,
  };
}

export class AuthPgRepository implements AuthRepository {
  async findByEmail(email: string): Promise<AuthUserWithPassword | null> {
    const { rows } = await pool.query(
      'SELECT id, email, name, avatar_url, password_hash, auth_provider, google_id, email_verified FROM users WHERE lower(email)=lower($1)',
      [email],
    );
    if (!rows[0]) return null;
    return mapRowWithPassword(rows[0]);
  }

  async findByGoogleId(googleId: string): Promise<AuthUser | null> {
    const { rows } = await pool.query(
      'SELECT id, email, name, avatar_url, auth_provider, google_id, email_verified FROM users WHERE google_id = $1',
      [googleId],
    );
    if (!rows[0]) return null;
    return mapRow(rows[0]);
  }

  async createUser(input: RegisterUserInput): Promise<AuthUser> {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, auth_provider, email_verified)
       VALUES ($1,$2,$3,'local', false)
       RETURNING id, name, email, avatar_url, auth_provider, google_id, email_verified`,
      [input.name, input.email, input.passwordHash],
    );
    return mapRow(rows[0]);
  }

  async createUserFromGoogle(input: CreateGoogleUserInput): Promise<AuthUser> {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, avatar_url, google_id, auth_provider, email_verified)
       VALUES ($1,$2,$3,$4,'google', true)
       RETURNING id, name, email, avatar_url, auth_provider, google_id, email_verified`,
      [input.name, input.email, input.avatarUrl, input.googleId],
    );
    return mapRow(rows[0]);
  }

  async attachGoogleAccount(input: AttachGoogleAccountInput): Promise<AuthUser> {
    const { rows } = await pool.query(
      `UPDATE users
         SET google_id = $2,
             auth_provider = 'google',
             name = COALESCE(name, $3),
             email = COALESCE(email, $4, email),
             avatar_url = COALESCE($5, avatar_url),
             email_verified = true
       WHERE id = $1
       RETURNING id, name, email, avatar_url, auth_provider, google_id, email_verified`,
      [input.userId, input.googleId, input.name, input.email, input.avatarUrl],
    );
    return mapRow(rows[0]);
  }

  async createEmailVerificationToken(userId: number, token: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const { rows } = await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token, expires_at, created_at, used_at`,
      [userId, token, expiresAt],
    );
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      token: rows[0].token,
      expiresAt: rows[0].expires_at,
      createdAt: rows[0].created_at,
      usedAt: rows[0].used_at ?? null,
    };
  }

  async findEmailVerificationToken(token: string): Promise<EmailVerificationToken | null> {
    const { rows } = await pool.query(
      `SELECT id, user_id, token, expires_at, created_at, used_at
       FROM email_verification_tokens
       WHERE token = $1 AND used_at IS NULL`,
      [token],
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      token: rows[0].token,
      expiresAt: rows[0].expires_at,
      createdAt: rows[0].created_at,
      usedAt: rows[0].used_at ?? null,
    };
  }

  async markEmailVerificationTokenAsUsed(tokenId: number): Promise<void> {
    await pool.query(
      `UPDATE email_verification_tokens
       SET used_at = NOW()
       WHERE id = $1`,
      [tokenId],
    );
  }

  async markUserEmailAsVerified(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users
       SET email_verified = true
       WHERE id = $1`,
      [userId],
    );
  }

  async deleteExpiredEmailVerificationTokens(): Promise<number> {
    const { rowCount } = await pool.query(
      `DELETE FROM email_verification_tokens
       WHERE expires_at < NOW() OR used_at IS NOT NULL`,
    );
    return rowCount ?? 0;
  }

  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const { rows } = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token, expires_at, created_at, used_at`,
      [userId, token, expiresAt],
    );
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      token: rows[0].token,
      expiresAt: rows[0].expires_at,
      createdAt: rows[0].created_at,
      usedAt: rows[0].used_at ?? null,
    };
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const { rows } = await pool.query(
      `SELECT id, user_id, token, expires_at, created_at, used_at
       FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL`,
      [token],
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      token: rows[0].token,
      expiresAt: rows[0].expires_at,
      createdAt: rows[0].created_at,
      usedAt: rows[0].used_at ?? null,
    };
  }

  async markPasswordResetTokenAsUsed(tokenId: number): Promise<void> {
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1`,
      [tokenId],
    );
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE users
       SET password_hash = $2, auth_provider = 'local'
       WHERE id = $1`,
      [userId, passwordHash],
    );
  }

  async deleteExpiredPasswordResetTokens(): Promise<number> {
    const { rowCount } = await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE expires_at < NOW() OR used_at IS NOT NULL`,
    );
    return rowCount ?? 0;
  }
}

