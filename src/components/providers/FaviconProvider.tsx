'use client'

import { useEffect } from 'react'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import type { Sites } from '@/directus/types'

interface FaviconProviderProps {
  siteData?: Sites | null
}

export function FaviconProvider({ siteData }: FaviconProviderProps) {
  useEffect(() => {
    const setFavicon = (url: string, type: string = 'image/x-icon') => {
      // Tạo hoặc cập nhật favicon link
      let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      
      if (!faviconLink) {
        faviconLink = document.createElement('link')
        faviconLink.rel = 'icon'
        document.head.appendChild(faviconLink)
      }
      
      faviconLink.href = url
      faviconLink.type = type
      
    }

    if (!siteData?.favicon) {
      // Sử dụng favicon mặc định
      setFavicon('/favicon.ico')
      return
    }

    try {
      const faviconUrl = getDirectusMedia(siteData.favicon)
      
      // Xác định type dựa trên extension
      const extension = faviconUrl.split('.').pop()?.toLowerCase()
      let type = 'image/x-icon'
      
      if (extension === 'png') {
        type = 'image/png'
      } else if (extension === 'svg') {
        type = 'image/svg+xml'
      } else if (extension === 'jpg' || extension === 'jpeg') {
        type = 'image/jpeg'
      }
      
      setFavicon(faviconUrl, type)
    } catch (error) {
      console.error('[FaviconProvider] Error setting favicon:', error)
      // Fallback to default favicon
      setFavicon('/favicon.ico')
    }
  }, [siteData?.favicon])

  return null
} 