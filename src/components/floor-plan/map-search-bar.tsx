'use client'

import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  onChange: (value: string) => void
  resultCount?: number
}

export function MapSearchBar({ value, onChange, resultCount }: Props) {
  const { t } = useTranslation()

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative">
        {/* Magnifying glass icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('floor_plan.search_placeholder')}
          className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:border-transparent w-48 sm:w-64"
          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
        />
      </div>

      {/* Result count badge — only visible while searching */}
      {value.trim() !== '' && resultCount !== undefined && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
          {resultCount} {t('floor_plan.results')}
        </span>
      )}
    </div>
  )
}
