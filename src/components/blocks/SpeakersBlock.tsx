import React from 'react';
import Image from 'next/image';
import { getDirectusMedia } from '@/lib/utils/directus-helpers';
import type { Speaker } from '@/directus/types';

interface SpeakersBlockData {
  translations?: { languages_code: string; title?: string }[];
  max_count?: number;
}

interface Props {
  data: SpeakersBlockData;
  lang: string;
  speakers: Speaker[];
}

export default function SpeakersBlock({ data, lang, speakers }: Props) {
  const title = data.translations?.find(t => t.languages_code?.startsWith(lang))?.title
    || data.translations?.[0]?.title;

  const items = data.max_count ? speakers.slice(0, data.max_count) : speakers;

  if (items.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      {title && (
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" style={{ color: 'var(--color-primary)' }}>
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((speaker, idx) => {
          const trans = speaker.translations?.find(t => t.languages_code?.startsWith(lang))
            || speaker.translations?.[0];
          const name = trans?.name || speaker.name || '';
          const position = trans?.title || speaker.position || '';
          const company = trans?.company || speaker.company || '';
          const photoUrl = speaker.photo ? getDirectusMedia(speaker.photo as string) : null;

          return (
            <div
              key={speaker.id}
              className="group flex flex-col items-center text-center bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Photo */}
              <div className="mb-4">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={name}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full object-cover border-2 shadow-sm"
                    style={{ borderColor: 'var(--color-primary)' }}
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Info */}
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{name}</h3>
              {position && (
                <p className="text-xs text-gray-500 mt-1 leading-tight">{position}</p>
              )}
              {company && (
                <p
                  className="text-xs font-semibold mt-1 leading-tight"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {company}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
