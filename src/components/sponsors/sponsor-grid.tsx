/**
 * SponsorGrid — renders one tier section with a colored heading
 * and a responsive grid of SponsorCard components.
 *
 * Grid column count varies inversely with logo size:
 *   xl → 3 cols desktop  (fewer, bigger logos)
 *   lg → 4 cols desktop
 *   md → 5 cols desktop
 *   sm → 6 cols desktop
 */
import { findTranslation } from '@/lib/utils/translation-helpers'
import SponsorCard from './sponsor-card'
import type { SponsorEvent, SponsorTier } from '@/directus/types'

/** Tailwind grid-cols classes by tier logo_size */
const GRID_COLS: Record<string, string> = {
  xl: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3',
  lg: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
  sm: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
}

interface SponsorGridProps {
  tier: SponsorTier
  sponsors: SponsorEvent[]
  lang: string
  /** Absolute path prefix to build sponsor detail links, e.g. "/my-site/vi/sponsors" */
  basePath: string
}

export default function SponsorGrid({ tier, sponsors, lang, basePath }: SponsorGridProps) {
  const translation = findTranslation(tier.translations, lang)
  const tierName = translation?.name ?? tier.id
  const logoSize = tier.logo_size ?? 'md'
  const cols = GRID_COLS[logoSize] ?? GRID_COLS.md

  // Accent bar color: use tier color if valid hex, else primary
  const accentColor = tier.color ?? 'var(--color-primary)'

  return (
    <section className="mb-12">
      {/* Tier heading with colored accent bar */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className="inline-block w-1.5 h-7 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
        <h2
          className="text-xl font-bold text-gray-800"
          style={{ color: accentColor !== 'var(--color-primary)' ? accentColor : undefined }}
        >
          {tierName}
        </h2>
      </div>

      {/* Sponsor logo grid */}
      <div className={`grid ${cols} gap-4`}>
        {sponsors.map(sponsor => (
          <SponsorCard
            key={sponsor.id}
            sponsor={sponsor}
            logoSize={logoSize}
            lang={lang}
            basePath={basePath}
          />
        ))}
      </div>
    </section>
  )
}
