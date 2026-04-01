/**
 * Currency formatting utilities for the Nexpo platform.
 * Used in ticket listing, checkout, and facility order pages.
 */

/** Supported currency metadata: symbol, locale, decimal digits */
const CURRENCY_META: Record<string, { symbol: string; locale: string; decimals: number }> = {
  VND: { symbol: '₫', locale: 'vi-VN', decimals: 0 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€', locale: 'de-DE', decimals: 2 },
  JPY: { symbol: '¥', locale: 'ja-JP', decimals: 0 },
  SGD: { symbol: 'S$', locale: 'en-SG', decimals: 2 },
  THB: { symbol: '฿', locale: 'th-TH', decimals: 2 },
}

/**
 * Format a price with currency symbol using Intl.NumberFormat.
 * Returns null for zero prices (caller decides "Free" label).
 *
 * @example formatPrice(500000, 'VND') → "500.000₫"
 * @example formatPrice(20, 'USD') → "$20.00"
 * @example formatPrice(0, 'VND') → null
 */
export function formatPrice(price: number, currency: string): string | null {
  if (price === 0) return null
  const meta = CURRENCY_META[currency]
  if (meta) {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(price)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}

/**
 * Format price, returning a display string (never null).
 * Shows freeLabel for zero prices.
 */
export function formatPriceDisplay(price: number, currency: string, freeLabel = 'Miễn phí'): string {
  return formatPrice(price, currency) ?? freeLabel
}

/**
 * Resolve price from multi-currency prices object.
 * Falls back to legacy price+currency fields.
 *
 * @returns price number or null if currency not available
 */
export function resolvePrice(
  prices: Record<string, number> | null | undefined,
  selectedCurrency: string,
  legacyPrice?: number,
  legacyCurrency?: string
): number | null {
  if (prices && selectedCurrency in prices) {
    return prices[selectedCurrency]
  }
  if (legacyCurrency === selectedCurrency && legacyPrice !== undefined) {
    return legacyPrice
  }
  return null
}

/**
 * Get the currency symbol for display (e.g., in selectors)
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_META[currency]?.symbol ?? currency
}

/**
 * Determine default currency based on language.
 * Used for smart default in currency selector.
 */
export function getDefaultCurrencyForLang(
  lang: string,
  supportedCurrencies: string[],
  tenantDefault: string
): string {
  const langCurrencyMap: Record<string, string> = { vi: 'VND', en: 'USD' }
  const preferred = langCurrencyMap[lang]
  if (preferred && supportedCurrencies.includes(preferred)) return preferred
  return supportedCurrencies.includes(tenantDefault) ? tenantDefault : supportedCurrencies[0] ?? 'VND'
}
