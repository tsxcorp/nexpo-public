'use client'

import { useTranslation } from 'react-i18next'
import type { BoothType } from '@/directus/queries/floor-plans'

interface Props {
  boothTypes: BoothType[]
}

export function MapLegend({ boothTypes }: Props) {
  const { t } = useTranslation()

  if (boothTypes.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="text-xs font-medium text-gray-500 shrink-0">
        {t('floor_plan.legend')}:
      </span>
      {boothTypes.map(bt => (
        <div key={bt.id} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block shrink-0 border border-black/10"
            style={{ backgroundColor: bt.color }}
          />
          <span className="text-xs text-gray-700">{bt.name}</span>
        </div>
      ))}
    </div>
  )
}
