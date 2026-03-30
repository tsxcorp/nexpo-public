/**
 * POST /api/checkout
 * Multi-class cart checkout. Accepts items[] array or legacy single-class format.
 * Server-side only — uses DIRECTUS_ADMIN_TOKEN.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItem, readItems, createItem, updateItem } from '@directus/sdk'
import { genBadgeId } from '@/lib/utils/genBadgeId'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

interface CheckoutItem { ticket_class_id: string; quantity: number }

export async function POST(req: NextRequest) {
  let orderId: string | undefined
  const rollbackClasses: Array<{ id: string; previousSold: number }> = []

  try {
    const body = await req.json()
    const { buyer, holders = [], site_slug, lang = 'vi', registration_form_id, buyer_form_answers } = body

    // Normalize: items[] array or legacy single-class format
    let items: CheckoutItem[] = body.items
    if (!items && body.ticket_class_id) {
      items = [{ ticket_class_id: body.ticket_class_id, quantity: body.quantity }]
    }

    if (!items?.length || !buyer?.name || !buyer?.email || !site_slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── 1. Fetch site → event_id + tenant_id ──
    const sites = await adminDirectus.request(
      readItems('sites' as never, {
        filter: { slug: { _eq: site_slug } } as never,
        fields: ['id', 'event_id', 'tenant_id'] as never,
        limit: 1,
      })
    ) as any[]
    if (!sites[0]) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    const { event_id, tenant_id } = sites[0]

    // ── 2. Fetch + validate all ticket classes ──
    const classData: any[] = []
    for (const item of items) {
      const tc = await adminDirectus.request(
        readItem('ticket_classes' as never, item.ticket_class_id as never, {
          fields: ['id', 'name', 'quantity_total', 'quantity_sold', 'price', 'currency', 'registration_mode', 'max_per_order', 'event_id', 'is_addon', 'requires_class_ids'] as never,
        })
      ) as any

      if (tc.event_id !== event_id) {
        return NextResponse.json({ error: `Invalid ticket class: ${tc.name}` }, { status: 400 })
      }
      if (tc.quantity_total !== -1 && tc.quantity_sold + item.quantity > tc.quantity_total) {
        return NextResponse.json({ error: `Sold out: ${tc.name}` }, { status: 409 })
      }
      if (item.quantity > tc.max_per_order) {
        return NextResponse.json({ error: `Exceeds max per order: ${tc.name}` }, { status: 400 })
      }
      classData.push({ ...tc, requestedQty: item.quantity })
    }

    // ── 2b. Validate addon requirements ──
    const mainClassIds = new Set(classData.filter((tc: any) => !tc.is_addon).map((tc: any) => tc.id))
    for (const tc of classData) {
      if (!tc.is_addon) continue
      const requiredIds = tc.requires_class_ids as string[] | null
      if (requiredIds?.length) {
        if (!requiredIds.some((id: string) => mainClassIds.has(id))) {
          return NextResponse.json({ error: `Add-on "${tc.name}" requires a qualifying parent ticket` }, { status: 400 })
        }
      } else if (mainClassIds.size === 0) {
        return NextResponse.json({ error: `Add-on "${tc.name}" requires a main ticket` }, { status: 400 })
      }
    }

    // ── 3. Fetch event for genBadgeId ──
    const event = await adminDirectus.request(
      readItem('events' as never, event_id as never, { fields: ['id', 'event_code', 'name'] as never })
    ) as any

    // ── 4. Calculate totals ──
    const totalAmount = classData.reduce((sum, tc) => sum + Number(tc.price) * tc.requestedQty, 0)
    const currency = classData[0]?.currency ?? 'VND'
    const payosOrderCode = Date.now()

    // ── 5. Create ticket_order ──
    const order = await adminDirectus.request(
      createItem('ticket_orders' as never, {
        event_id, tenant_id,
        buyer_name: buyer.name, buyer_email: buyer.email, buyer_phone: buyer.phone ?? null,
        status: 'pending',
        payment_method: totalAmount === 0 ? 'free' : 'payos',
        payos_order_code: payosOrderCode,
        subtotal: totalAmount, total_amount: totalAmount, currency,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      } as never)
    ) as any
    orderId = order.id

    // ── 6. Create order_items + tickets + stubs per class ──
    const allIssuedTickets: any[] = []
    let holderIdx = 0 // global holder index across all classes

    for (const tc of classData) {
      const itemSubtotal = Number(tc.price) * tc.requestedQty
      const orderItem = await adminDirectus.request(
        createItem('ticket_order_items' as never, {
          order_id: order.id, ticket_class_id: tc.id,
          quantity: tc.requestedQty, unit_price: tc.price, subtotal: itemSubtotal,
        } as never)
      ) as any

      for (let i = 0; i < tc.requestedQty; i++) {
        const isFirstTicketOverall = allIssuedTickets.length === 0
        const holderName = isFirstTicketOverall ? buyer.name : (holders[holderIdx - 1]?.name ?? buyer.name)
        const holderEmail = isFirstTicketOverall ? buyer.email : (holders[holderIdx - 1]?.email ?? null)

        const ticketCode = genBadgeId(event)
        const ticket = await adminDirectus.request(
          createItem('issued_tickets' as never, {
            event_id, order_id: order.id, order_item_id: orderItem.id,
            ticket_class_id: tc.id, ticket_code: ticketCode,
            status: totalAmount === 0 ? 'issued' : 'reserved',
            holder_name: holderName, holder_email: holderEmail,
          } as never)
        ) as any

        const stubReg = await adminDirectus.request(
          createItem('registrations' as never, {
            event_id, full_name: holderName, email: holderEmail ?? buyer.email,
            phone_number: isFirstTicketOverall ? (buyer.phone || null) : null,
            badge_id: ticketCode, ticket_id: ticket.id, is_stub: true, checkin_status: false,
          } as never)
        ) as any

        await adminDirectus.request(
          updateItem('issued_tickets' as never, ticket.id as never, { registration_id: stubReg.id } as never)
        )

        // buyer_only: upgrade buyer stub with form data (single-class only, first ticket)
        if (isFirstTicketOverall && registration_form_id && buyer_form_answers?.length) {
          const submission = await adminDirectus.request(
            createItem('form_submissions' as never, {
              form: registration_form_id, answers: buyer_form_answers,
              status: 'published', registration_id: stubReg.id,
              date_sumitted: new Date().toISOString(),
            } as never)
          ) as any
          await adminDirectus.request(
            updateItem('registrations' as never, stubReg.id as never, { is_stub: false, form_submission_id: submission.id } as never)
          )
        }

        allIssuedTickets.push({ ...ticket, registration_id: stubReg.id, ticket_class_name: tc.name })
        holderIdx++
      }

      // Update quantity_sold for this class
      rollbackClasses.push({ id: tc.id, previousSold: tc.quantity_sold })
      await adminDirectus.request(
        updateItem('ticket_classes' as never, tc.id as never, { quantity_sold: tc.quantity_sold + tc.requestedQty } as never)
      )
    }

    // ── 7a. Free order ──
    if (totalAmount === 0) {
      await adminDirectus.request(
        updateItem('ticket_orders' as never, order.id as never, { status: 'paid', paid_at: new Date().toISOString() } as never)
      )

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
      const servicesUrl = process.env.NEXT_PUBLIC_SERVICES_URL ?? ''
      // For multi-class free orders, use 'none' mode (send QR to all)
      const regMode = classData.length === 1 ? classData[0].registration_mode : 'none'
      void sendFreeTicketEmails({
        registrationMode: regMode, eventName: event.name ?? '',
        buyerName: buyer.name, buyerEmail: buyer.email,
        siteSlug: site_slug, siteLang: lang, baseUrl, servicesUrl,
        tickets: allIssuedTickets.map((t, i) => ({
          ticket_code: t.ticket_code, holder_name: t.holder_name,
          holder_email: t.holder_email, ticket_class_name: t.ticket_class_name,
          is_buyer: i === 0,
        })),
      })
      return NextResponse.json({ success: true, order_id: order.id })
    }

    // ── 7b. Paid → PayOS ──
    const paymentConfigs = await adminDirectus.request(
      readItems('tenant_payment_configs' as never, {
        filter: {
          tenant_id: { _eq: tenant_id }, provider: { _eq: 'payos' }, is_active: { _eq: true },
          _or: [{ event_id: { _eq: event_id } }, { event_id: { _null: true } }],
        } as never,
        sort: ['-event_id'] as never,
        limit: 2,
      })
    ) as any[]
    if (!paymentConfigs[0]) {
      return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
    }

    const creds = paymentConfigs[0].credentials ?? {}
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PayOS: PayOSClient } = require('@payos/node') as { PayOS: new (opts: Record<string, string>) => { paymentRequests: { create: (data: Record<string, unknown>) => Promise<{ checkoutUrl: string }> } } }
    const payosClient = new PayOSClient({ clientId: creds.client_id, apiKey: creds.api_key, checksumKey: creds.checksum_key })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!
    const description = `Order ${payosOrderCode}`.slice(0, 25)

    const { checkoutUrl } = await payosClient.paymentRequests.create({
      orderCode: payosOrderCode, amount: totalAmount, description,
      returnUrl: `${baseUrl}/${site_slug}/${lang}/checkout/success?order=${order.id}`,
      cancelUrl: `${baseUrl}/${site_slug}/${lang}/checkout/cancel?order=${order.id}`,
    })

    return NextResponse.json({ payment_url: checkoutUrl, order_id: order.id })
  } catch (err: any) {
    console.error('[checkout API] Error:', err)

    // Partial rollback
    try {
      if (orderId) {
        await adminDirectus.request(updateItem('ticket_orders' as never, orderId as never, { status: 'cancelled' } as never))
      }
      for (const rc of rollbackClasses) {
        await adminDirectus.request(updateItem('ticket_classes' as never, rc.id as never, { quantity_sold: rc.previousSold } as never))
      }
    } catch (rollbackErr) {
      console.error('[checkout API] Rollback failed:', rollbackErr)
    }

    const detail = err?.errors?.[0]?.message ?? err?.message ?? String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

// ── Email helpers ──

async function sendFreeTicketEmails(params: {
  registrationMode: string; eventName: string; buyerName: string; buyerEmail: string
  siteSlug: string; siteLang: string; baseUrl: string; servicesUrl: string
  tickets: Array<{ ticket_code: string; holder_name: string; holder_email: string | null; ticket_class_name: string; is_buyer: boolean }>
}) {
  const { registrationMode, eventName, buyerName, buyerEmail, siteSlug, siteLang, baseUrl, servicesUrl, tickets } = params

  const sendQR = async (to: string, holderName: string, ticketCode: string, ticketClassName: string) => {
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
        <h2 style="color:#06043E">Your ticket is ready</h2>
        <p>Hello <strong>${holderName}</strong>,</p>
        <p>Thank you for registering for <strong>${eventName}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Ticket Type</td><td style="padding:8px">${ticketClassName}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Code</td><td style="padding:8px;font-family:monospace">${ticketCode}</td></tr>
        </table>
        <p>Show the QR code below at check-in.</p>
      </div>`
    await fetch(`${servicesUrl}/send-email-with-qr`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_email: 'noreply@nexpo.vn', to, subject: `Your ticket — ${eventName}`, html, content_qr: ticketCode, link_type: 'ticket' }),
    }).catch(console.error)
  }

  const sendClaim = async (to: string, ticketCode: string, ticketClassName: string) => {
    const claimUrl = `${baseUrl}/${siteSlug}/${siteLang}/claim/${ticketCode}`
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
        <h2 style="color:#06043E">Complete your ticket registration</h2>
        <p>You have been issued a ticket for <strong>${eventName}</strong>.</p>
        <p>Ticket type: <strong>${ticketClassName}</strong></p>
        <p>Click the link below to fill in your details and receive your QR code:</p>
        <a href="${claimUrl}" style="display:inline-block;background:#4F80FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Claim ticket</a>
        <p style="color:#888;font-size:14px">Link valid for 7 days.</p>
      </div>`
    await fetch(`${servicesUrl}/send-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject: `Claim your ticket — ${eventName}`, html }),
    }).catch(console.error)
  }

  if (registrationMode === 'none') {
    await Promise.all(tickets.map(t => sendQR(t.holder_email ?? buyerEmail, t.holder_name || buyerName, t.ticket_code, t.ticket_class_name)))
  } else if (registrationMode === 'buyer_only') {
    const buyerTicket = tickets.find(t => t.is_buyer)!
    await sendQR(buyerEmail, buyerName, buyerTicket.ticket_code, buyerTicket.ticket_class_name)
    const companions = tickets.filter(t => !t.is_buyer && t.holder_email)
    await Promise.all(companions.map(t => sendClaim(t.holder_email!, t.ticket_code, t.ticket_class_name)))
  } else {
    await Promise.all(tickets.filter(t => t.holder_email || t.is_buyer).map(t =>
      sendClaim(t.holder_email ?? buyerEmail, t.ticket_code, t.ticket_class_name)
    ))
  }
}
