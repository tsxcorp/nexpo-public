import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSite } from '@/directus/queries/sites'
import { fetchExhibitors } from '@/directus/queries/exhibitors'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import { initTranslations } from '@/i18n/i18n'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import ExhibitorsClient from './ExhibitorsClient'
import type { PageProps } from '@/types/next'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { site, lang } = await params
  const [siteData, { t }] = await Promise.all([getSite(site), initTranslations(lang)])
  const title = t('exhibitors.page_title')
  return {
    title: siteData?.name ? `${title} — ${siteData.name}` : title,
    robots: { index: true, follow: true },
  }
}

export default async function ExhibitorsPage({ params }: PageProps) {
  const { site, lang } = await params
  const currentPathname = `/${site}/${lang}/exhibitors`

  const [siteData, mainNav, footerNav, { t }] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    initTranslations(lang),
  ])

  const eventId = (siteData as any)?.event_id as number | undefined
  const exhibitors = eventId ? await fetchExhibitors(eventId) : []

  const tProp = {
    page_title: t('exhibitors.page_title'),
    search_placeholder: t('exhibitors.search_placeholder'),
    filter_all: t('exhibitors.filter_all'),
    no_results: t('exhibitors.no_results'),
  }

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
          <div className="mb-10 text-center">
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}
            >
              {tProp.page_title}
            </h1>
            {exhibitors.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {exhibitors.length} {t('exhibitors.participants')}
              </p>
            )}
          </div>

          <ExhibitorsClient exhibitors={exhibitors} lang={lang} t={tProp} />
        </div>
      </main>

      <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
    </>
  )
}
