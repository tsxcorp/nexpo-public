import { DirectusFile, DirectusUsers } from '@/directus/types'

export function getDirectusURL(path = '') {
  return `${
    process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055'
  }${path}`
}

export function getDirectusMedia(
  input: string | DirectusFile | null | undefined
): string {
  if (input == null) return ''

  const id = typeof input === 'string' ? input : input?.id
  if (!id) return ''

  // Return full URL if already absolute
  if (id.startsWith('http') || id.startsWith('//')) return id

  return `${getDirectusURL()}/assets/${id}`
}

export function formatDate(dateString: string) {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return date.toLocaleDateString('en-US', options)
}

export function userName(user: Partial<DirectusUsers>): string {
  if (!user) {
    return 'Unknown User' as string
  }

  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }

  if (user.first_name) {
    return user.first_name
  }

  if (user.email) {
    return user.email
  }

  return 'Unknown User' as string
}
