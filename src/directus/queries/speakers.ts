import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { Speaker } from '@/directus/types'

export const fetchSpeakers = async (eventId: number): Promise<Speaker[]> => {
  return await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('speakers' as any, {
            filter: {
              event_id: { _eq: eventId },
              status: { _eq: 'published' },
            },
            fields: [
              'id',
              'name',
              'position',
              'company',
              'photo',
              'bio',
              'linkedin_url',
              'social_links',
              'translations.languages_code',
              'translations.bio',
              'translations.name',
              'translations.title',
              'translations.company',
            ],
            sort: ['sort', 'name'],
            limit: -1,
          }),
          300
        )
      ) as Speaker[]

      return items ?? []
    },
    [],
    `fetchSpeakers(eventId=${eventId})`
  ) as Speaker[]
}
