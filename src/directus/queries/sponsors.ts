/**
 * Directus queries for sponsor data on public pages.
 * Uses public read policy — no admin token.
 */
import { readItems, readItem } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { SponsorEvent } from '@/directus/types'

const SPONSOR_FIELDS = [
  'id',
  'is_featured',
  'sort',
  'sponsor_id.id',
  'sponsor_id.logo',
  'sponsor_id.website',
  'sponsor_id.translations.languages_code',
  'sponsor_id.translations.company_name',
  'sponsor_id.translations.company_description',
  'sponsor_tier_id.id',
  'sponsor_tier_id.sort',
  'sponsor_tier_id.badge_color',
  'sponsor_tier_id.logo_display_size',
  'sponsor_tier_id.translations.languages_code',
  'sponsor_tier_id.translations.name',
  'exhibitor_event_id.id',
  'exhibitor_event_id.booth_number',
] as const

/**
 * Fetch all published sponsor_events for an event,
 * sorted by tier sort order then within-tier sort.
 */
export async function fetchSponsors(eventId: number): Promise<SponsorEvent[]> {
  return await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('sponsor_events' as any, {
            filter: {
              event_id: { _eq: eventId },
              status: { _eq: 'published' },
            },
            fields: SPONSOR_FIELDS as unknown as string[],
            sort: ['sponsor_tier_id.sort', 'sort'],
            limit: -1,
          }),
          300
        )
      ) as SponsorEvent[]

      return items ?? []
    },
    [],
    `fetchSponsors(eventId=${eventId})`
  ) as SponsorEvent[]
}

/**
 * Fetch a single sponsor_event by id for the detail page.
 */
export async function fetchSponsorDetail(sponsorEventId: string): Promise<SponsorEvent | null> {
  return await safeApiCall(
    async () => {
      const item = await directus.request(
        withRevalidate(
          readItem('sponsor_events' as any, sponsorEventId, {
            fields: SPONSOR_FIELDS as unknown as string[],
          }),
          300
        )
      ) as SponsorEvent

      return item ?? null
    },
    null,
    `fetchSponsorDetail(id=${sponsorEventId})`
  )
}

/**
 * Group an array of SponsorEvents by their tier id.
 * Returns array of [tier, sponsors[]] sorted by tier.sort ascending.
 */
export function groupSponsorsByTier(
  sponsors: SponsorEvent[]
): { tier: SponsorEvent['sponsor_tier_id']; items: SponsorEvent[] }[] {
  const map = new Map<string, { tier: SponsorEvent['sponsor_tier_id']; items: SponsorEvent[] }>()

  for (const s of sponsors) {
    if (!s.sponsor_tier_id) continue
    const tierId = s.sponsor_tier_id.id
    if (!map.has(tierId)) {
      map.set(tierId, { tier: s.sponsor_tier_id, items: [] })
    }
    map.get(tierId)!.items.push(s)
  }

  return Array.from(map.values()).sort(
    (a, b) => (a.tier?.sort ?? 0) - (b.tier?.sort ?? 0)
  )
}
