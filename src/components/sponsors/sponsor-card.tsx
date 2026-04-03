'use client'
/**
 * SponsorCard — single sponsor logo card within a tier grid.
 * Shows logo, company name, featured highlight, and website link.
 * Client component: uses onClick handler for nested website link.
 */
import Image from 'next/image'
import Link from 'next/link'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import { findTranslation } from '@/lib/utils/translation-helpers'
import type { SponsorEvent, SponsorTier } from '@/directus/types'

/** Map tier logo_display_size to pixel dimensions */
const LOGO_SIZE_MAP: Record<string, number> = {
  sm: 80,
  md: 120,
  lg: 160,
  xl: 200,
}

interface SponsorCardProps {
  sponsor: SponsorEvent
  logoSize: SponsorTier['logo_display_size']
  lang: string
  /** URL path to sponsors list — used to build detail link */
  basePath: string
}

export default function SponsorCard({ sponsor, logoSize, lang, basePath }: SponsorCardProps) {
  const sp = sponsor.sponsor_id
  const translation = findTranslation(sp?.translations, lang)
  const companyName = translation?.company_name ?? '—'
  const logoUrl = sp?.logo
    ? getDirectusMedia(typeof sp.logo === 'string' ? sp.logo : (sp.logo as { id: string })?.id)
    : null

  const px = LOGO_SIZE_MAP[logoSize ?? 'md'] ?? 120
  const isFeatured = sponsor.is_featured

  return (
    <Link
      href={`${basePath}/${sponsor.id}`}
      className={[
        'group flex flex-col items-center bg-white rounded-2xl shadow-sm border p-5',
        'hover:shadow-md hover:-translate-y-1 transition-all duration-200',
        isFeatured
          ? 'border-yellow-400 ring-2 ring-yellow-300/50'
          : 'border-gray-100',
      ].join(' ')}
    >
      {/* Featured badge */}
      {isFeatured && (
        <span className="self-end mb-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
          ★ Featured
        </span>
      )}

      {/* Logo */}
      <div
        className="flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-4"
        style={{ width: px, height: px }}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={companyName}
            width={px}
            height={px}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <span className="text-3xl font-bold text-gray-300">
            {companyName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Company name */}
      <p className="text-sm font-semibold text-center text-gray-800 line-clamp-2 leading-snug">
        {companyName}
      </p>

      {/* Website link — visible on hover; stopPropagation prevents outer Link navigation */}
      {sp?.website && (
        <a
          href={sp.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="mt-2 text-xs text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Visit website →
        </a>
      )}
    </Link>
  )
}
