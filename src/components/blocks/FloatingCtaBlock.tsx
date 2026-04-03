'use client';

import React, { useState, useEffect } from 'react';
import { findTranslation } from '@/lib/utils/translation-helpers';

interface BlockTranslation {
  label?: string;
  url?: string;
  languages_code: string;
}

interface FloatingCtaBlockData {
  id?: string;
  position?: string | null;
  style?: string | null;
  show_after_scroll?: number | null;
  translations?: BlockTranslation[];
}

interface Props {
  data: FloatingCtaBlockData;
  lang: string;
}

// Safe URL: only allow https:// or relative paths, reject javascript:/data: schemes
function isSafeUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('javascript:') || url.startsWith('data:')) return false;
  return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/');
}

function getPositionClasses(position: string): string {
  switch (position) {
    case 'bottom-left':
      return 'fixed bottom-6 left-6';
    case 'bottom-center':
      return 'fixed bottom-6 left-1/2 -translate-x-1/2';
    case 'bottom-right':
    default:
      return 'fixed bottom-6 right-6';
  }
}

export default function FloatingCtaBlock({ data, lang }: Props) {
  const translation = findTranslation(data.translations, lang);
  const label = translation?.label || '';
  const url = translation?.url || '';
  const position = data.position || 'bottom-right';
  const buttonStyle = data.style || 'pill';
  const showAfterScroll = data.show_after_scroll;

  const [isVisible, setIsVisible] = useState(showAfterScroll == null);

  // Scroll listener — show button after scrolling N pixels
  useEffect(() => {
    if (showAfterScroll == null) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      setIsVisible(window.scrollY >= showAfterScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAfterScroll]);

  if (!label || !isSafeUrl(url)) return null;

  const positionClass = getPositionClasses(position);

  const buttonClass =
    buttonStyle === 'bar'
      ? 'fixed bottom-0 left-0 right-0 w-full py-4 px-6 text-center font-semibold text-white bg-[var(--color-primary,#4F80FF)] shadow-lg hover:opacity-90 transition-opacity z-40 text-sm'
      : `${positionClass} px-6 py-3 rounded-full font-semibold text-white bg-[var(--color-primary,#4F80FF)] shadow-lg hover:opacity-90 active:scale-95 transition-all z-40 text-sm`;

  return (
    <a
      href={url}
      className={`${buttonClass} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'} transition-all duration-300`}
      rel="noreferrer"
    >
      {label}
    </a>
  );
}
