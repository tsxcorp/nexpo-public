'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { findTranslation } from '@/lib/utils/translation-helpers';
import type { AgendaSession } from '@/directus/types';

interface AgendaPreviewBlockData {
  translations?: { languages_code: string; title?: string }[];
  max_items?: number;
  show_view_all_link?: boolean;
}

interface Props {
  data: AgendaPreviewBlockData;
  lang: string;
  agendaSessions: AgendaSession[];
  agendaUrl?: string;
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  return time.slice(0, 5); // HH:MM
}

export default function AgendaPreviewBlock({ data, lang, agendaSessions, agendaUrl }: Props) {
  const { t } = useTranslation();

  const title = findTranslation(data.translations, lang)?.title;

  const featured = agendaSessions.filter(s => s.is_featured || s.status === 'published');
  const items = data.max_items ? featured.slice(0, data.max_items) : featured.slice(0, 5);

  if (items.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-3xl mx-auto">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-[var(--color-primary)]">
            {title}
          </h2>
        )}
        <div className="space-y-3">
          {items.map(session => {
            const trans = findTranslation(session.translations, lang);
            const sessionTitle = trans?.title || '';
            const start = formatTime(session.start_time);
            const end = formatTime(session.end_time);
            const timeStr = start && end ? `${start} – ${end}` : start || end || '';

            return (
              <div
                key={session.id}
                className="flex gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                {timeStr && (
                  <div className="flex-shrink-0 w-24 text-center">
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      {timeStr}
                    </span>
                    {session.day_number && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Day {session.day_number}</p>
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{sessionTitle}</p>
                  {session.location && (
                    <p className="text-xs text-gray-500 mt-0.5">📍 {session.location}</p>
                  )}
                  {session.speakers && session.speakers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {session.speakers
                        .map(s => s.speakers_id?.name)
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {data.show_view_all_link && agendaUrl && (
          <div className="text-center mt-6">
            <Link
              href={agendaUrl}
              className="inline-flex items-center gap-1 text-sm font-semibold hover:underline text-[var(--color-primary)]"
            >
              {t('agenda_preview.view_all')} →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
