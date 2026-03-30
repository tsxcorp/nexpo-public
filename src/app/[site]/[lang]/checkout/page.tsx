import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import type { PageProps } from '@/types/next'
import CheckoutClient from './CheckoutClient'
import { createDirectus, rest, staticToken, readItem } from '@directus/sdk'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

const serverDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

async function fetchTicketClass(classId: string) {
  try {
    return await serverDirectus.request(readItem('ticket_classes' as never, classId as never, {
      fields: [
        'id', 'name', 'price', 'currency', 'quantity_total',
        'quantity_sold', 'max_per_order', 'registration_mode', 'event_id',
        'form_id', 'form_timing',
      ] as never,
    })) as any
  } catch {
    return null
  }
}

/** Fetch form by ID with fields for checkout rendering. */
async function fetchFormById(formId: string) {
  try {
    const { readItems } = await import('@directus/sdk')
    const fields = await serverDirectus.request(readItems('form_fields' as never, {
      filter: { form_id: { _eq: formId } } as never,
      fields: ['id', 'name', 'type', 'is_required', 'is_email_contact', 'is_name_field', 'is_phone_field', 'translations.languages_code', 'translations.label', 'translations.placeholder', 'translations.options'] as never,
      sort: ['sort'] as never,
      limit: 50,
    })) as any[]
    return { id: formId, fields }
  } catch {
    return null
  }
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { site, lang } = await params
  const sp = await searchParams
  const classId = typeof sp.class === 'string' ? sp.class : ''
  const currentPathname = `/${site}/${lang}/checkout`

  const [siteData, mainNav, footerNav, ticketClass] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    classId ? fetchTicketClass(classId) : Promise.resolve(null),
  ])

  // Gate: check has_ticketing on the event (covers both cart + legacy modes)
  const eventIdForGate = ticketClass?.event_id ?? (siteData as any)?.event_id
  if (eventIdForGate) {
    try {
      const event = await serverDirectus.request(
        readItem('events' as never, eventIdForGate as never, { fields: ['has_ticketing'] as never })
      ) as any
      if (!event?.has_ticketing) notFound()
    } catch {
      notFound()
    }
  }

  // Fetch form if ticket class has form_id configured with during_checkout timing
  const showFormDuringCheckout = ticketClass?.form_timing === 'during_checkout' || ticketClass?.registration_mode === 'buyer_only'
  const registrationForm = showFormDuringCheckout && ticketClass?.form_id
    ? await fetchFormById(ticketClass.form_id)
    : null

  const title = lang === 'vi' ? 'Đặt vé' : 'Checkout'

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
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--color-primary)' }}>
            {title}
          </h1>
          <Suspense fallback={
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            </div>
          }>
            <CheckoutClient site={site} lang={lang} initialTicketClass={ticketClass} registrationForm={registrationForm} />
          </Suspense>
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
