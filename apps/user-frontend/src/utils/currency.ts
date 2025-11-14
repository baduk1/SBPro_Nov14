/**
 * Currency formatting utilities
 *
 * Uses Intl.NumberFormat for proper i18n currency formatting.
 * Defaults to GBP (£) but can be configured for other currencies.
 */

export interface CurrencyOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format a number as currency using Intl.NumberFormat
 *
 * @param value - The numeric value to format
 * @param options - Currency formatting options
 * @returns Formatted currency string (e.g., "£1,234.56")
 *
 * @example
 * formatCurrency(1234.56) // "£1,234.56"
 * formatCurrency(1234.56, { currency: 'USD', locale: 'en-US' }) // "$1,234.56"
 */
export function formatCurrency(
  value: number | null | undefined,
  options: CurrencyOptions = {}
): string {
  const {
    currency = 'GBP',
    locale = 'en-GB',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(0);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a number as currency without the symbol (just the number with proper decimal places)
 *
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "1,234.56")
 *
 * @example
 * formatNumber(1234.56) // "1,234.56"
 * formatNumber(1234.56789, 3) // "1,234.568"
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return (0).toFixed(decimals);
  }

  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
