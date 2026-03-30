import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readItems } from '@directus/sdk'
import directus from '@/directus/client'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import type { PageProps } from '@/types/next'
import TicketListingClient from './TicketListingClient'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { site, lang } = await params
  const siteData = await getSite(site)
  const title = lang === 'vi' ? 'Mua vé' : 'Get Tickets'
  return {
    title: siteData?.name ? `${title} — ${siteData.name}` : title,
    robots: { index: false, follow: false },
  }
}

export default async function TicketsPage({ params }: PageProps) {
  const { site, lang } = await params
  const currentPathname = `/${site}/${lang}/tickets`

  const [siteData, mainNav, footerNav] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
  ])

  const eventId = (siteData as any)?.event_id as number | undefined
  if (!eventId) notFound()

  // Fetch published ticket classes for this event
  let ticketClasses: any[] = []
  try {
    const now = new Date().toISOString()
    ticketClasses = await directus.request(
      readItems('ticket_classes' as never, {
        filter: {
          event_id: { _eq: eventId },
          status: { _eq: 'published' },
          _or: [
            { sale_start_at: { _null: true } },
            { sale_start_at: { _lte: now } },
          ],
          _and: [
            {
              _or: [
                { sale_end_at: { _null: true } },
                { sale_end_at: { _gte: now } },
              ],
            },
          ],
        } as any,
        fields: [
          'id', 'name', 'description', 'price', 'currency',
          'quantity_total', 'quantity_sold', 'max_per_order',
          'registration_mode', 'sale_start_at', 'sale_end_at',
        ] as any,
        sort: ['sort', 'date_created'] as any,
        limit: 50,
      })
    ) as any[]
  } catch (e) {
    console.error('[tickets] Failed to fetch ticket_classes', e)
  }

  const t = {
    title: lang === 'vi' ? 'Vé tham dự' : 'Event Tickets',
    subtitle: lang === 'vi' ? 'Chọn loại vé phù hợp với bạn' : 'Choose the ticket that fits you',
    empty: lang === 'vi' ? 'Chưa có vé nào đang mở bán.' : 'No tickets are currently available.',
    buyNow: lang === 'vi' ? 'Mua ngay' : 'Buy Now',
    soldOut: lang === 'vi' ? 'Hết vé' : 'Sold Out',
    free: lang === 'vi' ? 'Miễn phí' : 'Free',
    remaining: lang === 'vi' ? 'còn lại' : 'remaining',
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
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--color-primary)' }}>
            {t.title}
          </h1>
          <p className="text-center text-gray-500 mb-10">{t.subtitle}</p>

          {ticketClasses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">{t.empty}</div>
          ) : (
            <TicketListingClient
              ticketClasses={ticketClasses}
              site={site}
              lang={lang}
              t={t}
            />
          )}
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
