'use client'

import { useTranslation } from 'react-i18next'

interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

export function MapZoomControls({ onZoomIn, onZoomOut, onFit }: Props) {
  const { t } = useTranslation()

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
      <button
        onClick={onZoomIn}
        aria-label={t('floor_plan.zoom_in')}
        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-lg leading-none select-none"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        aria-label={t('floor_plan.zoom_out')}
        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-lg leading-none select-none"
      >
        −
      </button>
      <button
        onClick={onFit}
        aria-label={t('floor_plan.fit_view')}
        title={t('floor_plan.fit_view')}
        className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors select-none"
      >
        {/* Fit/reset icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
          />
        </svg>
      </button>
    </div>
  )
}
