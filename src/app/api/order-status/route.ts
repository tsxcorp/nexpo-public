import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItem } from '@directus/sdk'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('id')
  if (!orderId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const order = await adminDirectus.request(
      readItem('ticket_orders' as never, orderId as never, {
        fields: ['id', 'status'] as never,
      })
    ) as any
    return NextResponse.json({ status: order.status })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
