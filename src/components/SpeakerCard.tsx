'use client'
import Image from 'next/image'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import type { Speaker, SpeakerTranslation } from '@/directus/types'

interface SpeakerCardProps {
  speaker: Speaker
  lang: string
  onClick?: () => void
}

function getTranslation(translations: SpeakerTranslation[] | undefined, lang: string) {
  if (!translations?.length) return null
  const directusLang = lang === 'en' ? 'en-US' : 'vi-VN'
  return (
    translations.find(t => t.languages_code === directusLang) ??
    translations.find(t => t.languages_code?.startsWith(lang)) ??
    translations[0]
  )
}

export default function SpeakerCard({ speaker, lang, onClick }: SpeakerCardProps) {
  const translation = getTranslation(speaker.translations, lang)
  const displayName = translation?.name ?? speaker.name
  const displayTitle = translation?.title ?? speaker.position
  const displayCompany = translation?.company ?? speaker.company
  const photoUrl = speaker.photo ? getDirectusMedia(speaker.photo) : null

  return (
    <div
      className="flex flex-col items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mb-4 border-2 border-gray-200">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={displayName}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0" />
          </svg>
        )}
      </div>

      <h3 className="text-sm font-bold text-gray-800 text-center">{displayName}</h3>

      {displayTitle && (
        <p className="mt-1 text-xs text-gray-500 text-center">{displayTitle}</p>
      )}

      {displayCompany && (
        <p className="mt-0.5 text-xs font-medium text-center" style={{ color: 'var(--color-primary)' }}>
          {displayCompany}
        </p>
      )}

      {speaker.linkedin_url && (
        <a
          href={speaker.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-gray-400 hover:text-blue-600 transition-colors"
          onClick={e => e.stopPropagation()}
          aria-label="LinkedIn"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
        </a>
      )}
    </div>
  )
}
