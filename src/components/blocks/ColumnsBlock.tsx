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

interface ButtonTranslation {
  label?: string
  href?: string
  languages_code: string
}

interface BlockButton {
  id: string
  variant?: string
  color?: string
  open_in_new_window?: boolean
  translations?: ButtonTranslation[]
}

interface ButtonGroup {
  id: string
  buttons?: BlockButton[]
}

interface ExtendedBlockColumnsRows extends Omit<BlockColumnsRows, 'translations'> {
  translations?: RowTranslation[]
  button_group?: ButtonGroup | string | null
}

interface ColumnsBlockData extends BlockColumns {
  layout_mode?: string | null
  grid_columns?: number | null
  grid_gap?: string | null
  translations?: BlockTranslation[]
  rows?: ExtendedBlockColumnsRows[]
}

interface ColumnsBlockProps {
  data: ColumnsBlockData
  lang: string
}

// Grid column count → Tailwind class map
const GRID_COLS_CLASS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

function ColumnsBlock({ data, lang }: ColumnsBlockProps) {
  const translation = findTranslation(data.translations, lang)
  const title = translation?.title || data.title || ''
  const headline = translation?.headline || data.headline || ''
  const isGrid = data.layout_mode === 'grid'
  const gridColumns = data.grid_columns || 2
  const gridGap = data.grid_gap || '1.5rem'
  const gridColsClass = GRID_COLS_CLASS[gridColumns] || GRID_COLS_CLASS[2]

  if (isGrid) {
    // CSS Grid mode: render rows as grid cells
    return (
      <BlockContainer className='relative mx-auto w-full max-w-7xl px-5 py-24 md:px-12 lg:px-16'>
        {title && (
          <TypographyTitle className='text-[var(--color-gray)] font-[var(--font-display)] font-semibold'>
            {title}
          </TypographyTitle>
        )}
        {headline && (
          <TypographyHeadline
            className='text-[var(--color-primary)] font-[var(--font-display)] font-semibold'
            size='xl'
            content={headline}
          />
        )}
        {/* CSS Grid container */}
        <div
          className={`mt-12 grid ${gridColsClass}`}
          style={{ gap: gridGap }}
        >
          {(data.rows as ExtendedBlockColumnsRows[] | undefined)?.map((row, idx) => {
            const rowTranslation = findTranslation(row.translations, lang)
            const rowTitle = rowTranslation?.title || row.title || ''
            const rowHeadline = rowTranslation?.headline || row.headline || ''
            const rowContent = rowTranslation?.content || row.content || ''

            return (
              <div key={row.id || idx} className='flex flex-col gap-3'>
                {row.image && (
                  <div className='aspect-video w-full overflow-hidden rounded-xl bg-gray-100'>
                    <Image
                      width={600}
                      height={400}
                      alt={rowTitle}
                      className='h-full w-full object-cover'
                      src={getDirectusMedia(typeof row.image === 'string' ? row.image : (row.image as { id: string })?.id)}
                    />
                  </div>
                )}
                {rowTitle && (
                  <TypographyTitle className='text-[var(--color-gray)] font-[var(--font-display)] font-semibold'>
                    {rowTitle}
                  </TypographyTitle>
                )}
                {rowHeadline && (
                  <TypographyHeadline
                    className='text-[var(--color-primary)] font-[var(--font-display)] font-semibold'
                    size='lg'
                    content={rowHeadline}
                  />
                )}
                {rowContent && (
                  <TypographyProse content={rowContent} className='font-[var(--font-body)]' />
                )}
              </div>
            )
          })}
        </div>
      </BlockContainer>
    )
  }

  // Legacy Flex mode: original behavior preserved
  return (
    <BlockContainer className='relative mx-auto w-full max-w-7xl items-center px-5 py-24 md:px-12 lg:px-16'>
      {title && (
        <TypographyTitle className='text-[var(--color-gray)] font-[var(--font-display)] font-semibold'>
          {title}
        </TypographyTitle>
      )}
      {headline && (
        <TypographyHeadline
          className='text-[var(--color-primary)] font-[var(--font-display)] font-semibold'
          size='xl'
          content={headline}
        />
      )}
      {data.rows &&
        (data.rows as ExtendedBlockColumnsRows[]).map((row, idx) => {
          const rowTranslation = findTranslation(row.translations, lang)
          const rowTitle = rowTranslation?.title || row.title || ''
          const rowHeadline = rowTranslation?.headline || row.headline || ''
          const rowContent = rowTranslation?.content || row.content || ''
          const buttonGroup = typeof row.button_group === 'object' && row.button_group !== null
            ? row.button_group as ButtonGroup
            : null
          const buttons = buttonGroup?.buttons || []

          return (
            <div key={row.id || idx} className='relative mt-16 flex-col items-start align-middle'>
              <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-24'>
                <div className='relative m-auto items-center gap-12 lg:inline-flex'>
                  <div className='max-w-xl text-left'>
                    {rowTitle && (
                      <TypographyTitle className='text-[var(--color-gray)] font-[var(--font-display)] font-semibold'>
                        {rowTitle}
                      </TypographyTitle>
                    )}
                    {rowHeadline && (
                      <TypographyHeadline
                        className='text-[var(--color-primary)] font-[var(--font-display)] font-semibold'
                        size='xl'
                        content={rowHeadline}
                      />
                    )}
                    {rowContent && (
                      <TypographyProse content={rowContent} className='mt-4 font-[var(--font-body)]' />
                    )}
                    {buttons.length > 0 && (
                      <div className='mt-6 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0'>
                        {buttons.map((button) => {
                          const btnTrans = findTranslation(button.translations, lang)
                          const btnLabel = btnTrans?.label || ''
                          const btnHref = btnTrans?.href || '#'
                          return (
                            <a
                              key={button.id}
                              href={btnHref}
                              target={button.open_in_new_window ? '_blank' : '_self'}
                              rel='noreferrer'
                              className='inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity'
                            >
                              {btnLabel}
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`order-first mt-12 block aspect-square w-full border-2 border-[var(--color-primary)] p-2 lg:mt-0 ${
                    row.image_position === 'right' ? 'rounded-xl lg:order-last' : 'rounded-xl lg:order-first'
                  }`}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, scale: 1, y: 0, transition: { delay: 0.25, duration: 1 } }}
                  >
                    <div
                      className={`mx-auto h-full w-full bg-gray-100 object-cover object-center lg:ml-auto ${
                        row.image_position === 'right' ? 'rounded-bl-2xl rounded-tr-2xl' : 'rounded-br-2xl rounded-tl-2xl'
                      }`}
                    >
                      {row.image && (
                        <Image
                          width={800}
                          height={800}
                          alt=''
                          src={getDirectusMedia(typeof row.image === 'string' ? row.image : (row.image as { id: string })?.id)}
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
