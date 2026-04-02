'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { findTranslation } from '@/lib/utils/translation-helpers';

interface CountdownBlockData {
  translations?: { languages_code: string; title?: string }[];
  target_date?: string | null;
}

interface Props {
  data: CountdownBlockData;
  lang: string;
  eventStartDate?: string | null; // fallback from siteData.event.start_date
}

function calcTimeLeft(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownBlock({ data, lang, eventStartDate }: Props) {
  const targetDate = data.target_date || eventStartDate;
  const { t } = useTranslation();

  const title = findTranslation(data.translations, lang)?.title;

  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calcTimeLeft> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!targetDate) return;
    setMounted(true);
    setTimeLeft(calcTimeLeft(targetDate));
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return null;

  const labels = {
    days: t('countdown.days'),
    hours: t('countdown.hours'),
    minutes: t('countdown.minutes'),
    seconds: t('countdown.seconds'),
  };

  const finished = mounted && !timeLeft;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-2xl mx-auto text-center">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-[var(--color-primary)]">
            {title}
          </h2>
        )}
        {finished ? (
          <p className="text-lg font-semibold text-gray-600">
            {t('countdown.started')}
          </p>
        ) : (
          <div className="flex items-center justify-center gap-3 md:gap-6">
            {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit, i) => (
              <React.Fragment key={unit}>
                <div className="flex flex-col items-center">
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg bg-[var(--color-primary)]"
                  >
                    {mounted && timeLeft ? String(timeLeft[unit]).padStart(2, '0') : '--'}
                  </div>
                  <span className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase mt-1.5 tracking-wider">
                    {labels[unit]}
                  </span>
                </div>
                {i < 3 && (
                  <span className="text-2xl font-bold text-gray-300 mb-4">:</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
