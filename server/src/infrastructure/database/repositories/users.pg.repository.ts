import { pool } from '../../../config/db.js';
import type { UsersRepository, UserProfile, UserProfileUpdate } from '../../../domain/users/user.types.js';

function mapProfile(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
  };
}

export class UsersPgRepository implements UsersRepository {
  async findById(userId: number): Promise<UserProfile | null> {
    const { rows } = await pool.query(
      'SELECT id, email, name, avatar_url FROM users WHERE id=$1',
      [userId],
    );
    if (!rows[0]) return null;
    return mapProfile(rows[0]);
  }

  async updateProfile(userId: number, data: UserProfileUpdate): Promise<UserProfile | null> {
    const name = data.name ?? null;
    const avatarUrl = data.avatarUrl ?? null;
    const { rows } = await pool.query(
      'UPDATE users SET name=$1, avatar_url=$2 WHERE id=$3 RETURNING id, email, name, avatar_url',
      [name, avatarUrl, userId],
    );
    if (!rows[0]) return null;
    return mapProfile(rows[0]);
  }

  async deleteById(userId: number): Promise<void> {
    await pool.query('DELETE FROM users WHERE id=$1', [userId]);
  }
}

