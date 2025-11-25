import { pool } from '../../../config/db.js';
import type {
  YouTubeOAuthRepository,
  YouTubeOAuthToken,
  YouTubeOAuthTokenInput,
} from '../../../domain/integrations/youtube-oauth.types.js';
import { logger } from '../../../shared/logger.js';

function mapRow(row: any): YouTubeOAuthToken {
  return {
    id: row.id,
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: new Date(row.expires_at),
    scope: row.scope,
    tokenType: row.token_type || 'Bearer',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class YouTubeOAuthPgRepository implements YouTubeOAuthRepository {
  async saveTokens(input: YouTubeOAuthTokenInput): Promise<YouTubeOAuthToken> {
    try {
      const { rows } = await pool.query(
        `INSERT INTO youtube_oauth_tokens 
         (user_id, access_token, refresh_token, expires_at, scope, token_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           scope = EXCLUDED.scope,
           token_type = EXCLUDED.token_type,
           updated_at = NOW()
         RETURNING *`,
        [
          input.userId,
          input.accessToken,
          input.refreshToken || null,
          input.expiresAt,
          input.scope || null,
          input.tokenType || 'Bearer',
        ],
      );

      return mapRow(rows[0]);
    } catch (error) {
      logger.error({ err: error, userId: input.userId }, 'Error saving YouTube OAuth tokens');
      throw error;
    }
  }

  async getTokensByUserId(userId: number): Promise<YouTubeOAuthToken | null> {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM youtube_oauth_tokens WHERE user_id = $1',
        [userId],
      );

      if (rows.length === 0) {
        return null;
      }

      return mapRow(rows[0]);
    } catch (error) {
      logger.error({ err: error, userId }, 'Error getting YouTube OAuth tokens');
      throw error;
    }
  }

  async deleteTokensByUserId(userId: number): Promise<void> {
    try {
      await pool.query('DELETE FROM youtube_oauth_tokens WHERE user_id = $1', [userId]);
    } catch (error) {
      logger.error({ err: error, userId }, 'Error deleting YouTube OAuth tokens');
      throw error;
    }
  }

  async updateAccessToken(
    userId: number,
    accessToken: string,
    expiresAt: Date,
  ): Promise<YouTubeOAuthToken | null> {
    try {
      const { rows } = await pool.query(
        `UPDATE youtube_oauth_tokens 
         SET access_token = $1, expires_at = $2, updated_at = NOW()
         WHERE user_id = $3
         RETURNING *`,
        [accessToken, expiresAt, userId],
      );

      if (rows.length === 0) {
        return null;
      }

      return mapRow(rows[0]);
    } catch (error) {
      logger.error({ err: error, userId }, 'Error updating YouTube OAuth access token');
      throw error;
    }
  }
}

