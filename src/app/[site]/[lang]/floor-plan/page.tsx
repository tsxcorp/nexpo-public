import type { Metadata } from 'next'
import { getSite } from '@/directus/queries/sites'
import {
  fetchPublishedFloorPlans,
  fetchBoothsForFloorPlans,
  fetchBoothTypesForEvent,
} from '@/directus/queries/floor-plans'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import { initTranslations } from '@/i18n/i18n'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import { FloorPlanViewer } from '@/components/floor-plan/floor-plan-viewer'
import type { PageProps } from '@/types/next'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { site, lang } = await params
  const [siteData, { t }] = await Promise.all([getSite(site), initTranslations(lang)])
  const title = t('floor_plan.page_title')
  return {
    title: siteData?.name ? `${title} — ${siteData.name}` : title,
    robots: { index: true, follow: true },
  }
}

export default async function FloorPlanPage({ params }: PageProps) {
  const { site, lang } = await params
  const currentPathname = `/${site}/${lang}/floor-plan`

  const [siteData, mainNav, footerNav, { t }] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    initTranslations(lang),
  ])

  const eventId = (siteData as any)?.event_id as number | undefined

  // Fetch floor plan data in parallel when eventId is available
  const [floorPlans, boothTypes] = eventId
    ? await Promise.all([
        fetchPublishedFloorPlans(eventId),
        fetchBoothTypesForEvent(eventId),
      ])
    : [[], []]

  // Fetch booths for all published floor plans
  const planIds = floorPlans.map(p => p.id)
  const booths = planIds.length > 0 ? await fetchBoothsForFloorPlans(planIds) : []

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

      <main className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Page header */}
        <div className="shrink-0 px-4 pt-6 pb-4 text-center">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}
          >
            {t('floor_plan.page_title')}
          </h1>
          {floorPlans.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {booths.length} {t('floor_plan.booths_total')}
            </p>
          )}
        </div>

        {/* Interactive viewer — fills remaining height */}
        <div className="flex-1 min-h-0 mx-auto w-full max-w-6xl px-0 sm:px-4 pb-4">
          <div className="h-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <FloorPlanViewer
              floorPlans={floorPlans}
              booths={booths}
              boothTypes={boothTypes}
              lang={lang}
            />
          </div>
        </div>
      </main>

      <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
    </>
  )
}
