import React from 'react';
import Link from 'next/link';
import type { EventBasicInfo } from '@/directus/types';

interface EventInfoBlockData {
  translations?: { languages_code: string; title?: string }[];
  show_date?: boolean;
  show_location?: boolean;
  show_organizer?: boolean;
  show_registration_cta?: boolean;
}

interface Props {
  data: EventInfoBlockData;
  lang: string;
  event: EventBasicInfo | null | undefined;
  registerUrl?: string;
}

function formatDateLong(dateStr: string | null | undefined, lang: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function EventInfoBlock({ data, lang, event, registerUrl }: Props) {
  if (!event) return null;

  const title = data.translations?.find(t => t.languages_code?.startsWith(lang))?.title
    || data.translations?.[0]?.title;

  const showDate = data.show_date !== false;
  const showLocation = data.show_location !== false;
  const showOrganizer = data.show_organizer !== false;
  const showCta = data.show_registration_cta !== false;

  const startDate = formatDateLong(event.start_date, lang);
  const endDate = formatDateLong(event.end_date, lang);
  const dateStr = startDate === endDate || !endDate ? startDate : `${startDate} – ${endDate}`;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-2xl mx-auto">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: 'var(--color-primary)' }}>
            {title}
          </h2>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {showDate && dateStr && (
            <div className="flex items-start gap-4 p-5">
              <span className="text-2xl flex-shrink-0">📅</span>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-0.5">
                  {lang === 'vi' ? 'Thời gian' : 'Date & Time'}
                </p>
                <p className="text-sm font-semibold text-gray-900">{dateStr}</p>
              </div>
            </div>
          )}
          {showLocation && event.location && (
            <div className="flex items-start gap-4 p-5">
              <span className="text-2xl flex-shrink-0">📍</span>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-0.5">
                  {lang === 'vi' ? 'Địa điểm' : 'Location'}
                </p>
                <p className="text-sm font-semibold text-gray-900">{event.location}</p>
              </div>
            </div>
          )}
          {showOrganizer && event.name && (
            <div className="flex items-start gap-4 p-5">
              <span className="text-2xl flex-shrink-0">🏢</span>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-0.5">
                  {lang === 'vi' ? 'Sự kiện' : 'Event'}
                </p>
                <p className="text-sm font-semibold text-gray-900">{event.name}</p>
              </div>
            </div>
          )}
        </div>

        {showCta && registerUrl && (
          <div className="text-center mt-6">
            <Link
              href={registerUrl}
              className="inline-block px-8 py-3 rounded-full text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {lang === 'vi' ? 'Đăng ký tham dự' : 'Register Now'}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
