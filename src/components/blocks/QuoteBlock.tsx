'use client'
import { motion } from 'framer-motion'
import BlockContainer from '@/components/BlockContainer'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface Quote {
  id: string
  headline?: string
  title?: string
  subtitle?: string
  content?: string
  image?: string
  background_color?: string
  translations?: Array<{
    headline?: string
    title?: string
    subtitle?: string
    content?: string
    languages_code: string
  }>
}

interface QuoteBlockProps {
  data: Quote
  lang: string
}

export default function QuoteBlock({ data, lang }: QuoteBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const subtitle = translation?.subtitle || data.subtitle || ''
  const content = translation?.content || data.content || ''

  return (
    <BlockContainer className="py-16 px-4">
      <div
        className="relative max-w-3xl mx-auto bg-white/80 shadow-xl rounded-2xl border-l-8 border-[var(--color-primary)] p-8 opacity-0 translate-y-5 animate-fade-in"
      >
        <div className="flex items-start space-x-4">
          <span className="text-6xl font-bold text-[var(--color-primary)] leading-none select-none -mt-2">“</span>
          <div
            className="italic text-2xl font-[var(--font-display)] text-[var(--color-gray)]"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
        {(title || subtitle) && (
          <div className="mt-6 pl-12">
            {title && <div className="text-lg text-[var(--color-gray)] font-[var(--font-display) ] font-semibold">{title}</div>}
            {subtitle && <div className="text-base text-[var(--color-primary)]">{subtitle}</div>}
          </div>
        )}
      </div>
    </BlockContainer>
  )
}
