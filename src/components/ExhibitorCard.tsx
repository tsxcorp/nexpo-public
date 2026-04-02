'use client'
import Image from 'next/image'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import { findTranslation } from '@/lib/utils/translation-helpers'
import type { ExhibitorEvent, ExhibitorTranslation } from '@/directus/types'

interface ExhibitorCardProps {
  exhibitor: ExhibitorEvent
  lang: string
}

export default function ExhibitorCard({ exhibitor, lang }: ExhibitorCardProps) {
  const ex = exhibitor.exhibitor_id
  const translation = findTranslation(ex?.translations, lang)
  const companyName = translation?.company_name ?? exhibitor.nameboard ?? '—'
  const logoUrl = ex?.logo ? getDirectusMedia(typeof ex.logo === 'string' ? ex.logo : (ex.logo as any)?.id) : null

  return (
    <div className="group flex flex-col items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
      {/* Logo */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={companyName}
            width={80}
            height={80}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <span className="text-3xl font-bold text-gray-300">
            {companyName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-center text-gray-800 line-clamp-2 leading-snug">
        {companyName}
      </h3>

      {/* Booth */}
      {exhibitor.booth_number && (
        <span className="mt-2 text-xs text-gray-400">
          Booth {exhibitor.booth_number}
        </span>
      )}

      {/* Featured badge */}
      {exhibitor.is_featured && (
        <span
          className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white"
        >
          ★ Featured
        </span>
      )}

      {/* Website */}
      {ex?.website && (
        <a
          href={ex.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-primary)]"
          onClick={e => e.stopPropagation()}
        >
          Visit website →
        </a>
      )}
    </div>
  )
}
