/**
 * POST /api/webhook/payos
 * PayOS calls this server-to-server after payment outcome.
 * Must always return HTTP 200.
 */

import { createDirectus, rest, staticToken, readItems, readItem, updateItem } from '@directus/sdk'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('OK') // malformed body — PayOS still expects 200
  }

  try {
    // ── 1. Locate order by payos_order_code ─────────────────────────────
    const orderCode = body?.data?.orderCode
    if (!orderCode) return new Response('OK')

    const orders = await adminDirectus.request(
      readItems('ticket_orders' as never, {
        filter: { payos_order_code: { _eq: orderCode } } as never,
        fields: ['id', 'tenant_id', 'total_amount', 'status', 'buyer_email', 'buyer_name', 'event_id'] as never,
        limit: 1,
      })
    ) as any[]
    const order = orders[0]
    if (!order) return new Response('OK')

    // ── 2. Verify PayOS signature ────────────────────────────────────────
    // Lookup: event-level config first, fallback to tenant-level
    const configs = await adminDirectus.request(
      readItems('tenant_payment_configs' as never, {
        filter: {
          tenant_id: { _eq: order.tenant_id },
          provider: { _eq: 'payos' },
          _or: [
            { event_id: { _eq: order.event_id } },
            { event_id: { _null: true } },
          ],
        } as never,
        sort: ['-event_id'] as never, // event-scoped first
        limit: 2,
      })
    ) as any[]
    if (!configs[0]) return new Response('OK')

    const creds = configs[0].credentials ?? {}
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PayOS: PayOSClient } = require('@payos/node') as { PayOS: new (opts: Record<string, string>) => { webhooks: { verify: (data: unknown) => Promise<void> } } }
    const payosClient = new PayOSClient({ clientId: creds.client_id, apiKey: creds.api_key, checksumKey: creds.checksum_key })

    try {
      await payosClient.webhooks.verify(body)
    } catch {
      // Invalid signature — silently ignore
      return new Response('OK')
    }

    // ── 3. Idempotency ───────────────────────────────────────────────────
    if (order.status === 'paid') return new Response('OK')

    // ── 4a. Payment successful ───────────────────────────────────────────
    if (body.code === '00') {
      await adminDirectus.request(
        updateItem('ticket_orders' as never, order.id as never, {
          status: 'paid',
          payment_ref: body.data?.paymentLinkId ?? null,
          paid_at: new Date().toISOString(),
        } as never)
      )

      // Upgrade all reserved tickets to issued
      const orderTickets = await adminDirectus.request(
        readItems('issued_tickets' as never, {
          filter: { order_id: { _eq: order.id }, status: { _eq: 'reserved' } } as never,
          fields: ['id'] as never,
          limit: 200,
        })
      ) as any[]
      for (const t of orderTickets) {
        await adminDirectus.request(
          updateItem('issued_tickets' as never, t.id as never, { status: 'issued' } as never)
        )
      }

      // Fire and forget post-payment notifications
      void triggerPostPaymentFlow(order)
      return new Response('OK')
    }

    // ── 4b. Cancelled / failed ───────────────────────────────────────────
    if (order.status === 'pending') {
      // Rollback quantity_sold
      const items = await adminDirectus.request(
        readItems('ticket_order_items' as never, {
          filter: { order_id: { _eq: order.id } } as never,
          fields: ['ticket_class_id', 'quantity'] as never,
        })
      ) as any[]

      for (const item of items) {
        const tc = await adminDirectus.request(
          readItem('ticket_classes' as never, item.ticket_class_id as never, {
            fields: ['quantity_sold'] as never,
          })
        ) as any
        await adminDirectus.request(
          updateItem('ticket_classes' as never, item.ticket_class_id as never, {
            quantity_sold: Math.max(0, tc.quantity_sold - item.quantity),
          } as never)
        )
      }

      await adminDirectus.request(
        updateItem('ticket_orders' as never, order.id as never, { status: 'cancelled' } as never)
      )

      // Send failure email
      void sendPaymentFailedEmail(order)
    }
  } catch (err) {
    console.error('[webhook/payos] Error:', err)
  }

  return new Response('OK')
}

async function triggerPostPaymentFlow(order: any) {
  try {
    const servicesUrl = process.env.NEXT_PUBLIC_SERVICES_URL ?? ''
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    // Fetch issued tickets for this order
    const issuedTickets = await adminDirectus.request(
      readItems('issued_tickets' as never, {
        filter: { order_id: { _eq: order.id } } as never,
        fields: [
          'id', 'ticket_code', 'holder_name', 'holder_email', 'status',
          'ticket_class_id.id', 'ticket_class_id.name', 'ticket_class_id.registration_mode',
        ] as never,
        limit: 100,
      })
    ) as any[]

    if (!issuedTickets.length) return

    // Fetch event name
    const event = await adminDirectus.request(
      readItem('events' as never, order.event_id as never, { fields: ['id', 'name'] as never })
    ) as any

    // Fetch site slug for claim links
    const sites = await adminDirectus.request(
      readItems('sites' as never, {
        filter: { event_id: { _eq: order.event_id } } as never,
        fields: ['slug', 'lang'] as never,
        limit: 1,
      })
    ) as any[]
    const siteSlug = sites[0]?.slug ?? ''
    const lang = sites[0]?.lang ?? 'vi'

    const registrationMode = issuedTickets[0]?.ticket_class_id?.registration_mode ?? 'none'
    const eventName = event?.name ?? 'Sự kiện'

    const sendQR = async (to: string, holderName: string, ticketCode: string, ticketClassName: string) => {
      const html = `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
          <h2 style="color:#06043E">Vé của bạn đã sẵn sàng 🎟️</h2>
          <p>Xin chào <strong>${holderName}</strong>,</p>
          <p>Cảm ơn bạn đã mua vé cho <strong>${eventName}</strong>.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Loại vé</td><td style="padding:8px">${ticketClassName}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:600">Mã vé</td><td style="padding:8px;font-family:monospace">${ticketCode}</td></tr>
          </table>
          <p>Xuất trình mã QR bên dưới khi check-in.</p>
        </div>`
      await fetch(`${servicesUrl}/send-email-with-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_email: 'noreply@nexpo.vn',
          to,
          subject: `Vé của bạn — ${eventName}`,
          html,
          content_qr: ticketCode,
          link_type: 'ticket',
        }),
      }).catch(console.error)
    }

    const sendClaim = async (to: string, ticketCode: string, ticketClassName: string) => {
      const claimUrl = `${baseUrl}/${siteSlug}/${lang}/claim/${ticketCode}`
      const html = `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
          <h2 style="color:#06043E">Hoàn tất đăng ký vé</h2>
          <p>Bạn đã được cấp vé cho <strong>${eventName}</strong>.</p>
          <p>Loại vé: <strong>${ticketClassName}</strong></p>
          <p>Nhấn vào nút bên dưới để điền thông tin và nhận mã QR của bạn:</p>
          <a href="${claimUrl}" style="display:inline-block;background:#4F80FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Nhận vé →</a>
        </div>`
      await fetch(`${servicesUrl}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject: `Nhận vé — ${eventName}`, html }),
      }).catch(console.error)
    }

    if (registrationMode === 'none') {
      await Promise.all(
        issuedTickets.map((t: any) =>
          sendQR(
            t.holder_email ?? order.buyer_email,
            t.holder_name || order.buyer_name,
            t.ticket_code,
            t.ticket_class_id?.name ?? '',
          )
        )
      )
    } else if (registrationMode === 'buyer_only') {
      const buyer = issuedTickets[0]
      await sendQR(order.buyer_email, order.buyer_name, buyer.ticket_code, buyer.ticket_class_id?.name ?? '')
      const companions = issuedTickets.slice(1).filter((t: any) => t.holder_email)
      await Promise.all(companions.map((t: any) => sendClaim(t.holder_email, t.ticket_code, t.ticket_class_id?.name ?? '')))
    } else {
      // per_ticket — everyone gets claim link
      const recipients = issuedTickets.filter((t: any) => t.holder_email || t === issuedTickets[0])
      await Promise.all(
        recipients.map((t: any) =>
          sendClaim(t.holder_email ?? order.buyer_email, t.ticket_code, t.ticket_class_id?.name ?? '')
        )
      )
    }
  } catch (err) {
    console.error('[webhook/payos] triggerPostPaymentFlow error:', err)
  }
}

async function sendPaymentFailedEmail(order: any) {
  try {
    const servicesUrl = process.env.NEXT_PUBLIC_SERVICES_URL ?? ''
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px">
        <h2 style="color:#dc2626">Payment failed</h2>
        <p>Hello <strong>${order.buyer_name}</strong>,</p>
        <p>Unfortunately your payment of <strong>${order.total_amount?.toLocaleString()}₫</strong> was not successful.</p>
        <p>Please try again or contact support.</p>
      </div>`
    await fetch(`${servicesUrl}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: order.buyer_email,
        subject: 'Payment failed — Nexpo',
        html,
      }),
    })
  } catch (err) {
    console.error('[webhook/payos] sendPaymentFailedEmail error:', err)
  }
}
