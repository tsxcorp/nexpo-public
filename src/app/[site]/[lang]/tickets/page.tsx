import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readItem, readItems } from '@directus/sdk'
import directus from '@/directus/client'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import { initTranslations } from '@/i18n/i18n'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import type { PageProps } from '@/types/next'
import TicketListingClient from './TicketListingClient'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { site, lang } = await params
  const [siteData, { t }] = await Promise.all([getSite(site), initTranslations(lang)])
  const title = t('tickets.title')
  return {
    title: siteData?.name ? `${title} — ${siteData.name}` : title,
    robots: { index: false, follow: false },
  }
}

export default async function TicketsPage({ params }: PageProps) {
  const { site, lang } = await params
  const currentPathname = `/${site}/${lang}/tickets`

  const [siteData, mainNav, footerNav, { t }] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    initTranslations(lang),
  ])

  const eventId = (siteData as any)?.event_id as number | undefined
  if (!eventId) notFound()

  // Gate: check has_ticketing + fetch tenant currencies
  let supportedCurrencies: string[] = ['VND']
  let defaultCurrency = 'VND'
  try {
    const event = await directus.request(
      readItem('events' as never, eventId as never, { fields: ['has_ticketing', 'tenant_id'] as never })
    ) as any
    if (!event?.has_ticketing) notFound()

    // Fetch tenant supported currencies
    if (event.tenant_id) {
      const tenant = await directus.request(
        readItem('tenants' as never, event.tenant_id as never, { fields: ['supported_currencies'] as never })
      ) as any
      if (tenant?.supported_currencies?.length) {
        supportedCurrencies = tenant.supported_currencies
        defaultCurrency = supportedCurrencies[0]
      }
    }
  } catch {
    notFound()
  }

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
          'id', 'name', 'description', 'price', 'currency', 'prices',
          'quantity_total', 'quantity_sold', 'max_per_order',
          'registration_mode', 'sale_start_at', 'sale_end_at',
          'is_addon', 'requires_class_ids', 'addon_max_per_parent',
          'benefits.id', 'benefits.label', 'benefits.benefit_type',
        ] as any,
        sort: ['sort', 'date_created'] as any,
        limit: 50,
      })
    ) as any[]
  } catch (e) {
    console.error('[tickets] Failed to fetch ticket_classes', e)
  }

  // Pass server-translated strings to the client component via the `t` prop
  const tProp = {
    title: t('tickets.title'),
    subtitle: t('tickets.subtitle'),
    empty: t('tickets.empty'),
    buyNow: t('tickets.buy_now'),
    soldOut: t('tickets.sold_out'),
    free: t('tickets.free'),
    remaining: t('tickets.remaining'),
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
            {tProp.title}
          </h1>
          <p className="text-center text-gray-500 mb-10">{tProp.subtitle}</p>

          {ticketClasses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">{tProp.empty}</div>
          ) : (
            <TicketListingClient
              ticketClasses={ticketClasses}
              site={site}
              lang={lang}
              t={tProp}
              supportedCurrencies={supportedCurrencies}
              defaultCurrency={defaultCurrency}
            />
          )}
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
