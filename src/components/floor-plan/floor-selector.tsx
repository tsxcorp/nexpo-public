'use client'

import { useTranslation } from 'react-i18next'
import type { FloorPlan } from '@/directus/queries/floor-plans'

interface Props {
  floorPlans: FloorPlan[]
  selectedId: string
  onSelect: (id: string) => void
}

// Show tabs if ≤4 floors, dropdown otherwise
export function FloorSelector({ floorPlans, selectedId, onSelect }: Props) {
  const { t } = useTranslation()

  if (floorPlans.length === 0) return null

  if (floorPlans.length <= 4) {
    return (
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {floorPlans.map(plan => (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              selectedId === plan.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {plan.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <select
      value={selectedId}
      onChange={e => onSelect(e.target.value)}
      className="select select-bordered select-sm text-sm"
      aria-label={t('floor_plan.select_floor')}
    >
      {floorPlans.map(plan => (
        <option key={plan.id} value={plan.id}>
          {plan.name}
        </option>
      ))}
    </select>
  )
}
