import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type {
  AuthRepository,
  PasswordHasher,
  AuthUser,
  TokenPair,
  AuthUserWithPassword,
} from '../../domain/auth/auth.types.js';
import { env } from '../../config/env.js';
import type { OAuth2Client } from 'google-auth-library';
import { logger } from '../../shared/logger.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import { createEmailVerificationTemplate, createResendVerificationTemplate } from '../../infrastructure/email/email.templates.js';

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly googleClient: OAuth2Client,
    private readonly emailService: EmailService,
  ) {}

  private signAccessToken(payload: { id: number; email: string }): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m` });
  }

  private signRefreshToken(payload: { id: number; email: string }): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });
  }

  private buildTokens(user: Pick<AuthUser, 'id' | 'email'>): TokenPair {
    const accessToken = this.signAccessToken({ id: user.id, email: user.email });
    const refreshToken = this.signRefreshToken({ id: user.id, email: user.email });
    return { accessToken, refreshToken };
  }

  async register(input: { name?: string | null; email: string; password: string }): Promise<{ user: AuthUser }> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      const err = new Error('User exists') as Error & { status: number };
      err.status = 409;
      throw err;
    }
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createUser({
      name: input.name ?? null,
      email: input.email,
      passwordHash,
    });
    
    // Создаем токен подтверждения email и отправляем письмо
    await this.sendVerificationEmail(user.id, user.email, user.name);
    
    return { user };
  }
  
  /**
   * Создает токен подтверждения email и отправляет письмо
   */
  private async sendVerificationEmail(userId: number, email: string, userName: string | null): Promise<void> {
    const token = this.generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS);
    
    await this.repository.createEmailVerificationToken(userId, token, expiresAt);
    
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    
    try {
      await this.emailService.sendEmail({
        to: email,
        subject: 'Подтверждение email адреса',
        html: createEmailVerificationTemplate(verificationUrl, userName),
      });
      logger.info({ userId, email }, 'Письмо подтверждения email отправлено');
    } catch (error) {
      logger.error({ error, userId, email }, 'Ошибка при отправке письма подтверждения');
      // Не пробрасываем ошибку, чтобы регистрация не провалилась из-за проблем с email
    }
  }
  
  /**
   * Генерирует безопасный случайный токен для подтверждения email
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Подтверждает email пользователя по токену
   */
  async verifyEmail(token: string): Promise<void> {
    const tokenRecord = await this.repository.findEmailVerificationToken(token);
    
    if (!tokenRecord) {
      const error = new Error('Токен подтверждения не найден или уже использован') as Error & { status: number };
      error.status = 400;
      throw error;
    }
    
    if (tokenRecord.expiresAt < new Date()) {
      const error = new Error('Токен подтверждения истек') as Error & { status: number };
      error.status = 400;
      throw error;
    }
    
    // Отмечаем токен как использованный
    await this.repository.markEmailVerificationTokenAsUsed(tokenRecord.id);
    
    // Отмечаем email как подтвержденный
    await this.repository.markUserEmailAsVerified(tokenRecord.userId);
    
    logger.info({ userId: tokenRecord.userId }, 'Email успешно подтвержден');
  }
  
  /**
   * Повторно отправляет письмо подтверждения email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.repository.findByEmail(email);
    
    if (!user) {
      // Не раскрываем, существует ли пользователь (защита от перечисления)
      logger.debug({ email }, 'Попытка повторной отправки письма для несуществующего пользователя');
      return;
    }
    
    if (user.emailVerified) {
      // Email уже подтвержден
      logger.debug({ userId: user.id, email }, 'Попытка повторной отправки письма для уже подтвержденного email');
      return;
    }
    
    // Создаем новый токен и отправляем письмо
    const token = this.generateVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS);
    
    await this.repository.createEmailVerificationToken(user.id, token, expiresAt);
    
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    
    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Подтверждение email адреса',
        html: createResendVerificationTemplate(verificationUrl, user.name),
      });
      logger.info({ userId: user.id, email: user.email }, 'Повторное письмо подтверждения email отправлено');
    } catch (error) {
      logger.error({ error, userId: user.id, email: user.email }, 'Ошибка при повторной отправке письма подтверждения');
    }
  }

  private ensureUserHasPassword(user: AuthUserWithPassword | null): AuthUserWithPassword | null {
    if (!user) return null;
    if (!user.passwordHash) return null;
    return user;
  }

  /**
   * Логин с защитой от timing attacks
   * Всегда выполняет сравнение пароля, даже если пользователь не найден
   * Проверяет подтверждение email
   */
  async login(input: { email: string; password: string }): Promise<{ user: AuthUser; tokens: TokenPair } | null> {
    const user = await this.repository.findByEmail(input.email);
    
    // Защита от timing attacks: всегда выполняем сравнение пароля
    // Если пользователь не найден или не имеет пароля, используем null hash
    const passwordHash = user?.passwordHash ?? null;
    const ok = await this.passwordHasher.compare(input.password, passwordHash);
    
    // Проверяем, что пользователь существует, имеет пароль и пароль верный
    if (!user || !user.passwordHash || !ok) {
      return null;
    }
    
    // Проверяем, что email подтвержден (для локальной регистрации)
    if (user.authProvider === 'local' && !user.emailVerified) {
      const error = new Error('Email не подтвержден. Пожалуйста, проверьте вашу почту и подтвердите email адрес.') as Error & { status: number; requiresEmailVerification: boolean };
      error.status = 403;
      (error as any).requiresEmailVerification = true;
      throw error;
    }
    
    const stripped: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      googleId: user.googleId ?? null,
      emailVerified: user.emailVerified,
    };
    return { user: stripped, tokens: this.buildTokens(stripped) };
  }

  verifyRefreshToken(token: string): { id: number; email: string; iat: number; exp: number } {
    try {
      // Согласно best practices: проверка токена с обработкой различных типов ошибок
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number; email: string; iat: number; exp: number };
    } catch (error: unknown) {
      // Логируем ошибки верификации для мониторинга отзыва токенов
      if (error && typeof error === 'object' && 'name' in error) {
        if (error.name === 'TokenExpiredError' && 'expiredAt' in error) {
          logger.debug({ exp: error.expiredAt }, 'Refresh token expired');
        } else if (error.name === 'JsonWebTokenError' && 'message' in error) {
          logger.warn({ error: String(error.message) }, 'Invalid refresh token format');
        }
      }
      throw error;
    }
  }

  rotateTokens(user: Pick<AuthUser, 'id' | 'email'>): TokenPair {
    // Согласно best practices: ротация токенов при каждом обновлении
    // Это обеспечивает безопасность и позволяет отзывать старые токены
    return this.buildTokens(user);
  }

  async loginWithGoogle(idToken: string): Promise<{ user: AuthUser; tokens: TokenPair }> {
    let payload: { sub?: string; email?: string; name?: string; picture?: string } | undefined;
    try {
      // Согласно best practices: верификация токена с указанием audience
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload() as { sub?: string; email?: string; name?: string; picture?: string } | undefined;
    } catch (err: unknown) {
      // Согласно best practices: логирование ошибок верификации для мониторинга
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorCode = err && typeof err === 'object' && 'code' in err ? String(err.code) : undefined;
      logger.warn({ 
        error: errorMessage, 
        code: errorCode,
        type: 'google_id_token_verification_error' 
      }, 'Google ID token verification failed');
      const error = new Error('Не удалось проверить Google токен') as Error & { status: number; cause: unknown };
      error.status = 401;
      error.cause = err;
      throw error;
    }

    if (!payload?.sub) {
      logger.warn({ payload: payload ? 'present but missing sub' : 'missing' }, 'Invalid Google token payload');
      const error = new Error('Некорректный ответ Google') as Error & { status: number };
      error.status = 401;
      throw error;
    }

    const googleId = payload.sub;
    const email = payload.email ?? null;
    const name = payload.name ?? null;
    const avatarUrl = payload.picture ?? null;

    let user = await this.repository.findByGoogleId(googleId);

    if (!user && email) {
      const existing = await this.repository.findByEmail(email);
      if (existing) {
        user = await this.repository.attachGoogleAccount({
          userId: existing.id,
          googleId,
          name,
          email,
          avatarUrl,
        });
      }
    }

    if (!user) {
      user = await this.repository.createUserFromGoogle({
        googleId,
        name,
        email,
        avatarUrl,
      });
    }

    const tokens = this.buildTokens(user);
    return { user, tokens };
  }
}

