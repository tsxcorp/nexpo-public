/* eslint-disable @next/next/no-img-element */
'use client' // add this line make famer-motion works.

import React from 'react'
import BlockContainer from '@/components/BlockContainer'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import { motion } from 'framer-motion'
import Image from 'next/image'
import '@/styles/logo-marquee.css'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface LogoCloudBlockProps {
  id: string
  headline?: string
  title?: string
  logos: Array<{
    id: string
    sort: number
    block_logocloud_id: string
    directus_files_id: {
      id: string
      title: string
      type: string
      // ... other file properties
    }
  }>
  translations?: Array<{
    headline?: string
    title?: string
    languages_code: string
  }>
  lang: string
}

interface Props {
  data: LogoCloudBlockProps
  lang: string
}

export default function LogoCloudBlock({ data, lang }: Props) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''

  return (
    <BlockContainer className='mx-auto max-w-8xl px-4 py-16 sm:px-6 lg:px-8'>
      {title && <TypographyTitle
        className='text-[var(--color-gray)] font-[var(--font-display) ] font-semibold'
      >{title}</TypographyTitle>}
      {headline && <TypographyHeadline 
        className='text-[var(--color-primary)] font-[var(--font-display) ] font-semibold'
        size='xl'
        content={headline} />}
      
      <div className='mt-8 lg:mt-10 overflow-hidden w-full'>
        <div className='logo-marquee-track'>
          {[...data.logos, ...data.logos].map((logo, index) => (
            <div
              key={`${logo.id}-${index}`}
              className='flex-shrink-0 w-48 h-48 flex items-center justify-center rounded-xl bg-white p-8 mx-4 transition-transform duration-300 hover:scale-125 hover:z-10'
            >
              <Image
                className='h-24 w-auto object-contain'
                src={getDirectusMedia(logo.directus_files_id.id)}
                alt={logo.directus_files_id.title || ''}
                width={96}
                height={96}
              />
            </div>
          ))}
        </div>
      </div>
    </BlockContainer>
  )
}
