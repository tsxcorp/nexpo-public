import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { Navigation, NavigationItem } from '@/directus/types'
import { getSite } from './sites'
import { toDirectusLang } from '@/lib/utils/translation-helpers'

// Mock data for fallback when Directus is not available
const getMockNavigation = (siteSlug: string, lang: string, type: 'header' | 'footer' = 'header'): Navigation => ({
  id: type === 'header' ? '2' : '1',
  status: 'published',
  type: type,
  items: type === 'header' ? [
    {
      id: '1',
      type: 'page',
      url: undefined,
      href: `/${siteSlug}/${lang}/`,
      page: {
        id: '1',
        translations: [{ languages_code: lang, permalink: '/' }]
      },
      translations: [{ title: 'Home', languages_code: lang }]
    },
    {
      id: '2',
      type: 'page',
      url: undefined,
      href: `/${siteSlug}/${lang}/about`,
      page: {
        id: '2',
        translations: [{ languages_code: lang, permalink: '/about' }]
      },
      translations: [{ title: 'About', languages_code: lang }]
    }
  ] : [
    {
      id: '3',
      type: 'url',
      url: '#',
      href: '#',
      page: undefined,
      translations: [{ title: 'Privacy', languages_code: lang }]
    }
  ]
})

export const fetchNavigationSafe = async function name(siteSlug: string, lang: string, type: 'header' | 'footer' = 'header'): Promise<Navigation | null> {

  const site = await getSite(siteSlug);
  if (!site) {
    return null;
  }

  // Check if the requested navigation type exists in site's navigation array
  if (!site.navigation) {
    return null;
  }

  return await safeApiCall(async () => {

    const navigation = await directus.request(
      withRevalidate(
        readItems('navigation' as any, {
          filter: {
            site: {
              _eq: site.id
            },
            type: {
              _eq: type
            },
            status: {
              _eq: 'published'
            }
          },
          fields: ['*', 'items.*', 'items.translations.*', 'items.page.*', 'items.page.translations.*'],
          limit: 1
        }),
        60
      )
    ) as Navigation[];

    if (!navigation[0]) {
      return null;
    }

    const directusLang = toDirectusLang(lang);

    const processedItems = (navigation[0].items ?? [])
      .filter((item: NavigationItem | null) => item != null)
      .map((item: NavigationItem) => {
        const matchingTranslation = Array.isArray(item.translations) && item.translations.length > 0
          ? item.translations.find(
              (trans: { languages_code: string }) => trans.languages_code === directusLang
            ) || item.translations[0]
          : undefined;

        return {
          ...item,
          translations: matchingTranslation ? [matchingTranslation] : [],
        };
      });

    return {
      id: navigation[0].id,
      type: navigation[0].type,
      items: processedItems,
      ...(navigation[0].status && { status: navigation[0].status })
    };
  }, getMockNavigation(siteSlug, lang, type), `fetchNavigationSafe(${siteSlug}, ${lang}, ${type})`);
}; 