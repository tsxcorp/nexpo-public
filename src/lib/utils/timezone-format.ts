/**
 * Timezone formatting utilities for Nexpo public site.
 * All dates in Directus are stored as UTC. These helpers apply tenant timezone for display.
 */

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'

/**
 * Format a UTC date string to tenant's timezone.
 *
 * @param dateStr - ISO date string from Directus (UTC)
 * @param timezone - IANA timezone string
 * @param options - Intl.DateTimeFormat options override
 *
 * @example formatDateTime('2026-03-31T10:00:00Z', 'Asia/Ho_Chi_Minh')
 *          → "31/03/2026 17:00"
 */
export function formatDateTime(
  dateStr: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
    ...options,
  }

  return new Intl.DateTimeFormat('vi-VN', defaultOptions).format(date)
}

/**
 * Format date only (no time) in tenant timezone.
 */
export function formatDate(
  dateStr: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateTime(dateStr, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Format time only in tenant timezone.
 */
export function formatTime(
  dateStr: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateTime(dateStr, timezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format date in a friendly way for event display.
 * E.g., "Thứ 2, 31/03/2026 17:00"
 */
export function formatEventDateTime(
  dateStr: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateTime(dateStr, timezone, {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
