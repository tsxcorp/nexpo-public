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
import PageBuilder from '@/components/PageBuilder';
import { PageProps } from '@/types/next';

export default async function SlugPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const { site, lang, slug } = resolvedParams;

  const currentPathname = `/${site}/${lang}${slug && slug.length > 0 ? `/${slug.join('/')}` : ''}`;

  const siteData = await getSite(site);

  const [mainNav, footerNav] = await Promise.all([
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer')
  ]);

  const pageSlug = !slug || slug.length === 0 || (slug.length === 1 && slug[0] === site) ? '/' : `/${slug.join('/')}`;

  const pageContent = await fetchPage(site, lang, pageSlug) as (Page & {
    translations: Array<{
      languages_code: string;
      title?: string;
      permalink: string;
      content?: string;
    }>;
    blocks?: any[];
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
    return (
      <>
        <TheHeader navigation={mainNav} lang={lang} site={siteData?.slug || site} siteData={siteData} translations={[]} pathname={currentPathname} />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto px-4 py-16 text-center">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <p className="text-lg text-gray-600 mb-6">Page not found</p>
            <a href={`/${site}/${lang}`} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity">
              ← Back to home
            </a>
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
