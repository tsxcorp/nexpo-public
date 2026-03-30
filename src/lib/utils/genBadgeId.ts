import { randomBytes } from 'crypto'

const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/**
 * Generate a unique badge/ticket code.
 * Format: {event_code}-{6 random chars}  e.g.  NEXPO2026-A7B3XY
 * Uses Crockford-ish charset: no 0/O/1/I/L to avoid visual confusion.
 */
export function genBadgeId(event: { event_code?: string | null; id: number }): string {
  const bytes = randomBytes(6)
  const random = Array.from(bytes).map(b => CHARSET[b % CHARSET.length]).join('')
  const prefix = event.event_code?.toUpperCase() ?? `EVT${event.id}`
  return `${prefix}-${random}`
}
