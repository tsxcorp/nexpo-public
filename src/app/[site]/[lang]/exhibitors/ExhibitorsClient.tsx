'use client'
import { useState, useMemo } from 'react'
import ExhibitorCard from '@/components/ExhibitorCard'
import type { ExhibitorEvent } from '@/directus/types'

interface Props {
  exhibitors: ExhibitorEvent[]
  lang: string
  t: {
    search_placeholder: string
    filter_all: string
    no_results: string
  }
}

export default function ExhibitorsClient({ exhibitors, lang, t }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return exhibitors
    return exhibitors.filter(ex => {
      const exData = ex.exhibitor_id
      const name = exData?.translations?.find(tr => tr.languages_code?.startsWith(lang))?.company_name
        ?? exData?.translations?.[0]?.company_name
        ?? ex.nameboard
        ?? ''
      return (
        name.toLowerCase().includes(q) ||
        (ex.booth_number ?? '').toLowerCase().includes(q)
      )
    })
  }, [exhibitors, query, lang])

  return (
    <>
      {/* Search bar */}
      <div className="max-w-md mx-auto mb-10">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.search_placeholder}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
          </svg>
          <p>{t.no_results}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(ex => (
            <ExhibitorCard key={ex.id} exhibitor={ex} lang={lang} />
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        {filtered.length} / {exhibitors.length}
      </p>
    </>
  )
}
