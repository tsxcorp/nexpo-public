// Helper function to determine routing context
export function getRoutingContext(hostnameOverride?: string, currentPathname?: string) {
  // If we have a currentPathname, use it to determine routing context
  if (currentPathname) {
    const pathSegments = currentPathname.split('/').filter(Boolean)
    
    // If the pathname starts with a language, it's domain-based routing
    if (pathSegments.length > 0 && ['en', 'vi'].includes(pathSegments[0])) {
      return { isDomainBased: true, siteSlug: null }
    }
    
    // If the pathname starts with a site slug (not a language), check if it's followed by a language
    if (pathSegments.length > 0 && !['en', 'vi'].includes(pathSegments[0])) {
      // If second segment is a language, this is slug-based routing
      if (pathSegments.length > 1 && ['en', 'vi'].includes(pathSegments[1])) {
        return { isDomainBased: false, siteSlug: pathSegments[0] }
      }
      // If no language in second segment, this might be domain-based routing with site slug added by middleware
      // We need to check the hostname to determine the actual routing mode
    }
  }
  
  // Fallback to hostname-based logic
  const hostname = hostnameOverride || (typeof window !== 'undefined' ? window.location.hostname : '')
  const isDevelopment = ['localhost', '127.0.0.1'].some(domain => hostname.includes(domain))
  
  if (isDevelopment) {
    // For development, we need to extract site slug from pathname
    // This should be handled by the application logic, not hardcoded
    return { isDomainBased: false, siteSlug: null }
  }
  
  // event.nexpo.vn and Vercel preview URLs are slug-based hubs, NOT custom domains
  const slugBasedProductionDomains = [
    'event.nexpo.vn',
    '.vercel.app',
  ]
  if (slugBasedProductionDomains.some(d => hostname.includes(d))) {
    return { isDomainBased: false, siteSlug: null }
  }

  // For other domains, assume domain-based routing (custom domain)
  return { isDomainBased: true, siteSlug: null }
}

// Helper function to get current language from pathname
export function getCurrentLanguage(pathname: string): string {
  const pathSegments = pathname.split('/').filter(Boolean)
  
  // For domain-based routing, language is the first segment
  // For slug-based routing, language is the second segment after site slug
  if (pathSegments.length > 0) {
    // Check if first segment is a language
    if (['en', 'vi'].includes(pathSegments[0])) {
      return pathSegments[0]
    } else if (pathSegments.length > 1 && ['en', 'vi'].includes(pathSegments[1])) {
      // For slug-based routing, language is second segment
      return pathSegments[1]
    }
  }
  
  return 'en' // default fallback
}

// Helper function to get site slug from pathname
export function getSiteSlugFromPathname(pathname: string): string | null {
  const pathSegments = pathname.split('/').filter(Boolean)
  
  // For slug-based routing, site slug is the first segment
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0]
    // Check if first segment is not a language (to avoid confusion)
    if (!['en', 'vi'].includes(firstSegment)) {
      return firstSegment
    }
  }
  
  return null
}

// Helper function to build URL based on routing context
export function buildUrl(lang: string, permalink: string, hostnameOverride?: string, currentPathname?: string): string {
  const { isDomainBased, siteSlug } = getRoutingContext(hostnameOverride, currentPathname)

  const cleanPermalink = permalink.startsWith('/') ? permalink.slice(1) : permalink

  if (isDomainBased) {
    // Domain-based routing (custom domain): /{lang}/{permalink}
    const url = `/${lang}${cleanPermalink ? `/${cleanPermalink}` : ''}`
    return url
  } else {
    // Slug-based routing (event.nexpo.vn/[site]/[lang]/...): /{site}/{lang}/{permalink}
    const currentSiteSlug = siteSlug || (currentPathname ? getSiteSlugFromPathname(currentPathname) : null) || 'nexpo'
    const url = `/${currentSiteSlug}/${lang}${cleanPermalink ? `/${cleanPermalink}` : ''}`
    return url
  }
}

// Helper function to get default redirect URL based on routing context
export function getDefaultRedirectUrl(hostnameOverride?: string, currentPathname?: string): string {
  const { isDomainBased, siteSlug } = getRoutingContext(hostnameOverride, currentPathname)
  
  if (isDomainBased) {
    // Domain-based routing: redirect to default language
    return '/en'
  } else {
    // Slug-based routing: redirect to site slug (without language)
    return `/${siteSlug}`
  }
} 