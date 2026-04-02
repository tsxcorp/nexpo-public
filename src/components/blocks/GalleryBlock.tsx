import React from 'react'
import BlockContainer from '@/components/BlockContainer'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import TypographyTitle from '@/components/typography/TypographyTitle'
import VGallery from '@/components/base/VGallery'
import { findTranslation } from '@/lib/utils/translation-helpers'

export interface Gallery {
  id: string
  title?: string
  headline?: string
  gallery_items: Array<{
    directus_files_id:
      | string
      | {
          id: string
          title?: string
          description?: string
          tags?: string
        }
  }>
  translations?: Array<{
    languages_code: string
    title?: string
    headline?: string
  }>
}

interface GalleryBlockProps {
  data: Gallery
  lang: string
  className?: string
}

function GalleryBlock({ data, lang, className }: GalleryBlockProps) {
  const translation = findTranslation(data.translations, lang);
  const title = translation?.title || data.title
  const headline = translation?.headline || data.headline

  return (
    <div className={`modern-gallery-block ${className || ''}`}>
      <BlockContainer>
        {/* Title */}
        {title && 
        <TypographyTitle
          className="font-[var(--font-display)] text-[var(--color-gray)]"
        >{title}
        </TypographyTitle>}
        {headline && 
        <TypographyHeadline 
          content={headline}
          size='xl'
          className="font-[var(--font-display) ] font-semibold  text-[var(--color-primary)]"
        />}
        {data.gallery_items.length > 0 && (
          <VGallery
            items={data.gallery_items
              .map(item => {
                const file = item.directus_files_id;
                if (!file) return undefined;
                if (typeof file === 'string') {
                  return { id: file };
                }
                return {
                  id: file.id,
                  title: file.title,
                  description: file.description,
                  tags: Array.isArray(file.tags) ? file.tags : (file.tags ? [file.tags] : undefined),
                };
              })
              .filter((item): item is { id: string; title?: string; description?: string; tags?: string[] } => !!item && !!item.id)
            }
          />
        )}
      </BlockContainer>
    </div>
  )
}

export default GalleryBlock
