'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navigation, NavigationItem } from '@/directus/types';
import { useTheme } from '@/components/providers/ThemeProvider';
import LocaleSwitcher from '@/components/global/LocaleSwitcher';
import { getDirectusMedia } from '@/lib/utils/directus-helpers';
import { buildUrl, getCurrentLanguage } from '@/lib/utils/routing';
import { usePathname } from '@/lib/navigation';

interface TheHeaderProps {
  navigation: Navigation | null;
  lang: string;
  site?: any;
  siteData?: any;
  translations?: any;
  pathname?: string;
}

function getNavigationUrl(item: NavigationItem, currentLang: string, currentPathname: string) {
  let permalink = '';
  if (item.type === 'page' && typeof item.page !== 'string') {
    const translation = item.page?.translations?.find(t => t.languages_code?.startsWith(currentLang));
    permalink = translation?.permalink || item.page?.translations[0]?.permalink || '';
  } else {
    if (item.url?.startsWith('http')) return item.url;
    permalink = item.url?.startsWith('/') ? item.url.slice(1) : item.url || '';
  }
  return buildUrl(currentLang, permalink, undefined, currentPathname);
}

function formatDate(dateStr: string | null | undefined, lang: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function TheHeaderContent({ navigation, lang, site, siteData, translations, pathname = '/' }: TheHeaderProps) {
  const { theme } = useTheme();
  const currentLang = getCurrentLanguage(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Sticky hide-on-scroll-down / show-on-scroll-up
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) {
        setVisible(true);
      } else if (currentY < lastScrollY.current) {
        setVisible(true);  // scrolling up
      } else if (currentY > lastScrollY.current + 4) {
        setVisible(false); // scrolling down (4px threshold to avoid jitter)
        setMobileMenuOpen(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const siteSlug = site?.slug || site?.toString() || siteData?.slug || '';
  const logoUrl = buildUrl(currentLang, '', undefined, pathname);

  const event = siteData?.event;
  const startDate = formatDate(event?.start_date, lang);
  const endDate = formatDate(event?.end_date, lang);
  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : (startDate || endDate);
  const venue = event?.location || '';

  const navItems: NavigationItem[] = navigation && Array.isArray(navigation.items)
    ? navigation.items.filter(Boolean) as NavigationItem[]
    : [];

  const locales = Array.isArray(siteData?.languages)
    ? siteData.languages.map((l: any) => ({ code: l.code, name: l.name, direction: l.direction }))
    : [];

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <header className="w-full bg-white shadow">
        {/* Main header row */}
        <div className="mx-auto flex items-center justify-between max-w-7xl px-4 md:px-8 lg:px-16 py-3">
          {/* Left: Logo + event info (inline on all screens) */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <Link href={logoUrl} className="flex-shrink-0 flex items-center">
              {siteData?.logo ? (
                <Image
                  src={getDirectusMedia(siteData.logo)}
                  alt={siteData?.name || 'Logo'}
                  className="h-10 md:h-14 w-auto object-contain"
                  width={140}
                  height={56}
                  priority
                />
              ) : (
                <span className="font-bold text-base md:text-xl uppercase text-[var(--color-primary)]">
                  {siteData?.name || site?.title || 'Site'}
                </span>
              )}
            </Link>

            {/* Date + venue: shown on all screens, smaller on mobile */}
            {(dateRange || venue) && (
              <>
                <div className="w-px h-8 md:h-12 bg-gray-300 mx-1 flex-shrink-0" />
                <div className="flex flex-col justify-center min-w-0">
                  {dateRange && (
                    <p className="text-xs md:text-base font-bold text-gray-900 leading-tight whitespace-nowrap">
                      {dateRange}
                    </p>
                  )}
                  {venue && (
                    <p className="text-[10px] md:text-sm font-bold uppercase leading-tight line-clamp-2 text-[var(--color-primary)]">
                      {venue}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Center: Nav links (desktop) */}
          {navItems.length > 0 && (
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const title = item.translations?.[0]?.title || '';
                return (
                  <Link
                    key={item.id}
                    href={getNavigationUrl(item, currentLang, pathname)}
                    className="font-semibold text-sm uppercase tracking-wide transition-colors duration-200 hover:text-[var(--color-primary)] text-gray-800 whitespace-nowrap"
                  >
                    {title}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right: Locale switcher + hamburger */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <LocaleSwitcher
              locales={locales}
              site={siteSlug}
              translations={translations || []}
              currentLang={lang}
            />
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

{/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            {navItems.length > 0 && (
              <nav className="px-4 py-2">
                {navItems.map((item) => {
                  const title = item.translations?.[0]?.title || '';
                  return (
                    <Link
                      key={item.id}
                      href={getNavigationUrl(item, currentLang, pathname)}
                      className="block py-3 font-semibold text-sm uppercase tracking-wide text-gray-800 hover:text-[var(--color-primary)] transition-colors border-b border-gray-50 last:border-0"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {title}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default function TheHeader({ navigation, lang, site, siteData, translations, pathname }: TheHeaderProps) {
  const clientPathname = usePathname();
  const finalPathname = pathname || clientPathname;
  return (
    <TheHeaderContent
      navigation={navigation}
      lang={lang}
      site={site}
      siteData={siteData}
      translations={translations}
      pathname={finalPathname}
    />
  );
}
