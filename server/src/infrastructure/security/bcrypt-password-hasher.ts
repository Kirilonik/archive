import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../domain/auth/auth.types.js';

/**
 * Защита от timing attacks: всегда выполняем сравнение пароля,
 * даже если пользователь не найден, чтобы время ответа было одинаковым
 */
const DUMMY_HASH =
  '$2a$10$dummy.hash.for.timing.attack.protection.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds = 10) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  /**
   * Сравнение пароля с защитой от timing attacks
   * Всегда выполняет сравнение, даже если hash невалидный
   */
  async compare(password: string, passwordHash: string | null): Promise<boolean> {
    // Если hash null или пустой, сравниваем с dummy hash для защиты от timing attacks
    const hashToCompare = passwordHash || DUMMY_HASH;
    return bcrypt.compare(password, hashToCompare);
  }
}
