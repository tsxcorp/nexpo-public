import React from 'react'
import BlockContainer from '@/components/BlockContainer'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import TypographyProse from '@/components/typography/TypographyProse'
import TypographyTitle from '@/components/typography/TypographyTitle'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface RichText {
  id: string
  title?: string
  headline?: string
  content?: string
  translations?: Array<{
    title?: string
    headline?: string
    content?: string
    languages_code: string
  }>
}

interface RichTextBlockProps {
  data: RichText
  lang: string
}

function RichTextBlock({ data, lang }: RichTextBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''
  const content = translation?.content || data.content || ''

  return (
    <BlockContainer>
      <div className='text-center'>
        {title && (
          <TypographyTitle
            className="font-[var(--font-display)] text-[var(--color-gray)]"
          >
            {title}
          </TypographyTitle>
        )}
        {headline && (
          <TypographyHeadline
            content={headline}
            size='xl'
            className="font-[var(--font-display) ] font-semibold  text-[var(--color-primary)]"
          />
        )}
      </div>
      <TypographyProse
        content={content}
        className='font-[var(--font-body)] mx-auto mt-8 text-gray-800'
      />
    </BlockContainer>
  )
}

export default RichTextBlock
