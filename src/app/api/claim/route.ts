/**
 * POST /api/claim
 * Finalizes a ticket claim: updates stub registration → real registration,
 * sends QR email, redirects to insight.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItem, updateItem } from '@directus/sdk'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

export async function POST(req: NextRequest) {
  try {
    const { ticket_id, registration_id, name, email, site_slug, lang = 'vi' } = await req.json()

    if (!ticket_id || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch ticket to verify
    const ticket = await adminDirectus.request(
      readItem('issued_tickets' as never, ticket_id as never, {
        fields: ['id', 'status', 'registration_id', 'ticket_code', 'event_id', 'ticket_class_id'] as never,
      })
    ) as any

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const regId = registration_id ?? ticket.registration_id

    // Mark stub registration as real
    if (regId) {
      await adminDirectus.request(
        updateItem('registrations' as never, regId as never, {
          full_name: name,
          email,
          is_stub: false,
        } as never)
      )
    }

    // Fetch event name for email
    let eventName = 'Event'
    let ticketClassName = ''
    try {
      const event = await adminDirectus.request(
        readItem('events' as never, ticket.event_id as never, {
          fields: ['name'] as never,
        })
      ) as any
      eventName = event?.name ?? eventName
    } catch { /* skip */ }

    try {
      const tc = await adminDirectus.request(
        readItem('ticket_classes' as never, ticket.ticket_class_id as never, {
          fields: ['name'] as never,
        })
      ) as any
      ticketClassName = tc?.name ?? ''
    } catch { /* skip */ }

    // Send QR email with registration link_type: 'ticket'
    void sendClaimQREmail({
      to: email,
      holderName: name,
      eventName,
      ticketClassName,
      ticketCode: ticket.ticket_code,
    })

    return NextResponse.json({ success: true, registration_id: regId })
  } catch (err: any) {
    console.error('[claim API] Error:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}

async function sendClaimQREmail(params: {
  to: string
  holderName: string
  eventName: string
  ticketClassName: string
  ticketCode: string
}) {
  const servicesUrl = process.env.NEXT_PUBLIC_SERVICES_URL ?? ''
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
      <h2 style="color:#06043E">Your ticket QR code 🎟️</h2>
      <p>Hello <strong>${params.holderName}</strong>,</p>
      <p>Your ticket for <strong>${params.eventName}</strong> has been confirmed.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Ticket type</td><td style="padding:8px">${params.ticketClassName}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Code</td><td style="padding:8px;font-family:monospace">${params.ticketCode}</td></tr>
      </table>
      <p>Show the QR code below at check-in.</p>
    </div>`
  await fetch(`${servicesUrl}/send-email-with-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_email: 'noreply@nexpo.vn',
      to: params.to,
      subject: `Your ticket — ${params.eventName}`,
      html,
      content_qr: params.ticketCode,
      link_type: 'ticket',
    }),
  }).catch(console.error)
}
