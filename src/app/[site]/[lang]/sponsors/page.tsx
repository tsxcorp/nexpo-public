/**
 * Sponsors list page — /[site]/[lang]/sponsors
 * RSC: fetches sponsor_events grouped by tier, renders a grid per tier.
 * ISR revalidation: 300s (5 min).
 */
import type { Metadata } from 'next'
import { getSite } from '@/directus/queries/sites'
import { fetchSponsors, groupSponsorsByTier } from '@/directus/queries/sponsors'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import { initTranslations } from '@/i18n/i18n'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import SponsorGrid from '@/components/sponsors/sponsor-grid'
import type { PageProps } from '@/types/next'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { site, lang } = await params
  const [siteData, { t }] = await Promise.all([getSite(site), initTranslations(lang)])
  const title = t('sponsors.page_title')
  return {
    title: siteData?.name ? `${title} — ${siteData.name}` : title,
    robots: { index: true, follow: true },
  }
}

export default async function SponsorsPage({ params }: PageProps) {
  const { site, lang } = await params
  const currentPathname = `/${site}/${lang}/sponsors`

  const [siteData, mainNav, footerNav, { t }] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    initTranslations(lang),
  ])

  const eventId = (siteData as { event_id?: number } | null)?.event_id
  const sponsors = eventId ? await fetchSponsors(eventId) : []
  const tierGroups = groupSponsorsByTier(sponsors)

  return (
    <>
      <TheHeader
        navigation={mainNav}
        lang={lang}
        site={siteData?.slug ?? site}
        siteData={siteData}
        translations={[]}
        pathname={currentPathname}
      />

      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page heading */}
          <div className="mb-10 text-center">
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}
            >
              {t('sponsors.page_title')}
            </h1>
            {sponsors.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {sponsors.length} {t('sponsors.sponsors_count')}
              </p>
            )}
          </div>

          {/* Tier groups */}
          {tierGroups.length > 0 ? (
            tierGroups.map(({ tier, items }) =>
              tier ? (
                <SponsorGrid
                  key={tier.id}
                  tier={tier}
                  sponsors={items}
                  lang={lang}
                  basePath={currentPathname}
                />
              ) : null
            )
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">{t('sponsors.no_sponsors')}</p>
            </div>
          )}
        </div>
      </main>

      <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
    </>
  )
}
