import React from 'react';
import { getDirectusMedia } from '@/lib/utils/directus-helpers';
import { findTranslation } from '@/lib/utils/translation-helpers';
import type { ExhibitorEvent } from '@/directus/types';

interface ExhibitorsBlockData {
  translations?: { languages_code: string; title?: string }[];
  max_count?: number;
  show_featured_only?: boolean;
}

interface Props {
  data: ExhibitorsBlockData;
  lang: string;
  exhibitors: ExhibitorEvent[];
}

export default function ExhibitorsBlock({ data, lang, exhibitors }: Props) {
  const title = findTranslation(data.translations, lang)?.title;

  let items = exhibitors;
  if (data.show_featured_only) items = items.filter(e => e.is_featured);
  if (data.max_count) items = items.slice(0, data.max_count);

  if (items.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      {title && (
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" className="text-[var(--color-primary)]">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-10">
        {items.map(ev => {
          const exhibitor = typeof ev.exhibitor_id === 'object' ? ev.exhibitor_id : null;
          if (!exhibitor) return null;
          const trans = findTranslation(exhibitor.translations, lang);
          const name = trans?.company_name || ev.nameboard || '';
          const logo = exhibitor.logo;

          return (
            <div
              key={ev.id}
              className="group flex flex-col items-center gap-3"
            >
              {/* Logo area */}
              <div className="w-full flex items-center justify-center h-20 px-4">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getDirectusMedia(logo as string)}
                    alt={name}
                    className="max-h-20 max-w-full w-auto object-contain grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all duration-300"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <span className="text-2xl font-bold text-gray-400">{name.charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Booth badge */}
              {ev.booth_number && (
                <span
                  className="text-[10px] font-semibold text-white px-2.5 py-0.5 rounded-full"
                  className="bg-[var(--color-primary)]"
                >
                  Booth {ev.booth_number}
                </span>
              )}

              {/* Company name */}
              {name && (
                <p className="text-xs font-medium text-gray-600 text-center leading-snug line-clamp-2 group-hover:text-gray-900 transition-colors">
                  {name}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
