import { pool } from '../../../config/db.js';
import type { AuthRepository, AuthUser, AuthUserWithPassword, RegisterUserInput } from '../../../domain/auth/auth.types.js';

function mapRow(row: any): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
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
      'SELECT id, email, name, avatar_url, password_hash FROM users WHERE lower(email)=lower($1)',
      [email],
    );
    if (!rows[0]) return null;
    return mapRowWithPassword(rows[0]);
  }

  async createUser(input: RegisterUserInput): Promise<AuthUser> {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, avatar_url',
      [input.name, input.email, input.passwordHash],
    );
    return mapRow(rows[0]);
  }
}

