'use client'

import { useTranslation } from 'react-i18next'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import type { FloorPlan, Booth, BoothType } from '@/directus/queries/floor-plans'
import type { MapInteractionHandlers } from './hooks/use-map-interaction'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Scale factor: SVG units per meter */
const SCALE = 100

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  floorPlan: FloorPlan
  booths: Booth[]
  boothTypes: BoothType[]
  selectedBoothId: string | null
  highlightedBoothIds: Set<string>
  isSearching: boolean
  onBoothClick: (booth: Booth) => void
  zoom: number
  panX: number
  panY: number
  handlers: Pick<
    MapInteractionHandlers,
    'onWheel' | 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onMouseDown' | 'onMouseMove' | 'onMouseUp'
  >

  lang: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getBoothColor(booth: Booth, boothTypes: BoothType[]): string {
  if (booth.booth_type?.color) return booth.booth_type.color
  const found = boothTypes.find(bt => bt.id === booth.booth_type_id)
  return found?.color ?? '#94a3b8'
}

function getExhibitorName(booth: Booth, lang: string): string | null {
  const ex = booth.exhibitor_event
  if (!ex) return null
  if (ex.exhibitor_id && typeof ex.exhibitor_id === 'object') {
    const tr = ex.exhibitor_id.translations
    return (
      tr?.find(t => t.languages_code?.startsWith(lang))?.company_name
      ?? tr?.[0]?.company_name
      ?? ex.nameboard
      ?? null
    )
  }
  return ex.nameboard ?? null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FloorPlanSvg({
  floorPlan,
  booths,
  boothTypes,
  selectedBoothId,
  highlightedBoothIds,
  isSearching,
  onBoothClick,
  zoom,
  panX,
  panY,
  handlers,
  lang,
}: Props) {
  const { t } = useTranslation()

  const svgWidth = floorPlan.width * SCALE
  const svgHeight = floorPlan.height * SCALE
  // Cache-bust background image URL — use file ID hash to bypass browser/CDN cache
  const bgBaseUrl = floorPlan.background_image ? getDirectusMedia(floorPlan.background_image) : null
  const bgUrl = bgBaseUrl ? `${bgBaseUrl}?v=${floorPlan.background_image}` : null

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
        transformOrigin: 'center center',
        transition: 'transform 0.05s linear',
      }}
      onWheel={handlers.onWheel}
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      onMouseDown={handlers.onMouseDown}
      onMouseMove={handlers.onMouseMove}
      onMouseUp={handlers.onMouseUp}
      onMouseLeave={handlers.onMouseUp}
    >
      {/* Background */}
      <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#f8fafc" />

      {/* Background image overlay */}
      {bgUrl && (
        <image
          href={bgUrl}
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          preserveAspectRatio="xMidYMid meet"
          opacity={0.35}
        />
      )}

      {/* Booths */}
      {booths.map(booth => {
        const x = booth.position_x * SCALE
        const y = booth.position_y * SCALE
        const w = booth.width * SCALE
        const h = booth.height * SCALE
        const cx = x + w / 2
        const cy = y + h / 2
        const color = getBoothColor(booth, boothTypes)
        const isSelected = selectedBoothId === booth.id
        const isHighlighted = highlightedBoothIds.has(booth.id)
        const isDimmed = isSearching && !isHighlighted

        const exhibitorName = getExhibitorName(booth, lang)

        // Determine fill opacity
        const fillOpacity = isDimmed ? 0.2 : 0.8

        return (
          <g
            key={booth.id}
            transform={booth.rotation ? `rotate(${booth.rotation}, ${cx}, ${cy})` : undefined}
            onClick={() => onBoothClick(booth)}
            style={{ cursor: 'pointer' }}
            aria-label={`${t('floor_plan.booth_number_label')} ${booth.booth_number}`}
            role="button"
          >
            {/* Glow for highlighted booths during search */}
            {isHighlighted && (
              <rect
                x={x - 3}
                y={y - 3}
                width={w + 6}
                height={h + 6}
                rx={4}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={4}
                strokeOpacity={0.5}
              />
            )}

            {/* Main booth rect */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={3}
              fill={color}
              fillOpacity={fillOpacity}
              stroke={isSelected ? '#1d4ed8' : color}
              strokeWidth={isSelected ? 3 : 1}
              strokeOpacity={isDimmed ? 0.3 : 1}
            />

            {/* Booth number — always shown */}
            <text
              x={cx}
              y={exhibitorName ? cy - (h > 60 ? 10 : 0) : cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(10, Math.min(14, w * 0.18))}
              fontWeight="600"
              fill="#1e293b"
              fillOpacity={isDimmed ? 0.3 : 1}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {booth.booth_number}
            </text>

            {/* Exhibitor name — only if booth is tall enough */}
            {exhibitorName && h > 50 && (
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(8, Math.min(11, w * 0.14))}
                fill="#334155"
                fillOpacity={isDimmed ? 0.2 : 0.9}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {/* Truncate long names */}
                {exhibitorName.length > 14 ? exhibitorName.slice(0, 13) + '…' : exhibitorName}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
