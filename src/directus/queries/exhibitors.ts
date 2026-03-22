import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { ExhibitorEvent } from '@/directus/types'

export const fetchExhibitors = async (eventId: number): Promise<ExhibitorEvent[]> => {
  return await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('exhibitor_events' as any, {
            filter: {
              event_id: { _eq: eventId },
              status: { _eq: 'published' },
            },
            fields: [
              'id',
              'booth_number',
              'nameboard',
              'is_featured',
              'exhibitor_id.id',
              'exhibitor_id.logo',
              'exhibitor_id.website',
              'exhibitor_id.translations.languages_code',
              'exhibitor_id.translations.company_name',
              'exhibitor_id.translations.company_description',
              'exhibitor_id.industry_id.translations.languages_code',
              'exhibitor_id.industry_id.translations.category',
            ],
            sort: ['-is_featured', 'sort'],
            limit: -1,
          }),
          300
        )
      ) as ExhibitorEvent[]

      return items ?? []
    },
    [],
    `fetchExhibitors(eventId=${eventId})`
  ) as ExhibitorEvent[]
}
