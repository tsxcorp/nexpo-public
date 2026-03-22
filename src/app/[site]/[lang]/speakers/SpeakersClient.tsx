'use client'
import { useState, useMemo } from 'react'
import SpeakerCard from '@/components/SpeakerCard'
import type { Speaker, SpeakerTranslation } from '@/directus/types'

interface Props {
  speakers: Speaker[]
  lang: string
  t: {
    search_placeholder: string
    no_speakers: string
  }
}

function getDisplayName(speaker: Speaker, lang: string): string {
  const t = speaker.translations?.find(tr => tr.languages_code?.startsWith(lang))
    ?? speaker.translations?.[0]
  return t?.name ?? speaker.name ?? ''
}

export default function SpeakersClient({ speakers, lang, t }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Speaker | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return speakers
    return speakers.filter(sp => {
      const name = getDisplayName(sp, lang)
      const company = sp.company ?? ''
      return name.toLowerCase().includes(q) || company.toLowerCase().includes(q)
    })
  }, [speakers, query, lang])

  return (
    <>
      {/* Search */}
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
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          </svg>
          <p>{t.no_speakers}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(sp => (
            <SpeakerCard key={sp.id} speaker={sp} lang={lang} onClick={() => setSelected(sp)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <SpeakerModal speaker={selected} lang={lang} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

function SpeakerModal({ speaker, lang, onClose }: { speaker: Speaker; lang: string; onClose: () => void }) {
  const translation = speaker.translations?.find(t => t.languages_code?.startsWith(lang))
    ?? speaker.translations?.[0]
  const displayName = translation?.name ?? speaker.name
  const displayTitle = translation?.title ?? speaker.position
  const displayCompany = translation?.company ?? speaker.company
  const displayBio = translation?.bio ?? speaker.bio

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
            {speaker.photo ? (
              <img
                src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${speaker.photo}`}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl font-bold">
                {displayName?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{displayName}</h2>
            {displayTitle && <p className="text-sm text-gray-500">{displayTitle}</p>}
            {displayCompany && (
              <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                {displayCompany}
              </p>
            )}
          </div>
        </div>

        {displayBio && (
          <div
            className="mt-5 text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: displayBio }}
          />
        )}

        {speaker.linkedin_url && (
          <a
            href={speaker.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            LinkedIn →
          </a>
        )}
      </div>
    </div>
  )
}
