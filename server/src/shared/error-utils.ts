/**
 * Утилиты для безопасной обработки ошибок
 */

export interface ErrorWithStatus extends Error {
  status?: number;
  cause?: unknown;
}

/**
 * Проверяет, является ли ошибка объектом с полем status
 */
export function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as ErrorWithStatus).status === 'number'
  );
}

/**
 * Получает сообщение об ошибке безопасным способом
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

