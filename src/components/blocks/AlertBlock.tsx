'use client';

import React, { useState, useEffect } from 'react';
import { findTranslation } from '@/lib/utils/translation-helpers';

interface BlockTranslation {
  message?: string;
  link_label?: string;
  link_url?: string;
  languages_code: string;
}

interface AlertBlockData {
  id?: string;
  variant?: string | null;
  is_dismissible?: boolean | null;
  icon?: string | null;
  translations?: BlockTranslation[];
}

interface Props {
  data: AlertBlockData;
  lang: string;
}

const VARIANT_CONFIG = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-800',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
} as const;

// Safe URL validation — reject javascript: and data: schemes
function isSafeLinkUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trim();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return false;
  return true;
}

export default function AlertBlock({ data, lang }: Props) {
  const translation = findTranslation(data.translations, lang);
  const message = translation?.message || '';
  const linkLabel = translation?.link_label || '';
  const linkUrl = translation?.link_url || '';
  const variant = ((data.variant as keyof typeof VARIANT_CONFIG) || 'info');
  const isDismissible = data.is_dismissible !== false; // default true
  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.info;

  // Persist dismiss state per session, keyed by block id
  const storageKey = `alert-dismissed-${data.id || 'default'}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (data.id && typeof sessionStorage !== 'undefined') {
      setDismissed(sessionStorage.getItem(storageKey) === '1');
    }
  }, [storageKey, data.id]);

  const handleDismiss = () => {
    setDismissed(true);
    if (data.id && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(storageKey, '1');
    }
  };

  if (!message || dismissed) return null;

  return (
    <div className={`w-full border-y ${config.bg} ${config.border}`} role="alert">
      <div className="mx-auto max-w-screen-xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Icon — inline SVG avoids icon library dependency in this small component */}
          <svg
            className={`w-5 h-5 flex-shrink-0 ${config.text}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={config.iconPath} />
          </svg>

          <p className={`flex-1 text-sm font-medium ${config.text}`}>
            {message}
            {linkLabel && isSafeLinkUrl(linkUrl) && (
              <a
                href={linkUrl}
                className={`ml-2 underline font-semibold hover:opacity-80 transition-opacity ${config.text}`}
                rel="noreferrer"
              >
                {linkLabel}
              </a>
            )}
          </p>

          {isDismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss alert"
              className={`flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors ${config.text}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
