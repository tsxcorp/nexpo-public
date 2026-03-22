import { readItems, readItem } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { Sites, EventBasicInfo } from '@/directus/types'

// Mock data for fallback when Directus is not available
const getMockSite = (siteSlug: string): Sites => ({
  id: '1',
  status: 'published',
  slug: siteSlug,
  name: 'Mock Site',
  navigation: ['header', 'footer']
})

export const getSite = async (siteSlug: string): Promise<Sites | null> => {
  console.log('\n=== Fetch Site ===');
  console.log('Site slug:', siteSlug);

  return await safeApiCall(async () => {
    // First, get the site
    const sites = await directus.request(
      withRevalidate(
        readItems('sites' as any, {
          filter: {
            slug: {
              _eq: siteSlug
            }
          },
          fields: ['*', 'navigation.type', 'translations.*'],
          limit: 1
        }),
        60
      )
    ) as Sites[];

    console.log('Raw site response:', sites);

    if (!sites[0]) {
      console.log('❌ No site found');
      return null;
    }

    // Then, get the languages for this site
    const siteLanguages = await directus.request(
      withRevalidate(
        readItems('sites_languages' as any, {
          filter: {
            sites_id: {
              _eq: sites[0].id
            }
          },
          fields: ['languages_code']
        }),
        60
      )
    ) as any[];

    console.log('Site languages response:', siteLanguages);

    // Get the language codes
    const languageCodes = siteLanguages.map(sl => sl.languages_code);

    // Then, get the full language details
    const languages = await directus.request(
      withRevalidate(
        readItems('languages' as any, {
          filter: {
            code: {
              _in: languageCodes
            }
          },
          fields: ['code', 'name', 'direction']
        }),
        60
      )
    ) as any[];

    console.log('Languages response:', languages);

    // Fetch linked event basic info if event_id exists
    let event: EventBasicInfo | null = null;
    if (sites[0].event_id) {
      try {
        const eventData = await directus.request(
          withRevalidate(
            readItem('events' as any, sites[0].event_id as any, {
              fields: ['id', 'name', 'start_date', 'end_date', 'location'] as any,
            }),
            300
          )
        ) as any;
        if (eventData) {
          event = {
            id: eventData.id,
            name: eventData.name,
            start_date: eventData.start_date ?? null,
            end_date: eventData.end_date ?? null,
            location: eventData.location ?? null,
          };
        }
      } catch {
        // Event fetch failure is non-critical — continue without it
      }
    }

    const siteWithLanguages: Sites = {
      ...sites[0],
      languages: languages || [],
      event: event ?? null,
    };

    console.log('✅ Site found:', {
      id: siteWithLanguages.id,
      name: siteWithLanguages.name,
      navigation: siteWithLanguages.navigation,
      status: siteWithLanguages.status,
      languages: siteWithLanguages.languages,
      event: siteWithLanguages.event,
    });

    return siteWithLanguages;
  }, getMockSite(siteSlug), `getSite(${siteSlug})`);
};

export const getSiteByDomain = async (domain: string): Promise<Sites | null> => {
  console.log('\n=== Fetch Site by Domain ===');
  console.log('Domain:', domain);

  return await safeApiCall(async () => {
    // First, get the site
    const sites = await directus.request(
      withRevalidate(
        readItems('sites' as any, {
          filter: {
            domain: {
              _eq: domain
            }
          },
          fields: ['id', 'name', 'slug', 'domain', 'domain_verified', 'status', 'navigation'],
          limit: 1
        }),
        60
      )
    ) as Sites[];

    console.log('Raw site response:', sites);

    if (!sites[0]) {
      console.log('❌ No site found for domain');
      return null;
    }

    // Then, get the languages for this site
    const siteLanguages = await directus.request(
      withRevalidate(
        readItems('sites_languages' as any, {
          filter: {
            sites_id: {
              _eq: sites[0].id
            }
          },
          fields: ['languages_code']
        }),
        60
      )
    ) as any[];

    console.log('Site languages response:', siteLanguages);

    // Get the language codes
    const languageCodes = siteLanguages.map(sl => sl.languages_code);

    // Then, get the full language details
    const languages = await directus.request(
      withRevalidate(
        readItems('languages' as any, {
          filter: {
            code: {
              _in: languageCodes
            }
          },
          fields: ['code', 'name', 'direction']
        }),
        60
      )
    ) as any[];

    console.log('Languages response:', languages);

    const siteWithLanguages: Sites = {
      ...sites[0],
      languages: languages || []
    };

    console.log('✅ Site found:', {
      id: siteWithLanguages.id,
      name: siteWithLanguages.name,
      navigation: siteWithLanguages.navigation,
      status: siteWithLanguages.status,
      languages: siteWithLanguages.languages
    });

    return siteWithLanguages;
  }, null, `getSiteByDomain(${domain})`);
}; 