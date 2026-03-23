import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { Forms } from '@/directus/types'

export const fetchRegistrationForm = async (
  siteId: string,
  eventId?: number
): Promise<Forms | null> => {
  return await safeApiCall(
    async () => {
      // Fetch the registration form for this event
      const filter: Record<string, unknown> = {
        status: { _eq: 'published' },
        is_registration: { _eq: true },
      }
      if (eventId) {
        filter.event_id = { _eq: eventId }
      }

      const items = await directus.request(
        withRevalidate(
          readItems('forms' as any, {
            filter,
            fields: [
              'id',
              'status',
              'on_success',
              'redirect_url',
              { translations: ['*'] },
              { fields: ['*', { translations: ['*'] }] },
            ] as any,
            limit: 1,
          }),
          60
        )
      ) as Forms[]

      return items?.[0] ?? null
    },
    null,
    `fetchRegistrationForm(site=${siteId}, event=${eventId})`
  )
}
