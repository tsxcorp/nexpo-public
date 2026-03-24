import { NextRequest, NextResponse } from 'next/server'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://app.nexpo.vn'
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN

export async function POST(req: NextRequest) {
  try {
    if (!ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to Directus files collection
    const upload = new FormData()
    upload.append('file', file, file.name)

    const response = await fetch(`${DIRECTUS_URL}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: upload,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error('[upload] Directus error:', err)
      return NextResponse.json({ error: 'Upload to Directus failed' }, { status: 500 })
    }

    const result = await response.json()
    const fileId: string = result?.data?.id

    return NextResponse.json({ id: fileId })
  } catch (error) {
    console.error('[upload] error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
