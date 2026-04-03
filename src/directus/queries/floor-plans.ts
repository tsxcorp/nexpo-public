import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FloorPlan {
  id: string
  name: string
  floor_number: number
  width: number
  height: number
  background_image?: string | null
  date_created?: string | null
  status: 'draft' | 'published' | 'archived'
}

export interface BoothType {
  id: string
  name: string
  color: string
  default_width: number
  default_height: number
}

export interface BoothExhibitorEvent {
  id: string
  nameboard?: string | null
  exhibitor_id?: {
    id: string
    logo?: string | null
    translations?: Array<{ languages_code: string; company_name?: string; company_description?: string }>
  } | null
}

export interface Booth {
  id: string
  booth_number: string
  label?: string | null
  position_x: number
  position_y: number
  width: number
  height: number
  rotation: number
  floor_plan_id: string
  booth_type_id?: string | null
  exhibitor_event_id?: string | null
  status: 'available' | 'reserved' | 'assigned' | 'sold'
  // Nested relations
  booth_type?: BoothType | null
  exhibitor_event?: BoothExhibitorEvent | null
}

// ─── Fetch Functions ──────────────────────────────────────────────────────────

export const fetchPublishedFloorPlans = async (eventId: number): Promise<FloorPlan[]> => {
  return (await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('floor_plans' as any, {
            filter: {
              event_id: { _eq: eventId },
              status: { _eq: 'published' },
            },
            fields: ['id', 'name', 'floor_number', 'width', 'height', 'background_image', 'status', 'date_created'],
            sort: ['floor_number'],
            limit: -1,
          }),
          60 // shorter revalidation — floor plans change during event setup
        )
      ) as FloorPlan[]
      return items ?? []
    },
    [],
    `fetchPublishedFloorPlans(eventId=${eventId})`
  )) as FloorPlan[]
}

export const fetchBoothsForFloorPlans = async (floorPlanIds: string[]): Promise<Booth[]> => {
  if (!floorPlanIds.length) return []
  return (await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('booths' as any, {
            filter: { floor_plan_id: { _in: floorPlanIds } },
            fields: [
              'id',
              'booth_number',
              'label',
              'position_x',
              'position_y',
              'width',
              'height',
              'rotation',
              'floor_plan_id',
              'booth_type_id',
              'exhibitor_event_id',
              'status',
              'booth_type.id',
              'booth_type.name',
              'booth_type.color',
              'booth_type.default_width',
              'booth_type.default_height',
              'exhibitor_event.id',
              'exhibitor_event.nameboard',
              'exhibitor_event.exhibitor_id.id',
              'exhibitor_event.exhibitor_id.logo',
              'exhibitor_event.exhibitor_id.translations.languages_code',
              'exhibitor_event.exhibitor_id.translations.company_name',
              'exhibitor_event.exhibitor_id.translations.company_description',
            ],
            limit: -1,
          }),
          60 // shorter revalidation — booths change during event setup
        )
      ) as Booth[]
      return items ?? []
    },
    [],
    `fetchBoothsForFloorPlans(planIds=${floorPlanIds.join(',')})`
  )) as Booth[]
}

export const fetchBoothTypesForEvent = async (eventId: number): Promise<BoothType[]> => {
  return (await safeApiCall(
    async () => {
      const items = await directus.request(
        withRevalidate(
          readItems('booth_types' as any, {
            filter: { event_id: { _eq: eventId } },
            fields: ['id', 'name', 'color', 'default_width', 'default_height'],
            limit: -1,
          }),
          300
        )
      ) as BoothType[]
      return items ?? []
    },
    [],
    `fetchBoothTypesForEvent(eventId=${eventId})`
  )) as BoothType[]
}
