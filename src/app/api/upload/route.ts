import { NextRequest, NextResponse } from 'next/server'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://app.nexpo.vn'
// Fallback folder when event has no folder_uploads_id yet (public create permission scoped to this)
const PUBLIC_UPLOADS_FOLDER = 'b172eef3-09b3-4dff-9046-ced2ed6679d2'

async function getEventUploadFolder(eventId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/events/${eventId}?fields=folder_uploads_id`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data?.data?.folder_uploads_id as string | null) ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const eventId = formData.get('event_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Resolve target folder: event's uploads/ folder → fallback to 4. Uploads
    let folderId = PUBLIC_UPLOADS_FOLDER
    if (eventId) {
      const eventFolder = await getEventUploadFolder(eventId)
      if (eventFolder) folderId = eventFolder
    }

    const upload = new FormData()
    upload.append('folder', folderId)
    upload.append('file', file, file.name)

    const response = await fetch(`${DIRECTUS_URL}/files`, {
      method: 'POST',
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
