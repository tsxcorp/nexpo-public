import { cache } from 'react'
import type { RequestTransformer, RestCommand } from '@directus/sdk'

export const withRequestCallback = <Schema extends object, Output>(
  onRequest: RequestTransformer,
  getOptions: RestCommand<Output, Schema>
): RestCommand<Output, Schema> => {
  return () => {
    const options = getOptions()
    options.onRequest = onRequest
    return options
  }
}

export const withRevalidate = <Schema extends object, Output>(
  getOptions: RestCommand<Output, Schema>,
  revalidate: number
): RestCommand<Output, Schema> => {
  return () => {
    const options = getOptions()
    options.onRequest = (options: RequestInit) => {
      return { ...options, next: { revalidate } }
    }
    return options
  }
}

// Check if we're in a development environment where Directus might not be available
export const isDirectusAvailable = async (): Promise<boolean> => {
  // Check if fallback data is enabled - if so, skip Directus connection attempt
  if (process.env.NEXT_PUBLIC_ENABLE_FALLBACK_DATA === 'true') {
    return false
  }

  try {
    const directusURL = process.env.NEXT_PUBLIC_DIRECTUS_URL
    const response = await fetch(`${directusURL}/server/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })
    return response.ok
  } catch (error) {
    console.warn('[Directus] Server not available:', error)
    return false
  }
}

export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallback: T | null = null,
  operationName = 'API call'
): Promise<T | null> => {
  try {
    // Check if Directus is available before making the call
    const available = await isDirectusAvailable()
    if (!available) {
      console.warn(`[Directus API] Server not available for ${operationName}, returning fallback`)
      return fallback
    }
    
    return await apiCall()
  } catch (error) {
    // Directus SDK throws non-Error objects — extract message from errors array
    if (error && typeof error === 'object' && 'errors' in error) {
      const directusErrors = (error as { errors: Array<{ message: string; extensions?: { code: string } }> }).errors
      console.error(`[Directus API] ${operationName} failed:`, JSON.stringify(directusErrors))
    } else if (error instanceof Error) {
      console.error(`[Directus API] ${operationName} failed:`, error.message)
      if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
        console.error('[Directus API] Connection error - Directus server is not running or not accessible')
      } else if (error.message.includes('timeout')) {
        console.error('[Directus API] Request timeout - Directus server is not responding')
      }
    } else {
      console.error(`[Directus API] ${operationName} failed:`, JSON.stringify(error))
    }
    return fallback
  }
} 