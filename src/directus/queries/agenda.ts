import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { AgendaSession, AgendaTrack } from '@/directus/types'

export const fetchAgendaSessions = async (eventId: number): Promise<AgendaSession[]> => {
  return await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('agendas' as any, {
            filter: {
              event_id: { _eq: eventId },
              status: { _eq: 'published' },
            },
            fields: [
              'id',
              'date',
              'day_number',
              'start_time',
              'end_time',
              'location',
              'session_type',
              'is_featured',
              'track_id',
              // M2M junction: agendas_speakers → speakers
              'speakers.speakers_id.id',
              'speakers.speakers_id.name',
              'speakers.speakers_id.photo',
              'translations.languages_code',
              'translations.title',
              'translations.description',
            ],
            sort: ['day_number', 'date', 'start_time'],
            limit: -1,
          }),
          300
        )
      ) as AgendaSession[]

      return items ?? []
    },
    [],
    `fetchAgendaSessions(eventId=${eventId})`
  ) as AgendaSession[]
}

export const fetchAgendaTracks = async (eventId: number): Promise<AgendaTrack[]> => {
  return await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('agenda_tracks' as any, {
            filter: {
              event_id: { _eq: eventId },
            },
            fields: ['id', 'track_slug', 'default_name', 'track_color', 'translations.languages_code', 'translations.name'],
            sort: ['sort'],
          }),
          300
        )
      ) as AgendaTrack[]

      return items ?? []
    },
    [],
    `fetchAgendaTracks(eventId=${eventId})`
  ) as AgendaTrack[]
}
