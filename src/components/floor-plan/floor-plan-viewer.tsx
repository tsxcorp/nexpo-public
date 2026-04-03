'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { FloorPlan, Booth, BoothType, PublicZone } from '@/directus/queries/floor-plans'
import { FloorSelector } from './floor-selector'
import { MapSearchBar } from './map-search-bar'
import { MapLegend } from './map-legend'
import { MapZoomControls } from './map-zoom-controls'
import { FloorPlanSvg } from './floor-plan-svg'
import { BoothPopup } from './booth-popup'
import { useMapInteraction } from './hooks/use-map-interaction'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  floorPlans: FloorPlan[]
  booths: Booth[]
  boothTypes: BoothType[]
  zones?: PublicZone[]
  lang: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getExhibitorSearchText(booth: Booth, lang: string): string {
  const ex = booth.exhibitor_event
  if (!ex) return booth.booth_number
  const exData = ex.exhibitor_id
  const name =
    (typeof exData === 'object' && exData !== null
      ? exData.translations?.find(t => t.languages_code?.startsWith(lang))?.company_name
        ?? exData.translations?.[0]?.company_name
      : null)
    ?? ex.nameboard
    ?? ''
  return `${booth.booth_number} ${name}`.toLowerCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FloorPlanViewer({ floorPlans, booths, boothTypes, zones = [], lang }: Props) {
  const { t } = useTranslation()

  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<string>(
    floorPlans[0]?.id ?? ''
  )
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { zoom, panX, panY, zoomIn, zoomOut, fitView, ...interactionHandlers } =
    useMapInteraction(1)

  // Active floor plan
  const activePlan = useMemo(
    () => floorPlans.find(p => p.id === selectedFloorPlanId) ?? floorPlans[0] ?? null,
    [floorPlans, selectedFloorPlanId]
  )

  // Booths for the active floor plan
  const activePlanBooths = useMemo(
    () => booths.filter(b => b.floor_plan_id === selectedFloorPlanId),
    [booths, selectedFloorPlanId]
  )

  // Zones for the active floor plan
  const activePlanZones = useMemo(
    () => zones.filter(z => z.floor_plan_id === selectedFloorPlanId),
    [zones, selectedFloorPlanId]
  )

  // Search filtering — returns Set of matching booth IDs
  const isSearching = searchQuery.trim().length > 0
  const highlightedBoothIds = useMemo<Set<string>>(() => {
    if (!isSearching) return new Set()
    const q = searchQuery.trim().toLowerCase()
    return new Set(
      activePlanBooths
        .filter(b => getExhibitorSearchText(b, lang).includes(q))
        .map(b => b.id)
    )
  }, [activePlanBooths, searchQuery, isSearching, lang])

  // Selected booth object (for popup)
  const selectedBooth = useMemo(
    () => booths.find(b => b.id === selectedBoothId) ?? null,
    [booths, selectedBoothId]
  )

  const handleBoothClick = (booth: Booth) => {
    setSelectedBoothId(prev => (prev === booth.id ? null : booth.id))
  }

  const handleFloorSelect = (id: string) => {
    setSelectedFloorPlanId(id)
    setSelectedBoothId(null)
    fitView()
  }

  // Empty state
  if (!activePlan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg className="w-12 h-12 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-sm">{t('floor_plan.no_floor_plans')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <FloorSelector
          floorPlans={floorPlans}
          selectedId={selectedFloorPlanId}
          onSelect={handleFloorSelect}
        />
        <div className="flex-1" />
        <MapSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={isSearching ? highlightedBoothIds.size : undefined}
        />
      </div>

      {/* ── SVG canvas ──────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-slate-100">
        <FloorPlanSvg
          floorPlan={activePlan}
          booths={activePlanBooths}
          boothTypes={boothTypes}
          zones={activePlanZones}
          selectedBoothId={selectedBoothId}
          highlightedBoothIds={highlightedBoothIds}
          isSearching={isSearching}
          onBoothClick={handleBoothClick}
          zoom={zoom}
          panX={panX}
          panY={panY}
          handlers={interactionHandlers}
          lang={lang}
        />

        <MapZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitView} />
      </div>

      {/* ── Legend bar ──────────────────────────────────────────────────── */}
      {boothTypes.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-100 shrink-0 overflow-x-auto">
          <MapLegend boothTypes={boothTypes} />
        </div>
      )}

      {/* ── Booth popup (AnimatePresence for exit animation) ────────────── */}
      <AnimatePresence>
        {selectedBooth && (
          <BoothPopup
            key={selectedBooth.id}
            booth={selectedBooth}
            lang={lang}
            onClose={() => setSelectedBoothId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
