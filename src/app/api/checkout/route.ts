/**
 * POST /api/checkout
 * Server-side only — uses DIRECTUS_ADMIN_TOKEN, never exposed to client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItem, readItems, createItem, updateItem } from '@directus/sdk'
import { genBadgeId } from '@/lib/utils/genBadgeId'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

export async function POST(req: NextRequest) {
  let orderId: string | undefined
  let tcQuantitySoldBefore: number | undefined
  let ticketClassId: string | undefined

  try {
    const {
      ticket_class_id,
      quantity,
      buyer,
      holders = [],
      site_slug,
      lang = 'vi',
    } = await req.json()

    if (!ticket_class_id || !quantity || !buyer?.name || !buyer?.email || !site_slug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    ticketClassId = ticket_class_id as string

    // ── 1. Fetch site → event_id + tenant_id ──────────────────────────────
    const sites = await adminDirectus.request(
      readItems('sites' as never, {
        filter: { slug: { _eq: site_slug } } as never,
        fields: ['id', 'event_id', 'tenant_id'] as never,
        limit: 1,
      })
    ) as any[]
    if (!sites[0]) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    const { event_id, tenant_id } = sites[0]

    // ── 2. Fetch ticket_class ──────────────────────────────────────────────
    const tc = await adminDirectus.request(
      readItem('ticket_classes' as never, ticket_class_id as never, {
        fields: [
          'id', 'name', 'quantity_total', 'quantity_sold', 'price',
          'currency', 'registration_mode', 'max_per_order', 'event_id',
        ] as never,
      })
    ) as any
    if (tc.event_id !== event_id) {
      return NextResponse.json({ error: 'Invalid ticket class' }, { status: 400 })
    }
    tcQuantitySoldBefore = tc.quantity_sold

    // ── 3. Check inventory ────────────────────────────────────────────────
    if (tc.quantity_total !== -1 && tc.quantity_sold + quantity > tc.quantity_total) {
      return NextResponse.json({ error: 'Sold out' }, { status: 409 })
    }
    if (quantity > tc.max_per_order) {
      return NextResponse.json({ error: 'Exceeds max per order' }, { status: 400 })
    }

    // ── 4. Fetch event for genBadgeId ─────────────────────────────────────
    const event = await adminDirectus.request(
      readItem('events' as never, event_id as never, {
        fields: ['id', 'event_code'] as never,
      })
    ) as any

    // ── 5. Create ticket_order ────────────────────────────────────────────
    const payosOrderCode = Date.now()
    const totalAmount = tc.price * quantity

    const order = await adminDirectus.request(
      createItem('ticket_orders' as never, {
        event_id,
        tenant_id,
        buyer_name: buyer.name,
        buyer_email: buyer.email,
        buyer_phone: buyer.phone ?? null,
        status: 'pending',
        payment_method: totalAmount === 0 ? 'free' : 'payos',
        payos_order_code: payosOrderCode,
        subtotal: totalAmount,
        total_amount: totalAmount,
        currency: tc.currency,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      } as never)
    ) as any
    orderId = order.id

    // ── 6. Create ticket_order_item ───────────────────────────────────────
    const orderItem = await adminDirectus.request(
      createItem('ticket_order_items' as never, {
        order_id: order.id,
        ticket_class_id: tc.id,
        quantity,
        unit_price: tc.price,
        subtotal: totalAmount,
      } as never)
    ) as any
    void orderItem.id

    // ── 7. Issue tickets + create stub registrations ──────────────────────
    const issuedTickets: any[] = []
    for (let i = 0; i < quantity; i++) {
      const ticketCode = genBadgeId(event)
      const holderName = i === 0 ? buyer.name : (holders[i - 1]?.name ?? buyer.name)
      const holderEmail = i === 0 ? buyer.email : (holders[i - 1]?.email ?? null)

      const ticket = await adminDirectus.request(
        createItem('issued_tickets' as never, {
          event_id,
          order_id: order.id,
          order_item_id: orderItem.id,
          ticket_class_id: tc.id,
          ticket_code: ticketCode,
          status: 'issued',
          holder_name: holderName,
          holder_email: holderEmail,
        } as never)
      ) as any

      // Stub registration for check-in
      const stubReg = await adminDirectus.request(
        createItem('registrations' as never, {
          event_id,
          full_name: holderName,
          email: holderEmail ?? buyer.email,
          badge_id: ticketCode,
          ticket_id: ticket.id,
          is_stub: true,
          checkin_status: false,
        } as never)
      ) as any

      await adminDirectus.request(
        updateItem('issued_tickets' as never, ticket.id as never, {
          registration_id: stubReg.id,
        } as never)
      )

      issuedTickets.push({ ...ticket, registration_id: stubReg.id })
    }

    // ── 8. Update quantity_sold ───────────────────────────────────────────
    await adminDirectus.request(
      updateItem('ticket_classes' as never, tc.id as never, {
        quantity_sold: tc.quantity_sold + quantity,
      } as never)
    )

    // ── 9a. Free order ────────────────────────────────────────────────────
    if (totalAmount === 0) {
      await adminDirectus.request(
        updateItem('ticket_orders' as never, order.id as never, {
          status: 'paid',
          paid_at: new Date().toISOString(),
        } as never)
      )

      // Fire-and-forget ticket emails
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
      const servicesUrl = process.env.NEXT_PUBLIC_SERVICES_URL ?? ''
      void sendFreeTicketEmails({
        registrationMode: tc.registration_mode,
        eventName: event.name ?? '',
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        siteSlug: site_slug,
        siteLang: lang,
        baseUrl,
        servicesUrl,
        tickets: issuedTickets.map((t, i) => ({
          ticket_code: t.ticket_code,
          holder_name: t.holder_name,
          holder_email: t.holder_email,
          ticket_class_name: tc.name,
          is_buyer: i === 0,
        })),
      })

      return NextResponse.json({ success: true, order_id: order.id })
    }

    // ── 9b. Paid → create PayOS payment link ─────────────────────────────
    // Lookup: event-level config first, fallback to tenant-level
    const paymentConfigs = await adminDirectus.request(
      readItems('tenant_payment_configs' as never, {
        filter: {
          tenant_id: { _eq: tenant_id },
          provider: { _eq: 'payos' },
          is_active: { _eq: true },
          _or: [
            { event_id: { _eq: event_id } },
            { event_id: { _null: true } },
          ],
        } as never,
        sort: ['-event_id'] as never, // event-scoped first
        limit: 2,
      })
    ) as any[]
    if (!paymentConfigs[0]) {
      return NextResponse.json({ error: 'Payment not configured' }, { status: 503 })
    }

    const config = paymentConfigs[0]
    const creds = config.credentials ?? {}
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PayOS: PayOSClient } = require('@payos/node') as { PayOS: new (opts: Record<string, string>) => { paymentRequests: { create: (data: Record<string, unknown>) => Promise<{ checkoutUrl: string }> } } }
    const payosClient = new PayOSClient({ clientId: creds.client_id, apiKey: creds.api_key, checksumKey: creds.checksum_key })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!
    const description = `Ve ${tc.name ?? 'su kien'}`.slice(0, 25).replace(/[^\w\s]/g, '')
    const { checkoutUrl } = await payosClient.paymentRequests.create({
      orderCode: payosOrderCode,
      amount: totalAmount,
      description,
      returnUrl: `${baseUrl}/${site_slug}/${lang}/checkout/success?order=${order.id}`,
      cancelUrl: `${baseUrl}/${site_slug}/${lang}/checkout/cancel?order=${order.id}`,
    })

    return NextResponse.json({ payment_url: checkoutUrl, order_id: order.id })
  } catch (err: any) {
    console.error('[checkout API] Error:', err)

    // Partial rollback
    try {
      if (orderId) {
        const adminD = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
          .with(rest()).with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))
        await adminD.request(updateItem('ticket_orders' as never, orderId as never, { status: 'cancelled' } as never))
        if (ticketClassId !== undefined && tcQuantitySoldBefore !== undefined) {
          await adminD.request(updateItem('ticket_classes' as never, ticketClassId as never, { quantity_sold: tcQuantitySoldBefore } as never))
        }
      }
    } catch (rollbackErr) {
      console.error('[checkout API] Rollback failed:', rollbackErr)
    }

    const detail = err?.errors?.[0]?.message ?? err?.message ?? String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

// ── Email helpers ──────────────────────────────────────────────────────────

async function sendFreeTicketEmails(params: {
  registrationMode: string
  eventName: string
  buyerName: string
  buyerEmail: string
  siteSlug: string
  siteLang: string
  baseUrl: string
  servicesUrl: string
  tickets: Array<{ ticket_code: string; holder_name: string; holder_email: string | null; ticket_class_name: string; is_buyer: boolean }>
}) {
  const { registrationMode, eventName, buyerName, buyerEmail, siteSlug, siteLang, baseUrl, servicesUrl, tickets } = params

  const sendQR = async (to: string, holderName: string, ticketCode: string, ticketClassName: string) => {
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
        <h2 style="color:#06043E">Your ticket is ready 🎟️</h2>
        <p>Hello <strong>${holderName}</strong>,</p>
        <p>Thank you for registering for <strong>${eventName}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Ticket Type</td><td style="padding:8px">${ticketClassName}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Code</td><td style="padding:8px;font-family:monospace">${ticketCode}</td></tr>
        </table>
        <p>Show the QR code below at check-in.</p>
      </div>`
    await fetch(`${servicesUrl}/send-email-with-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        <a href="${claimUrl}" style="display:inline-block;background:#4F80FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Claim ticket →</a>
        <p style="color:#888;font-size:14px">Link valid for 7 days.</p>
      </div>`
    await fetch(`${servicesUrl}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject: `Claim your ticket — ${eventName}`, html }),
    }).catch(console.error)
  }

  if (registrationMode === 'none') {
    await Promise.all(tickets.map(t => sendQR(t.holder_email ?? buyerEmail, t.holder_name || buyerName, t.ticket_code, t.ticket_class_name)))
  } else if (registrationMode === 'buyer_only') {
    const buyer = tickets.find(t => t.is_buyer)!
    await sendQR(buyerEmail, buyerName, buyer.ticket_code, buyer.ticket_class_name)
    const companions = tickets.filter(t => !t.is_buyer && t.holder_email)
    await Promise.all(companions.map(t => sendClaim(t.holder_email!, t.ticket_code, t.ticket_class_name)))
  } else {
    // per_ticket — send claim to all
    await Promise.all(tickets.filter(t => t.holder_email || t.is_buyer).map(t =>
      sendClaim(t.holder_email ?? buyerEmail, t.ticket_code, t.ticket_class_name)
    ))
  }
}
