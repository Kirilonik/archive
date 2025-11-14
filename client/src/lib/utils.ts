/**
 * Утилиты для форматирования данных
 */

export function formatMinutes(amount?: number | null): string | null {
  if (!amount || amount <= 0) return null;
  const hours = Math.floor(amount / 60);
  const minutes = amount % 60;
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
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

