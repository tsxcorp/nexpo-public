/**
 * GET /api/validate-promo?code=XXX&site_slug=YYY&subtotal=ZZZ&items=[class_ids]
 * Validates promo code and returns discount amount.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  const siteSlug = req.nextUrl.searchParams.get('site_slug')
  const subtotal = Number(req.nextUrl.searchParams.get('subtotal') || 0)

  if (!code || !siteSlug) {
    return NextResponse.json({ error: 'Missing code or site_slug' }, { status: 400 })
  }

  try {
    // Resolve event_id from site
    const sites = await adminDirectus.request(
      readItems('sites' as never, {
        filter: { slug: { _eq: siteSlug } } as never,
        fields: ['event_id'] as never,
        limit: 1,
      })
    ) as any[]
    const eventId = sites[0]?.event_id
    if (!eventId) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    // Find active campaign by code + event
    const now = new Date().toISOString()
    const campaigns = await adminDirectus.request(
      readItems('promo_campaigns' as never, {
        filter: {
          event_id: { _eq: eventId },
          code: { _eq: code },
          status: { _eq: 'active' },
        } as never,
        fields: ['*'] as never,
        limit: 1,
      })
    ) as any[]

    const campaign = campaigns[0]
    if (!campaign) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
    }

    // Check date validity
    if (campaign.valid_from && now < campaign.valid_from) {
      return NextResponse.json({ error: 'Promo not yet active' }, { status: 400 })
    }
    if (campaign.valid_until && now > campaign.valid_until) {
      return NextResponse.json({ error: 'Promo has expired' }, { status: 400 })
    }

    // Check max uses
    if (campaign.max_uses !== -1 && (campaign.uses_count ?? 0) >= campaign.max_uses) {
      return NextResponse.json({ error: 'Promo code fully redeemed' }, { status: 400 })
    }

    // Check min order amount
    if (subtotal < Number(campaign.min_order_amount ?? 0)) {
      return NextResponse.json({ error: `Minimum order ${Number(campaign.min_order_amount).toLocaleString()}₫` }, { status: 400 })
    }

    // Calculate discount
    let discount = 0
    if (campaign.discount_type === 'percentage') {
      discount = Math.round(subtotal * Number(campaign.discount_value) / 100)
    } else {
      discount = Number(campaign.discount_value)
    }
    discount = Math.min(discount, subtotal) // can't exceed subtotal

    return NextResponse.json({
      valid: true,
      discount,
      campaign_id: campaign.id,
      discount_type: campaign.discount_type,
      discount_value: campaign.discount_value,
    })
  } catch (err: any) {
    console.error('[validate-promo] Error:', err)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
