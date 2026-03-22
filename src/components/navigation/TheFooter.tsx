'use client';

import React, { useState, useEffect } from 'react';
import { Navigation, NavigationItem } from '@/directus/types';
import Link from 'next/link';
import { buildUrl, getCurrentLanguage } from '@/lib/utils/routing';
import { usePathname } from '@/lib/navigation';

interface TheFooterProps {
  navigation: Navigation | null;
  lang: string;
  pathname?: string;
}

// Helper function to generate URL for navigation items
function getNavigationUrl(item: NavigationItem, currentLang: string, currentPathname: string) {
  console.log('[getNavigationUrl] Called with:', { item, currentLang, currentPathname })
  
  let permalink = ''
  
  if (item.type === 'page' && typeof item.page !== 'string') {
    // Find translation for current language
    const translation = item.page?.translations?.find(t => 
      t.languages_code.startsWith(currentLang)
    )
    
    // Use current language translation if available, otherwise fallback to first translation
    permalink = translation?.permalink || item.page?.translations[0]?.permalink || ''
  } else {
    // For internal URLs, get the clean URL
    if (item.url?.startsWith('http')) {
      return item.url // External URL, return as is
    }
    
    permalink = item.url?.startsWith('/') ? item.url.slice(1) : item.url || ''
  }
  
  console.log('[getNavigationUrl] Permalink:', permalink)
  
  // Build URL using utility function with current pathname
  const result = buildUrl(currentLang, permalink, undefined, currentPathname)
  console.log('[getNavigationUrl] Result:', result)
  return result
}

// Nexpo X logo SVG
function NexpoLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="6" fill="white" fillOpacity="0.12" />
      <path d="M10 10L20 20M20 20L30 10M20 20L10 30M20 20L30 30" stroke="#4F80FF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function NexpoBar({ currentYear }: { currentYear: string }) {
  return (
    <div style={{ backgroundColor: '#06043E' }} className="w-full">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-16 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left: Nexpo brand */}
        <a
          href="https://nexpo.vn/dich-vu"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <NexpoLogo />
          <div className="flex flex-col leading-tight">
            <span className="text-white text-xs font-semibold tracking-wide">
              Event Website by{' '}
              <span style={{ color: '#4F80FF' }} className="font-bold">NEXPO</span>
            </span>
            <span className="text-white/50 text-[10px]">
              Business Platform &amp; Exhibition Operations
            </span>
          </div>
        </a>
        {/* Right: copyright */}
        <span className="text-white/40 text-[11px] whitespace-nowrap">
          © {currentYear} Nexpo Vietnam. All rights reserved.
        </span>
      </div>
    </div>
  );
}

function TheFooterContent({ navigation, lang, pathname = '/' }: TheFooterProps) {
  const currentLang = getCurrentLanguage(pathname);
  const [currentYear, setCurrentYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  return (
    <>
      {/* Site footer nav — only if navigation exists */}
      {navigation && Array.isArray(navigation.items) && navigation.items.length > 0 && (
        <footer className="bg-gray-100 py-8">
          <div className="container mx-auto flex flex-col items-center">
            <nav className="mb-4">
              <ul className="flex flex-wrap justify-center gap-6">
                {navigation.items.filter(Boolean).map((item: NavigationItem) => {
                  const title = item.translations[0]?.title || 'Untitled';
                  return (
                    <li key={item.id}>
                      <Link
                        href={getNavigationUrl(item, currentLang, pathname)}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </footer>
      )}
      {/* Nexpo branding bar — always visible */}
      <NexpoBar currentYear={currentYear} />
    </>
  );
}

// Client component wrapper
export default function TheFooter({ navigation, lang, pathname }: TheFooterProps) {
  // If pathname is provided, use it; otherwise fall back to usePathname hook
  const clientPathname = usePathname();
  const finalPathname = pathname || clientPathname;
  
  return <TheFooterContent navigation={navigation} lang={lang} pathname={finalPathname} />;
}