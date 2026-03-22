import type { Metadata } from 'next'
import { getSite } from '@/directus/queries/sites'
import { fetchAgendaSessions, fetchAgendaTracks } from '@/directus/queries/agenda'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import AgendaClient from './AgendaClient'
import type { PageProps } from '@/types/next'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { site, lang } = await params
  const siteData = await getSite(site)
  const title = lang === 'vi' ? 'Lịch chương trình' : 'Agenda'
  return {
    title: siteData?.name ? `${title} — ${siteData.name}` : title,
    robots: { index: true, follow: true },
  }
}

export default async function AgendaPage({ params }: PageProps) {
  const { site, lang } = await params
  const currentPathname = `/${site}/${lang}/agenda`

  const [siteData, mainNav, footerNav] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
  ])

  const eventId = (siteData as any)?.event_id as number | undefined
  const [sessions, tracks] = eventId
    ? await Promise.all([fetchAgendaSessions(eventId), fetchAgendaTracks(eventId)])
    : [[], []]

  const t =
    lang === 'vi'
      ? { page_title: 'Lịch chương trình', all_days: 'Tất cả ngày', day: 'Ngày', all_tracks: 'Tất cả track', no_sessions: 'Chưa có lịch chương trình' }
      : { page_title: 'Agenda', all_days: 'All days', day: 'Day', all_tracks: 'All tracks', no_sessions: 'No sessions scheduled' }

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
              {t.page_title}
            </h1>
            {sessions.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {sessions.length} {lang === 'vi' ? 'phiên' : 'sessions'}
              </p>
            )}
          </div>

          <AgendaClient sessions={sessions} tracks={tracks} lang={lang} t={t} />
        </div>
      </main>

      <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
    </>
  )
}
