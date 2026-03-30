/**
 * POST /api/claim
 * Finalizes a ticket claim: updates stub registration → real registration,
 * optionally saves form_submission + form_answers, sends QR email.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItem, readItems, updateItem, createItem, createItems } from '@directus/sdk'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

interface FormAnswer {
  field: string  // form_field id
  value: string
}

export async function POST(req: NextRequest) {
  try {
    const {
      ticket_id,
      registration_id,
      name,
      email,
      form_id,
      form_answers,
    }: {
      ticket_id: string
      registration_id?: string | null
      name: string
      email: string
      form_id?: string
      form_answers?: FormAnswer[]
    } = await req.json()

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

    // Guard: only allow claiming issued tickets (prevent double-claims)
    if (ticket.status !== 'issued') {
      return NextResponse.json(
        { error: ticket.status === 'used' ? 'Ticket already used' : `Ticket status: ${ticket.status}` },
        { status: 409 }
      )
    }

    const regId = registration_id ?? ticket.registration_id

    // Derive contact from tagged form fields when form_id + form_answers provided
    let derivedName = name
    let derivedEmail = email
    let derivedPhone = ''

    if (form_id && form_answers?.length) {
      try {
        const fields = await adminDirectus.request(
          readItems('form_fields' as never, {
            filter: { form_id: { _eq: form_id } } as never,
            fields: ['id', 'name', 'is_email_contact', 'is_name_field', 'is_phone_field'] as never,
            limit: 50,
          })
        ) as any[]

        const answerMap = Object.fromEntries(form_answers.map(a => [a.field, a.value]))
        const nameFields = fields.filter((f: any) => f.is_name_field)
        if (nameFields.length > 0) {
          const joined = nameFields.map((f: any) => answerMap[f.id] ?? '').filter(Boolean).join(' ')
          if (joined) derivedName = joined
        }
        const emailField = fields.find((f: any) => f.is_email_contact)
        if (emailField) derivedEmail = answerMap[emailField.id] ?? email

        const phoneField = fields.find((f: any) => f.is_phone_field)
        if (phoneField) derivedPhone = answerMap[phoneField.id] ?? ''
      } catch { /* skip tag derivation — use raw name/email */ }
    }

    // Mark stub registration as real
    if (regId) {
      await adminDirectus.request(
        updateItem('registrations' as never, regId as never, {
          full_name: derivedName,
          email: derivedEmail,
          ...(derivedPhone ? { phone: derivedPhone } : {}),
          is_stub: false,
        } as never)
      )
    }

    // Save form submission + answers if provided
    if (form_id && form_answers?.length) {
      try {
        const submission = await adminDirectus.request(
          createItem('form_submissions' as never, {
            form: form_id,
            registration_id: regId,
            event_id: ticket.event_id,
            status: 'submitted',
          } as never)
        ) as any

        if (submission?.id) {
          await adminDirectus.request(
            createItems('form_answers' as never,
              form_answers.map(a => ({
                form_submission_id: submission.id,
                form_field_id: a.field,
                value: a.value ?? '',
              })) as never
            )
          )
        }
      } catch (e) {
        // Non-fatal: registration already updated; log and continue
        console.error('[claim API] form_submission save error:', e)
      }
    }

    // Fetch event name + ticket class name for QR email
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

    // Send QR email (fire-and-forget)
    void sendClaimQREmail({
      to: derivedEmail,
      holderName: derivedName,
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

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function sendClaimQREmail(params: {
  to: string
  holderName: string
  eventName: string
  ticketClassName: string
  ticketCode: string
}) {
  const servicesUrl = process.env.NEXT_PUBLIC_SERVICES_URL ?? ''
  const h = (s: string) => escapeHtml(s)
  const html = `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
      <h2 style="color:#06043E">Your ticket QR code</h2>
      <p>Hello <strong>${h(params.holderName)}</strong>,</p>
      <p>Your ticket for <strong>${h(params.eventName)}</strong> has been confirmed.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Ticket type</td><td style="padding:8px">${h(params.ticketClassName)}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Code</td><td style="padding:8px;font-family:monospace">${h(params.ticketCode)}</td></tr>
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
