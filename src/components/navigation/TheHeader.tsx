'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navigation, NavigationItem } from '@/directus/types';
import { useTheme } from '@/components/providers/ThemeProvider';
import LocaleSwitcher from '@/components/global/LocaleSwitcher';
import i18nConfig from '@/i18n/i18nConfig';
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

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || '';

// Helper function to generate URL for navigation items
function getNavigationUrl(item: NavigationItem, currentLang: string, currentPathname: string) {
  console.log('[getNavigationUrl] Called with:', { item, currentLang, currentPathname })
  
  let permalink = ''
  
  if (item.type === 'page' && typeof item.page !== 'string') {
    // Find translation for current language
    const translation = item.page?.translations?.find(t => 
      t.languages_code?.startsWith(currentLang)
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

function TheHeaderContent({ navigation, lang, site, siteData, translations, pathname = '/' }: TheHeaderProps) {
  const { theme } = useTheme();
  const currentLang = getCurrentLanguage(pathname);
  
  console.log('[TheHeader] Debug props:', {
    site,
    siteData,
    siteDataLanguages: siteData?.languages,
    translations,
    lang
  });
  
  // Use theme colors for styling
  const primaryColor = theme?.primary || 'blue';
  const textColor = theme?.gray || 'gray';
  const borderRadius = theme?.borderRadius || '1rem';
  const fontDisplay = theme?.fonts?.families?.display || 'Poppins, sans-serif';
  const fontBody = theme?.fonts?.families?.body || 'Inter, sans-serif';

  // Lấy slug site nếu có
  const siteSlug = site?.slug || site?.toString() || siteData?.slug || '';

  // Generate logo URL using buildUrl
  const logoUrl = buildUrl(currentLang, '', undefined, pathname);
  console.log('[TheHeader] Logo URL:', logoUrl);

  return (
    <header className="w-full bg-white shadow py-3">
      <div className="mx-auto flex items-center justify-between max-w-7xl px-4 md:px-8 lg:px-16">
        <div className="flex items-center gap-4">
          <Link href={logoUrl} className="flex items-center gap-2">
            {siteData?.logo ? (
              <Image
                src={siteData?.logo ? getDirectusMedia(siteData.logo) : '/logo.svg'}
                alt={site?.title || 'Logo'}
                className="h-10 w-auto object-contain"
                width={80}
                height={40}
              />
            ) : (
              <span className="font-bold text-xl uppercase" style={{ color: `var(--color-primary)` }}>
                {site?.title || 'Site'}
              </span>
            )}
          </Link>
        </div>
        <nav className="flex gap-6">
          {navigation && Array.isArray(navigation.items) && navigation.items.filter(Boolean).map((item: NavigationItem) => {
            const title = item.translations?.[0]?.title || '';
            return (
              <Link 
                key={item.id} 
                href={getNavigationUrl(item, currentLang, pathname)} 
                className="font-semibold text-sm uppercase tracking-wide transition-colors duration-200 hover:text-[var(--color-primary)] text-gray-800"
              >
                {title.toUpperCase()}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <LocaleSwitcher
            locales={Array.isArray(siteData?.languages) ? siteData.languages.map((lang: any) => ({
              code: lang.code,
              name: lang.name,
              direction: lang.direction
            })) : []}
            site={siteSlug}
            translations={translations || []}
            currentLang={lang}
          />
        </div>
      </div>
    </header>
  );
}

// Client component wrapper
export default function TheHeader({ navigation, lang, site, siteData, translations, pathname }: TheHeaderProps) {
  // If pathname is provided, use it; otherwise fall back to usePathname hook
  const clientPathname = usePathname();
  const finalPathname = pathname || clientPathname;
  
  return <TheHeaderContent navigation={navigation} lang={lang} site={site} siteData={siteData} translations={translations} pathname={finalPathname} />;
}