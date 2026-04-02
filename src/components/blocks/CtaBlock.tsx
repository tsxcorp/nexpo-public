import React from 'react'
import BlockContainer from '@/components/BlockContainer'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import TypographyProse from '@/components/typography/TypographyProse'
import VButton from '@/components/base/VButton'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface Cta {
  id: string
  title?: string
  headline?: string
  content?: string
  buttons?: {
    id: string
    label: string
    href: string
    open_in_new_window: boolean
    variant: 'primary' | 'default' | 'outline'
    color?: 'primary' | 'gray' | 'black' | 'white'
    translations?: Array<{
      label?: string
      href?: string
      languages_code: string
    }>
  }[]
  translations?: Array<{
    title?: string
    headline?: string
    content?: string
    languages_code: string
  }>
}

interface CtaBlockProps {
  data: Cta
  lang: string
}

export default function CtaBlock({ data, lang }: CtaBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''
  const content = translation?.content || data.content || ''

  return (
    <BlockContainer className='glass-card-blue mx-auto w-full max-w-8xl'>
      <div className='relative overflow-hidden rounded-xl border-2 border-[var(--color-primary)] bg-transparent  p-2 '>
        <div className='relative overflow-hidden rounded-xl px-6 py-8'>
          <div className='absolute inset-0 ' />
          <div className='absolute inset-0 ' />
          <div className='relative md:flex md:items-center md:justify-between md:space-x-4'>
            <div>
              {title && <TypographyTitle
                className='text-[var(--color-gray)] font-[var(--font-display) ] font-semibold'
              >{title}</TypographyTitle>}
              {headline && (
                <TypographyHeadline
                  className='text-[var(--color-primary)] font-[var(--font-display) ] font-semibold'
                  size='xl'
                  content={headline}
                  
                />
              )}
              {content && (
                <TypographyProse
                  content={content}
                  className='mt-2 font-[var(--font-body)]'
                />
              )}
            </div>
            <div className='mt-4 flex-shrink-0 md:mt-0'>
              {data.buttons &&
                data.buttons.map((button) => {
                  const buttonTranslation = findTranslation(button.translations, lang)
                  const buttonLabel = buttonTranslation?.label || button.label
                  const buttonHref = buttonTranslation?.href || button.href

                  return (
                    <VButton
                      key={button.id}
                      href={buttonHref}
                      target={button.open_in_new_window ? '_blank' : '_self'}
                      size='xl'
                      color={button.color || 'primary'}
                      variant={button.variant || 'solid'}
                      className='block'
                    >
                      {buttonLabel}
                    </VButton>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </BlockContainer>
  )
}
