'use client'
import Image from 'next/image'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import TypographyProse from '@/components/typography/TypographyProse'
import TypographyTitle from '@/components/typography/TypographyTitle'
import BlockContainer from '@/components/BlockContainer'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import { motion } from 'framer-motion'
import { BlockColumns, BlockColumnsRows } from '@/directus/types'
import { findTranslation } from '@/lib/utils/translation-helpers'

interface RowTranslation {
  title?: string
  headline?: string
  content?: string
  languages_code: string
}

interface BlockTranslation {
  title?: string
  headline?: string
  languages_code: string
}

interface ExtendedBlockColumnsRows extends Omit<BlockColumnsRows, 'translations'> {
  translations?: RowTranslation[]
}

interface ColumnsBlockProps {
  data: BlockColumns & {
    translations?: BlockTranslation[]
    rows?: ExtendedBlockColumnsRows[]
  }
  lang: string
}

function ColumnsBlock({ data, lang }: ColumnsBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''

  return (
    <BlockContainer className='relative mx-auto w-full max-w-7xl items-center px-5 py-24  md:px-12 lg:px-16'>
      {title && <TypographyTitle
        className='text-[var(--color-gray)] font-[var(--font-display) ] font-semibold'
      >{title}</TypographyTitle>}
      {headline && <TypographyHeadline 
        className='text-[var(--color-primary)] font-[var(--font-display) ] font-semibold'
        size='xl'
        content={headline} />}
      {data.rows &&
        (data.rows as ExtendedBlockColumnsRows[]).map((row, idx) => {
          const rowTranslation = findTranslation(row.translations, lang)
          const rowTitle = rowTranslation?.title || row.title || ''
          const rowHeadline = rowTranslation?.headline || row.headline || ''
          const rowContent = rowTranslation?.content || row.content || ''

          return (
            <div
              key={row.id || idx}
              className='relative mt-16 flex-col items-start align-middle'
            >
              <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-24'>
                <div className='relative m-auto items-center gap-12 lg:inline-flex'>
                  <div className='max-w-xl text-left'>
                    <div>
                      {rowTitle && (
                        <TypographyTitle
                          className='text-[var(--color-gray)] font-[var(--font-display) ] font-semibold'
                        >{rowTitle}</TypographyTitle>
                      )}
                      {rowHeadline && (
                        <TypographyHeadline 
                        className='text-[var(--color-primary)] font-[var(--font-display) ] font-semibold'
                        size='xl'
                        content={rowHeadline} />
                      )}
                      {rowContent && (
                        <TypographyProse
                        
                          content={rowContent}
                          className='mt-4 font-[var(--font-body)]'
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`order-first mt-12 block aspect-square w-full border-2 border-[var(--color-primary)] p-2  lg:mt-0 ${
                    row.image_position === 'right'
                      ? 'rounded-xl lg:order-last'
                      : 'rounded-xl lg:order-first'
                  }`}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    viewport={{ once: true }}
                    whileInView={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: {
                        delay: 0.25,
                        duration: 1,
                      },
                    }}
                  >
                    <div className={`mx-auto h-full w-full bg-gray-100 object-cover object-center lg:ml-auto ${
                      row.image_position === 'right'
                        ? 'rounded-bl-2xl rounded-tr-2xl'
                        : 'rounded-br-2xl rounded-tl-2xl'
                    }`}>
                      {row.image && (
                        <Image
                          width={800}
                          height={800}
                          alt=''
                          src={getDirectusMedia(typeof row.image === 'string' ? row.image : row.image?.id)}
                        />
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )
        })}
    </BlockContainer>
  )
}

export default ColumnsBlock
