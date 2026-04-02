import React from 'react'
import VButton from '@/components/base/VButton'
import BlockContainer from '@/components/BlockContainer'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import Image from 'next/image'
import { motion, HTMLMotionProps } from 'framer-motion'
import { findTranslation } from '@/lib/utils/translation-helpers'

export interface BlockHeroButton {
  id: string
  label: string
  href: string
  open_in_new_window: boolean
  variant: string
  translations?: Array<{
    label: string
    href: string
    languages_code: string
  }>
}

export interface BlockHero {
  headline: string
  title?: string | null
  content: string
  image?: string
  buttons?: BlockHeroButton[]
  button_group?: {
    buttons: BlockHeroButton[]
  }
}

interface HeroBlockProps {
  data: BlockHero & {
    translations?: Array<any>
    title?: string | null
  }
  lang: string
}

export default function HeroBlock({ data, lang }: HeroBlockProps) {
  const translation = findTranslation(data.translations, lang);
  const headline = translation?.headline || '';
  const title = translation?.title || '';
  const content = translation?.content || '';

  const buttons = data.buttons || data.button_group?.buttons || [];

  return (
    <BlockContainer className='relative grid gap-6 md:grid-cols-3'>
      <div
        className='md:col-span-2 md:pt-12 transition-all duration-700 ease-out opacity-0 translate-y-5 animate-fade-in'
      >
        <h1
          className="text-[var(--color-primary)] xs:text-5xl font-[var(--font-display) ] font-bold text-4xl  sm:text-2xl lg:text-6xl leading-snug ]"
          dangerouslySetInnerHTML={headline ? { __html: headline } : undefined}
        />
        <p className="w-full py-6 font-[var(--font-display)] text-[18px] lg:leading-loose text-[var(--color-gray)]">
          {content}
        </p>
        <div className='flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0'>
          {buttons.map((button) => {
            const btnTrans = findTranslation(button.translations, lang)
            return (
              <VButton
                key={button.id}
                href={btnTrans?.href || button.href}
                variant={button.variant}
                target={button.open_in_new_window ? '_blank' : '_self'}
                size='lg'
              >
                {btnTrans?.label || button.label}
              </VButton>
            )
          })}
        </div>
      </div>
      {data.image && (
        <div
          className='p-2 md:-mr-16 lg:relative lg:-mr-48 lg:h-full flex items-center justify-center'
        >
          <Image
            className='max-h-[700px] w-full overflow-hidden object-cover'
            width='700'
            height='700'
            src={getDirectusMedia(data.image) as any}
            alt=''
          />
        </div>
      )}
    </BlockContainer>
  )
}
