/**
 * Sponsor detail page — /[site]/[lang]/sponsors/[id]
 * RSC: fetches a single sponsor_event with full sponsor + tier data.
 * ISR revalidation: 300s (5 min).
 */
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSite } from '@/directus/queries/sites'
import { fetchSponsorDetail } from '@/directus/queries/sponsors'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import { initTranslations } from '@/i18n/i18n'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import { findTranslation } from '@/lib/utils/translation-helpers'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import type { PageProps } from '@/types/next'

type DetailPageProps = {
  params: Promise<{ site: string; lang: string; id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { id, lang } = await params
  const sponsorEvent = await fetchSponsorDetail(id)
  const translation = findTranslation(sponsorEvent?.sponsor_id?.translations, lang)
  const companyName = translation?.company_name ?? 'Sponsor'
  return {
    title: `${companyName} | Sponsors`,
    robots: { index: true, follow: true },
  }
}

export default async function SponsorDetailPage({ params }: DetailPageProps) {
  const { site, lang, id } = await params

  const [siteData, mainNav, footerNav, { t }, sponsorEvent] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    initTranslations(lang),
    fetchSponsorDetail(id),
  ])

  if (!sponsorEvent) notFound()

  const sp = sponsorEvent.sponsor_id
  const tier = sponsorEvent.sponsor_tier_id

  const sponsorTranslation = findTranslation(sp?.translations, lang)
  const tierTranslation = findTranslation(tier?.translations, lang)

  const companyName = sponsorTranslation?.company_name ?? '—'
  const description = sponsorTranslation?.company_description
  const tierName = tierTranslation?.name ?? tier?.id ?? ''
  const tierColor = tier?.color ?? 'var(--color-primary)'

  const logoUrl = sp?.logo
    ? getDirectusMedia(typeof sp.logo === 'string' ? sp.logo : (sp.logo as { id: string })?.id)
    : null

  const boothNumber = sponsorEvent.exhibitor_event_id?.booth_number
  const sponsorsListPath = `/${site}/${lang}/sponsors`
  const exhibitorsPath = `/${site}/${lang}/exhibitors`
  const currentPathname = `${sponsorsListPath}/${id}`

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back link */}
          <Link
            href={sponsorsListPath}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
          >
            ← {t('sponsors.back_to_list')}
          </Link>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-48 h-48 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={companyName}
                    width={192}
                    height={192}
                    className="w-full h-full object-contain p-4"
                    priority
                  />
                ) : (
                  <span className="text-6xl font-bold text-gray-200">
                    {companyName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Company name */}
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-3">
              {companyName}
            </h1>

            {/* Tier badge */}
            {tierName && (
              <div className="flex justify-center mb-6">
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full text-white"
                  style={{ backgroundColor: tierColor }}
                >
                  <span
                    className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {tierName}
                </span>
              </div>
            )}

            {/* Featured indicator */}
            {sponsorEvent.is_featured && (
              <div className="flex justify-center mb-4">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  ★ Featured Sponsor
                </span>
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-gray-600 text-sm leading-relaxed text-center max-w-xl mx-auto mb-8">
                {description}
              </p>
            )}

            {/* Action links */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {sp?.website && (
                <a
                  href={sp.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {t('sponsors.visit_website')} ↗
                </a>
              )}

              {boothNumber && (
                <Link
                  href={exhibitorsPath}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('sponsors.visit_booth')} {boothNumber}
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
    </>
  )
}
