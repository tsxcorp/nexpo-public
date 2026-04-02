'use client'
import React, { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useResizeObserver from '@/hooks/useResizeObserver'
import { useIntersection } from 'react-use'
import directusApi from '@/directus/client'
import { readItems } from '@directus/sdk'
import BlockContainer from '@/components/BlockContainer'
import { findTranslation } from '@/lib/utils/translation-helpers'
import TypographyTitle from '@/components/typography/TypographyTitle'
import TypographyHeadline from '@/components/typography/TypographyHeadline'
import TypographyProse from '@/components/typography/TypographyProse'
import TeamCard from '@/components/TeamCard'
import { BlockTeam, Team } from '@/directus/types'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface SocialMedia {
  service: string
  url: string
}

interface TeamMember {
  id: string
  name: string
  job_title?: string
  image?: any
  bio?: string
  social_media?: SocialMedia[]
  role?: string
  translations?: Array<{
    job_title?: string
    bio?: string
    languages_code: string
  }>
}

interface TeamBlockProps {
  data: {
    title?: string
    headline?: string
    content?: string
    translations?: Array<{
      title?: string
      headline?: string
      content?: string
      languages_code: string
    }>
  }
  lang: string
  teams?: TeamMember[]
}

const socialIcons: Record<string, ReactElement> = {
  twitter: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.47.69a4.3 4.3 0 001.88-2.37 8.59 8.59 0 01-2.72 1.04A4.28 4.28 0 0016.11 4c-2.37 0-4.29 1.92-4.29 4.29 0 .34.04.67.11.99C7.69 9.13 4.07 7.38 1.64 4.7c-.37.64-.58 1.38-.58 2.17 0 1.5.76 2.82 1.92 3.6-.71-.02-1.38-.22-1.97-.54v.05c0 2.1 1.5 3.85 3.5 4.25-.36.1-.74.16-1.13.16-.28 0-.54-.03-.8-.08.54 1.7 2.1 2.94 3.95 2.97A8.6 8.6 0 012 19.54a12.13 12.13 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.37-.01-.56A8.7 8.7 0 0024 4.59a8.48 8.48 0 01-2.54.7z"/></svg>,
  facebook: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>,
  linkedin: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.379-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.601v5.595z"/></svg>,
  instagram: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.069 1.646.069 4.851s-.011 3.584-.069 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.011-4.85-.069c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.425 3.678 1.406c-.98.98-1.274 2.092-1.334 3.374C2.013 8.332 2 8.741 2 12c0 3.259.013 3.668.072 4.948.06 1.282.354 2.394 1.334 3.374.981.981 2.093 1.274 3.374 1.334C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.282-.06 2.394-.353 3.374-1.334.981-.98 1.274-2.092 1.334-3.374.059-1.28.072-1.689.072-4.948 0-3.259-.013-3.668-.072-4.948-.06-1.282-.353-2.394-1.334-3.374-.98-.981-2.092-1.274-3.374-1.334C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-11.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>,
  github: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.415-4.042-1.415-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 013.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.371.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>,
}

const TeamBlock = ({ data, lang, teams = [] }: TeamBlockProps) => {
  // Translation logic
  const translation = findTranslation(data.translations, lang);
  const title = translation?.title || data.title;
  const headline = translation?.headline || data.headline;
  const content = translation?.content || data.content;

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <BlockContainer>
        <div className="max-w-4xl mx-auto text-center mb-12">
          {title && <TypographyTitle className="font-[var(--font-display)] text-[var(--color-gray)] mb-4">{title}</TypographyTitle>}
          {headline && (
            <TypographyHeadline
              content={headline}
              size="xl"
              className="font-[var(--font-display) ] font-semibold text-[var(--color-primary)] mb-4"
            />
          )}
          {content && (
            <TypographyProse content={content} className="text-gray-500" />
          )}
        </div>
        {(!teams || teams.length === 0) ? (
          <div className="text-gray-400 mt-8 text-center">No team members found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-12">
            {teams.map((member, idx) => {
              let imageUrl = '';
              if (typeof member.image === 'string') {
                imageUrl = member.image;
              } else if (member.image && typeof member.image === 'object' && 'id' in member.image) {
                imageUrl = getDirectusMedia(member.image.id);
              }
              const memberTranslation = findTranslation(member.translations, lang);
              const displayJobTitle = memberTranslation?.job_title || member.job_title;
              const displayBio = memberTranslation?.bio || member.bio;
              return (
                <div
                  key={member.id || idx}
                  className="relative rounded-2xl shadow-xl flex flex-col items-center p-8 text-center group transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl bg-gradient-to-br from-white via-[var(--color-primary)/10] to-gray-100 animate-fade-in"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="relative w-42 h-42 mx-auto mb-4 transition-transform duration-500 scale-100 group-hover:scale-105">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={member.name}
                        width={168}
                        height={168}
                        className="w-42 h-42 rounded-full object-cover border-2 border-[var(--color-primary)] shadow-lg"
                      />
                    ) : (
                      <span className="inline-block w-28 h-28 rounded-xl bg-gray-700 flex items-center justify-center text-4xl text-gray-400 border-4 border-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0v.75a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75v-.75z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center transition-opacity duration-500 opacity-100">
                    <h3 className="text-lg font-bold text-[var(--color-primary)] mt-2">{member.name}</h3>
                    {displayJobTitle && (
                      <p className="text-[var(--color-gray)] text-sm font-semibold mb-2">{displayJobTitle}</p>
                    )}
                    {member.role && (
                      <span className="inline-block bg-[var(--color-primary)] text-[var(--color-gray)] text-xs font-semibold rounded px-3 py-1 mb-2 mt-1 uppercase tracking-wide">
                        {member.role}
                      </span>
                    )}
                    {displayBio && (
                      <div
                        className="text-[var(--color-gray)] text-sm mt-2"
                        dangerouslySetInnerHTML={{ __html: displayBio }}
                      />
                    )}
                    {Array.isArray(member.social_media) && member.social_media.length > 0 && (
                      <div className="flex flex-row gap-3 mt-4 justify-center">
                        {member.social_media.map((sm, smIdx) => (
                          <a
                            key={sm.service + sm.url + smIdx}
                            href={sm.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-900 hover:bg-[var(--color-primary)] text-white rounded-full p-2 shadow transition-colors border border-gray-700 hover:border-primary"
                            aria-label={sm.service}
                          >
                            {socialIcons[sm.service?.toLowerCase?.()] || <span className="w-5 h-5">🔗</span>}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BlockContainer>
    </section>
  )
}

export default TeamBlock
