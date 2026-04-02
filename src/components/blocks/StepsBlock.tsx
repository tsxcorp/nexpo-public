'use client'
import './StepBlock.css'
import React from 'react'
import BlockContainer from '@/components/BlockContainer'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import TypographyProse from '@/components/typography/TypographyProse'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { isEven } from '@/lib/utils/math'
import { BlockSteps } from '@/directus/types'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface StepsBlockProps {
  data: BlockSteps & {
    translations?: Array<{
      title?: string
      headline?: string
      languages_code: string
    }>
    steps?: Array<{
      title?: string
      content?: string
      image?: string
      translations?: Array<{
        title?: string
        content?: string
        languages_code: string
      }>
    }>
  };
  lang: string;
}

export default function StepsBlock({ data, lang }: StepsBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''

  return (
    <BlockContainer className='mx-auto max-w-4xl text-center'>
      {title && <TypographyTitle
        className='text-[var(--color-gray)] font-[var(--font-display) ] font-semibold'
      >{title}</TypographyTitle>}
      {headline && <TypographyHeadline 
      className='text-[var(--color-primary)] font-[var(--font-display) ] font-semibold'
      size='xl'
      content={headline} />}
      {data.steps && (
        <div className='mt-8'>
          {data.steps.map((step, stepIdx) => {
            const stepTranslation = findTranslation(step.translations, lang)
            const stepTitle = stepTranslation?.title || step.title || ''
            const stepContent = stepTranslation?.content || step.content || ''

            return (
              <div key={step.id}>
                <div
                  className={`relative p-6 border-2 border-[var(--color-primary)] md:flex md:space-x-8 ${
                    isEven(stepIdx)
                      ? 'mr-8 rounded-xl'
                      : 'ml-8 rounded-xl'
                  } opacity-0 translate-x-5 scale-95 animate-fade-in`}
                  style={{ animationDelay: `${stepIdx * 0.2}s` }}
                >
                  <div className='flex-shrink-0'>
                    {step.image && (
                    <Image
                      className={`h-32 w-full object-cover  md:h-full md:w-48 ${
                        isEven(stepIdx)
                          ? 'rounded-xl'
                          : 'rounded-xl'
                      }`}
                      width={500}
                      height={500}
                      alt=''
                      src={getDirectusMedia(step.image)}
                    />
                    )}
                  </div>

                  <div className='mt-4 w-full text-left md:mt-0'>
                    {data.show_step_numbers && (
                      <div className='font-[var(--font-body) ] text-[var(--color-gray)] font-semibold uppercase tracking-wide'>
                         {stepIdx + 1}
                      </div>
                    )}
                    <h3 className='mt-2 font-[var(--font-display) ] text-[var(--color-primary)] text-3xl font-semibold '>
                      {stepTitle}
                    </h3>
                    <TypographyProse
                      content={stepContent}
                      className='mt-4 font-[var(--font-body)]'
                    />
                  </div>
                </div>

                {/* <!-- Animation Timeline --> */}
                {data.steps && stepIdx !== data.steps.length - 1 && (
                  <svg
                    className='steps-animation m-0 mx-auto h-16 stroke-current text-[var(--color-primary)] md:h-20'
                    viewBox='0 0 60 200'
                  >
                    <line
                      className='path'
                      x1='15'
                      x2='15'
                      y1='0'
                      y2='200'
                      strokeWidth='8'
                      strokeLinecap='square'
                    />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      )}
    </BlockContainer>
  )
}
