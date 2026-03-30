/**
 * GET /api/ticket-class-form?class_id=xxx
 * Returns the form fields for a ticket class configured with form_timing=during_checkout.
 * Uses admin token server-side.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItem, readItems } from '@directus/sdk'

const adminDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get('class_id')
  if (!classId) return NextResponse.json({ error: 'class_id required' }, { status: 400 })

  try {
    const tc = await adminDirectus.request(
      readItem('ticket_classes' as never, classId as never, {
        fields: ['form_id', 'form_timing'] as never,
      })
    ) as any

    if (tc.form_timing !== 'during_checkout') {
      return NextResponse.json({ form: null, form_timing: tc.form_timing ?? 'none' })
    }

    if (!tc.form_id) {
      // form_timing = during_checkout but no form linked → return empty to trigger fallback
      return NextResponse.json({ form: null, form_timing: 'during_checkout', use_fallback: true })
    }

    // Fetch form_fields separately (nested fields.* may fail due to Directus alias permission)
    const fields = await adminDirectus.request(
      readItems('form_fields' as never, {
        filter: { form_id: { _eq: tc.form_id } } as never,
        fields: ['id', 'name', 'type', 'is_required', 'is_email_contact', 'is_name_field', 'is_phone_field', 'translations.languages_code', 'translations.label', 'translations.placeholder', 'translations.options'] as never,
        sort: ['sort'] as never,
        limit: 50,
      })
    ) as any[]

    return NextResponse.json({ form: { id: tc.form_id, fields } })
  } catch (err: any) {
    console.error('[ticket-class-form] Error:', err)
    return NextResponse.json({ form: null })
  }
}
