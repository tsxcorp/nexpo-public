import React, { useMemo } from 'react'
import BlockContainer from '@/components/BlockContainer'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import { VAccordion } from '@/components/base/VAccordion'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface Faq {
  title: string
  answer: string
}

interface FaqsBlockProps {
  id: string
  title?: string
  headline?: string
  translations?: Array<{
    title?: string
    headline?: string
    languages_code: string
    faqs?: Faq[]
  }>
  lang: string
}

interface Props {
  data: FaqsBlockProps
  lang: string
}

export default function FaqsBlock({ data, lang }: Props) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''
  const faqs = useMemo(() => translation?.faqs || [], [translation])

  return (
    <BlockContainer className='mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8'>
      <div className='mx-auto max-w-4xl text-center'>
        {title && (
          <TypographyTitle className="font-[var(--font-display)] text-[var(--color-gray)]">
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
        <div className='mt-6 pt-6'>
          <dl className='space-y-6'>
            {faqs.map((faq, itemIdx) => (
              <VAccordion 
                key={itemIdx}
                title={faq.title}
              >
                {faq.answer}
              </VAccordion>
            ))}
          </dl>
        </div>
      </div>
    </BlockContainer>
  )
}
