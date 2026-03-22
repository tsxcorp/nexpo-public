import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { Globals } from '../types'

// Mock data for fallback when Directus is not available
const getMockGlobals = (): Globals => ({
  id: '1',
  status: 'published',
  translations: [
    {
      id: 1,
      languages_code: 'en-US',
      title: 'Mock Site',
      tagline: 'Mock Tagline',
      description: 'Mock Description',
      contact: 'Mock Contact',
      blog_setting: {
        id: '1',
        title: 'Blog',
        headline: 'Latest Posts'
      },
      project_setting: {
        id: '1',
        title: 'Projects',
        headline: 'Our Projects'
      },
      seo: '1',
      setting: '1',
      social: '1',
      deployment: '1'
    }
  ]
})

export const fetchGlobals = async (siteId?: string): Promise<Globals | null> => {
  console.log('\n=== Fetch Globals ===')
  console.log('Site ID:', siteId)

  return await safeApiCall(async () => {
    const filters: any = {};
    if (siteId) {
      filters.site_id = { _eq: siteId };
    }

    const globals = await directus.request(
      withRevalidate(
        readItems('globals' as any, {
          fields: ['*', 'translations.*'],
          filter: filters,
          limit: 1
        }),
        60
      )
    ) as Globals[]

    if (!globals[0]) {
      console.log('❌ No globals found')
      return null
    }

    console.log('✅ Globals found:', {
      id: globals[0].id,
      site_id: globals[0].site_id,
      translations: globals[0].translations?.length || 0
    })

    return globals[0]
  }, getMockGlobals(), 'fetchGlobals()')
} 