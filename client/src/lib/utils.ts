/**
 * Утилиты для форматирования данных
 */

/**
 * Форматирует длительность в минутах в строку "X ч Y мин" или "Y мин"
 * @param amount - количество минут
 * @param roundToHours - если true, округляет до часов (для Profile)
 * @returns отформатированная строка или null
 */
export function formatMinutes(amount?: number | null, roundToHours = false): string | null {
  if (!amount || amount <= 0) return null;
  
  if (roundToHours) {
    const hours = Math.round(amount / 60);
    return `${hours} ч`;
  }
  
  const hours = Math.floor(amount / 60);
  const minutes = amount % 60;
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
}

/**
 * Форматирует длительность в минутах (аналог formatMinutes, но возвращает "—" вместо null)
 * Используется в SeriesDetails для отображения длительности эпизодов
 */
export function formatDuration(duration: number | null | undefined): string {
  if (!duration) return '—';
  return formatMinutes(duration) ?? '—';
}

/**
 * Форматирует дату в строку формата "DD месяц YYYY" на русском языке
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatBudget(amount?: number | null, symbol?: string | null, code?: string | null): string | null {
  if (amount == null) return null;
  let value = amount;
  let suffix = '';
  if (amount >= 1_000_000_000) {
    value = amount / 1_000_000_000;
    suffix = ' млрд';
  } else if (amount >= 1_000_000) {
    value = amount / 1_000_000;
    suffix = ' млн';
  } else if (amount >= 1_000) {
    value = amount / 1_000;
    suffix = ' тыс';
  }
  const formattedValue = value.toFixed(2);
  if (symbol) return `${symbol}${formattedValue}${suffix}`;
  if (code) return `${formattedValue}${suffix} ${code}`;
  return `${amount.toLocaleString()} ₽`;
}

