'use client'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import BlockContainer from '@/components/BlockContainer'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import VVideo from '@/components/base/VVideo'
import { useMemo } from 'react'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface Video {
  id: string
  title?: string
  headline?: string
  type: string
  video_file?: string
  video_url?: string
  translations?: Array<{
    title?: string
    headline?: string
    languages_code: string
  }>
}

interface VideoBlockProps {
  data: Video
  lang: string
}

export default function VideoBlock({ data, lang }: VideoBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''

  const url = useMemo(() => {
    if (data.type === 'file' && data.video_file) {
      return getDirectusMedia(data.video_file)
    }
    if (data.type === 'url' && data.video_url) {
      return data.video_url
    }
    return null
  }, [data.type, data.video_file, data.video_url])

  return (
    <BlockContainer className='mx-auto max-w-4xl py-12 text-center'>
      {title && (
        <TypographyTitle className="font-[var(--font-display)] text-[var(--color-gray)]">
          {title}
        </TypographyTitle>
      )}
      {headline && (
        <TypographyHeadline
          content={headline}
          size='xl'
          className="font-[var(--font-display)] text-[var(--color-primary)]"
        />
      )}
      <div className='relative flex justify-center items-center mt-8'>
        <div className='absolute inset-0 translate-x-4 translate-y-4 rounded-br-2xl rounded-tl-2xl opacity-30' />
        {url && (
          <VVideo
            className='relative mt-4 overflow-hidden rounded-br-xl rounded-tl-xl'
            url={url}
            title={title}
          />
        )}
      </div>
    </BlockContainer>
  )
}
