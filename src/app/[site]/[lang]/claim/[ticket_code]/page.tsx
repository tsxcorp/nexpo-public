import { notFound, redirect } from 'next/navigation'
import { createDirectus, rest, staticToken, readItems, readItem } from '@directus/sdk'
import type { PageProps } from '@/types/next'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import ClaimClient from './ClaimClient'

// Uses admin token on server — ticket_code lookup not public by default
const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

export const metadata = { robots: { index: false } }

export default async function ClaimPage({ params }: PageProps) {
  const { site, lang, ticket_code } = await params as any
  const currentPathname = `/${site}/${lang}/claim/${ticket_code}`

  const [siteData, mainNav, footerNav] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
  ])

  const eventId = (siteData as any)?.event_id as number | undefined
  if (!eventId) notFound()

  // Fetch issued_ticket
  let ticket: any = null
  try {
    const tickets = await adminDirectus.request(
      readItems('issued_tickets' as never, {
        filter: {
          ticket_code: { _eq: ticket_code },
          event_id: { _eq: eventId },
        } as never,
        fields: [
          'id', 'holder_name', 'holder_email', 'status',
          'registration_id', 'ticket_class_id',
        ] as never,
        limit: 1,
      })
    ) as any[]
    ticket = tickets[0]
  } catch (e) {
    console.error('[claim] ticket lookup error', e)
  }
  if (!ticket) notFound()

  // If registration is already claimed (not stub), redirect to insight
  if (ticket.registration_id) {
    try {
      const reg = await adminDirectus.request(
        readItem('registrations' as never, ticket.registration_id as never, {
          fields: ['id', 'is_stub'] as never,
        })
      ) as any
      if (reg && reg.is_stub === false) {
        redirect(`https://insights.nexpo.vn/${ticket.registration_id}`)
      }
    } catch { /* ignore */ }
  }

  // Fetch ticket class form config (preferred over event-level form)
  let ticketClassForm: { id: string; fields: any[] } | null = null
  if (ticket.ticket_class_id) {
    try {
      const tc = await adminDirectus.request(
        readItem('ticket_classes' as never, ticket.ticket_class_id as never, {
          fields: ['form_id'] as never,
        })
      ) as any
      if (tc?.form_id) {
        const fields = await adminDirectus.request(
          readItems('form_fields' as never, {
            filter: { form_id: { _eq: tc.form_id } } as never,
            fields: [
              'id', 'name', 'type', 'is_required', 'is_email_contact', 'is_name_field', 'is_phone_field',
              'translations.languages_code', 'translations.label', 'translations.placeholder', 'translations.options',
            ] as never,
            sort: ['sort'] as never,
            limit: 50,
          })
        ) as any[]
        ticketClassForm = { id: tc.form_id, fields: fields ?? [] }
      }
    } catch { /* no form — claim still works with simple mode */ }
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
        <div className="max-w-lg mx-auto">
          <ClaimClient
            ticket={ticket}
            ticketClassForm={ticketClassForm}
            site={site}
            lang={lang}
            registrationId={ticket.registration_id ?? null}
          />
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
