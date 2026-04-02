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

export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallback: T | null = null,
  operationName = 'API call'
): Promise<T | null> => {
  try {
    return await apiCall()
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error) {
      const directusErrors = (error as { errors: Array<{ message: string }> }).errors
      console.error(`[Directus] ${operationName} failed:`, JSON.stringify(directusErrors))
    } else {
      console.error(`[Directus] ${operationName} failed:`, error instanceof Error ? error.message : error)
    }
    return fallback
  }
} 