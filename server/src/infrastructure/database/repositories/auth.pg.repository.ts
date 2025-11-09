import { pool } from '../../../config/db.js';
import type {
  AttachGoogleAccountInput,
  AuthRepository,
  AuthUser,
  AuthUserWithPassword,
  CreateGoogleUserInput,
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
      'SELECT id, email, name, avatar_url, password_hash, auth_provider, google_id, yandex_id FROM users WHERE lower(email)=lower($1)',
      [email],
    );
    if (!rows[0]) return null;
    return mapRowWithPassword(rows[0]);
  }

  async findByGoogleId(googleId: string): Promise<AuthUser | null> {
    const { rows } = await pool.query(
      'SELECT id, email, name, avatar_url, auth_provider, google_id, yandex_id FROM users WHERE google_id = $1',
      [googleId],
    );
    if (!rows[0]) return null;
    return mapRow(rows[0]);
  }

  async createUser(input: RegisterUserInput): Promise<AuthUser> {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, auth_provider)
       VALUES ($1,$2,$3,'local')
       RETURNING id, name, email, avatar_url, auth_provider, google_id, yandex_id`,
      [input.name, input.email, input.passwordHash],
    );
    return mapRow(rows[0]);
  }

  async createUserFromGoogle(input: CreateGoogleUserInput): Promise<AuthUser> {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, avatar_url, google_id, auth_provider)
       VALUES ($1,$2,$3,$4,'google')
       RETURNING id, name, email, avatar_url, auth_provider, google_id, yandex_id`,
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
             avatar_url = COALESCE($5, avatar_url)
       WHERE id = $1
       RETURNING id, name, email, avatar_url, auth_provider, google_id, yandex_id`,
      [input.userId, input.googleId, input.name, input.email, input.avatarUrl],
    );
    return mapRow(rows[0]);
  }

}

