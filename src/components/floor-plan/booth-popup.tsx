'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import type { Booth } from '@/directus/queries/floor-plans'

interface Props {
  booth: Booth
  lang: string
  onClose: () => void
}

export function BoothPopup({ booth, lang, onClose }: Props) {
  const { t } = useTranslation()

  const exhibitor = booth.exhibitor_event?.exhibitor_id ?? null
  const logoUrl = exhibitor?.logo ? getDirectusMedia(exhibitor.logo) : null

  // Pick translation for current lang, fall back to first available
  const companyName =
    exhibitor?.translations?.find(tr => tr.languages_code?.startsWith(lang))?.company_name
    ?? exhibitor?.translations?.[0]?.company_name
    ?? booth.exhibitor_event?.nameboard
    ?? null

  const description =
    exhibitor?.translations?.find(tr => tr.languages_code?.startsWith(lang))?.company_description
    ?? exhibitor?.translations?.[0]?.company_description
    ?? null

  const boothTypeName = booth.booth_type?.name ?? null
  const boothTypeColor = booth.booth_type?.color ?? '#94a3b8'

  return (
    <>
      {/* Backdrop for mobile (bottom sheet) */}
      <div
        className="fixed inset-0 bg-black/20 z-20 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: bottom sheet on mobile, side panel on md+ */}
      <motion.div
        className={[
          'fixed z-30 bg-white shadow-xl',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 rounded-t-2xl max-h-[60vh] overflow-y-auto',
          // Desktop: right side panel
          'md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-80 md:rounded-none md:rounded-l-2xl md:max-h-full',
        ].join(' ')}
        initial={{ y: '100%', x: 0 }}
        animate={{ y: 0, x: 0 }}
        exit={{ y: '100%', x: 0 }}
        // Desktop override via CSS — framer motion animates the mobile axis,
        // CSS positions the desktop panel. The md: hidden/visible handles layout.
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                <Image
                  src={logoUrl}
                  alt={companyName ?? booth.booth_number}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: boothTypeColor }}
              >
                {(companyName ?? booth.booth_number).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {companyName ?? t('floor_plan.unassigned')}
              </p>
              <p className="text-xs text-gray-500">
                {t('floor_plan.booth_number_label')}: {booth.booth_number}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t('floor_plan.close')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 shrink-0 ml-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Booth type badge */}
          {boothTypeName && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm inline-block shrink-0"
                style={{ backgroundColor: boothTypeColor }}
              />
              <span className="text-sm text-gray-600">{boothTypeName}</span>
            </div>
          )}

          {/* Description snippet */}
          {description && (
            <p className="text-sm text-gray-700 line-clamp-4">{description}</p>
          )}

          {/* No exhibitor assigned */}
          {!companyName && (
            <p className="text-sm text-gray-400 italic">{t('floor_plan.booth_available')}</p>
          )}
        </div>
      </motion.div>
    </>
  )
}
