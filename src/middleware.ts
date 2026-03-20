import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSiteByDomain } from './directus/queries/sites'

// List of all supported languages
const supportedLanguages = ['en', 'vi']

// Default language
const defaultLanguage = 'en'

// Main domain (slug-based multi-site hub) — sites are identified by first path segment
// e.g. event.nexpo.vn/jobfair/en/home → site=jobfair, lang=en, page=home
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'event.nexpo.vn'

// Domains that use slug-based routing: /[site]/[lang]/[...slug]
const slugBasedDomains = ['localhost', '127.0.0.1', MAIN_DOMAIN]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Use host header for accurate hostname (avoids IPv6 port issues)
  let hostname = request.headers.get('host')?.split(':')[0] || request.nextUrl.hostname
  console.log('[middleware] Processing:', { pathname, hostname })

  // Skip internal paths or special routes — MUST BE FIRST
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/test-routing')
  ) {
    return NextResponse.next()
  }

  // Check if this domain uses slug-based routing (multi-site hub)
  if (slugBasedDomains.some(domain => hostname.includes(domain))) {
    console.log('[middleware] Slug-based domain - using slug-based routing')
    return handleSlugBasedRouting(request, pathname)
  }

  // Custom domain: strip www. prefix before lookup
  if (hostname.startsWith('www.')) {
    hostname = hostname.substring(4)
  }

  // Try to find site mapping from database
  try {
    const site = await getSiteByDomain(hostname)
    if (site?.slug && site?.domain_verified) {
      console.log('[middleware] Verified custom domain found:', hostname, '→', site.slug)
      return handleCustomDomainRouting(request, pathname, site.slug, hostname)
    }
    if (site && !site.domain_verified) {
      console.log('[middleware] Custom domain not verified:', hostname)
    }
  } catch (error) {
    console.error('[middleware] Error finding site by domain:', error)
  }

  // Unknown domain — redirect to main site
  console.log('[middleware] Unknown domain, redirecting to main site')
  return NextResponse.redirect(`https://${MAIN_DOMAIN}`)
}

function handleSlugBasedRouting(request: NextRequest, pathname: string) {
  // Pattern: /[site]/[lang] or /[site]/[lang]/...
  const slugBasedPattern = /^\/([a-zA-Z0-9_-]+)\/([a-zA-Z-]{2,5})(\/.*)?$/

  if (slugBasedPattern.test(pathname)) {
    // Already in correct format, pass through
    return NextResponse.next()
  }

  // Pattern: /[site] only — redirect to default language
  const siteOnlyPattern = /^\/([a-zA-Z0-9_-]+)$/
  if (siteOnlyPattern.test(pathname)) {
    const [, siteSlug] = pathname.split('/')
    const newUrl = new URL(`/${siteSlug}/${defaultLanguage}`, request.url)
    return NextResponse.redirect(newUrl)
  }

  // Root or unknown path — redirect to default site homepage
  const newUrl = new URL(`/nexpo/${defaultLanguage}`, request.url)
  return NextResponse.redirect(newUrl)
}

/**
 * Custom domain routing: www.jobfair.com → rewrites internally to /jobfair/[lang]/[...slug]
 * Browser URL stays as www.jobfair.com — no visible redirect.
 */
function handleCustomDomainRouting(
  request: NextRequest,
  pathname: string,
  siteSlug: string,
  customDomain: string
) {
  // Detect language from path prefix
  let lang = defaultLanguage
  let cleanPath = pathname

  for (const l of supportedLanguages) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) {
      lang = l
      cleanPath = pathname.replace(new RegExp(`^\\/${l}\\/?`), '/') || '/'
      break
    }
  }

  // Build internal rewrite path: /[site]/[lang]/[...slug]
  const internalPath = cleanPath === '/'
    ? `/${siteSlug}/${lang}`
    : `/${siteSlug}/${lang}${cleanPath}`

  console.log('[middleware] Custom domain rewrite:', customDomain + pathname, '→', internalPath)

  const newUrl = request.nextUrl.clone()
  newUrl.pathname = internalPath

  const response = NextResponse.rewrite(newUrl)

  // Set headers so page components know they're in custom domain mode
  response.headers.set('X-Custom-Domain', customDomain)
  response.headers.set('X-Site-Slug', siteSlug)
  response.headers.set('X-Is-Custom-Domain', 'true')

  return response
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico).*)',
  ],
}
