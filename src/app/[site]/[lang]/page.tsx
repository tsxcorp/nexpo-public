import React from 'react';
import { fetchNavigationSafe } from '@/directus/queries/navigation';
import { fetchPage } from '@/directus/queries/pages';
import { getSite } from '@/directus/queries/sites';
import { fetchExhibitors } from '@/directus/queries/exhibitors';
import { fetchSpeakers } from '@/directus/queries/speakers';
import { fetchAgendaSessions } from '@/directus/queries/agenda';
import TheHeader from '@/components/navigation/TheHeader';
import TheFooter from '@/components/navigation/TheFooter';
import type { Page } from '@/directus/types';
import PageBuilder from '@/components/PageBuilder'
import { PageProps } from '@/types/next';

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const { site, lang } = resolvedParams;

  // Construct the current pathname on the server side
  const currentPathname = `/${site}/${lang}`;

  console.log('\n=== Page Component Debug ===');
  console.log('Site:', site);
  console.log('Language:', lang);
  console.log('Current Pathname:', currentPathname);

  // Fetch navigation (main/footer)
  const [mainNav, footerNav, siteData] = await Promise.all([
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    getSite(site)
  ]);

  console.log('\n=== Navigation Data ===');
  console.log('Header Navigation:', mainNav);
  console.log('Footer Navigation:', footerNav);
  console.log('Site Data:', siteData);

  // Fetch homepage
  const pageContent = await fetchPage(site, lang, '/') as (Page & {
    translations: Array<{
      languages_code: string;
      title?: string;
      permalink: string;
      content?: string;
    }>;
    blocks?: Array<{
      id: string;
      collection: string;
      item: {
        id: string;
        translations: Array<{
          languages_code: string;
          title?: string;
          headline?: string;
          content?: string;
        }>;
      };
    }>;
  }) | null;

  // Conditionally fetch event data only for blocks that need it
  const blocks = Array.isArray(pageContent?.blocks) ? pageContent.blocks : [];
  const eventId = siteData?.event_id as number | undefined;
  const needsExhibitors = blocks.some((b: any) => b.collection === 'block_exhibitors');
  const needsSpeakers = blocks.some((b: any) => b.collection === 'block_speakers');
  const needsAgenda = blocks.some((b: any) => b.collection === 'block_agenda_preview');

  const [exhibitors, speakers, agendaSessions] = await Promise.all([
    needsExhibitors && eventId ? fetchExhibitors(eventId) : Promise.resolve([]),
    needsSpeakers && eventId ? fetchSpeakers(eventId) : Promise.resolve([]),
    needsAgenda && eventId ? fetchAgendaSessions(eventId) : Promise.resolve([]),
  ]);

  if (!pageContent) {
    console.log('\nNo page content found, showing 404');
    // If no page found, return 404
    return (
      <>
        <TheHeader navigation={mainNav} lang={lang} site={siteData?.slug || site} siteData={siteData} translations={[]} pathname={currentPathname} />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
            <div className="mb-2">Site: <b>{site}</b></div>
            <div className="mb-2">Lang: <b>{lang}</b></div>
            <div className="mb-2">Slug: <b>/</b></div>
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h2 className="font-bold mb-2">Debug Info:</h2>
              <pre className="text-sm">
                {JSON.stringify({
                  params: resolvedParams,
                  searchParams: await searchParams,
                  hasMainNav: !!mainNav,
                  hasFooterNav: !!footerNav
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
      </>
    );
  }

  return (
    <>
      <TheHeader navigation={mainNav} lang={lang} site={siteData?.slug || site} siteData={siteData} translations={pageContent?.translations || []} pathname={currentPathname} />
      <div className="min-h-screen w-full bg-gray-50 py-12">
        <div className="w-full px-4 md:px-8 lg:px-16">
          <PageBuilder
              blocks={Array.isArray(pageContent.blocks) ? pageContent.blocks : []}
              lang={lang}
              siteData={siteData}
              exhibitors={exhibitors}
              speakers={speakers}
              agendaSessions={agendaSessions}
            />
        </div>
      </div>
      <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
    </>
  );
} 