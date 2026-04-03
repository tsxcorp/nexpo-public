"use client";
import React from 'react'
import RichTextBlock from '@/components/blocks/RichTextBlock'
import HeroBlock from '@/components/blocks/HeroBlock'
import GalleryBlock from '@/components/blocks/GalleryBlock'
import QuoteBlock from '@/components/blocks/QuoteBlock'
import LogoCloudBlock from '@/components/blocks/LogoCloudBlock'
import VideoBlock from '@/components/blocks/VideoBlock'
import TestimonialsBlock from '@/components/blocks/TestimonialsBlock'
import StepsBlock from '@/components/blocks/StepsBlock'
import FaqsBlock from '@/components/blocks/FaqsBlock'
import CtaBlock from '@/components/blocks/CtaBlock'
import RawHtmlBlock from '@/components/blocks/RawHtmlBlock'
import ColumnsBlock from '@/components/blocks/ColumnsBlock'
import CardGroupBlock from '@/components/blocks/CardGroupBlock'
import FormBlock from '@/components/blocks/FormBlock'
import TeamBlock from '@/components/blocks/TeamBlock'
import FeaturesBlock from '@/components/blocks/FeaturesBlock'
import ExhibitorsBlock from '@/components/blocks/ExhibitorsBlock'
import SpeakersBlock from '@/components/blocks/SpeakersBlock'
import AgendaPreviewBlock from '@/components/blocks/AgendaPreviewBlock'
import CountdownBlock from '@/components/blocks/CountdownBlock'
import EventInfoBlock from '@/components/blocks/EventInfoBlock'
import DividerBlock from '@/components/blocks/DividerBlock'
import AccordionTabsBlock from '@/components/blocks/AccordionTabsBlock'
import FloatingCtaBlock from '@/components/blocks/FloatingCtaBlock'
import MapBlock from '@/components/blocks/MapBlock'
import AlertBlock from '@/components/blocks/AlertBlock'
import BlockSectionWrapper from '@/components/BlockSectionWrapper'
import type { ExhibitorEvent, Speaker, AgendaSession, EventBasicInfo } from '@/directus/types'

interface PageBuilderProps {
  blocks: any[]
  lang: string
  teamMembersMap?: Record<string, any[]>
  // Event data for event-specific blocks
  siteData?: any
  exhibitors?: ExhibitorEvent[]
  speakers?: Speaker[]
  agendaSessions?: AgendaSession[]
}

// Block collections that render outside BlockSectionWrapper
// (fixed overlays or full-bleed elements that must escape section padding/bg)
const UNWRAPPED_COLLECTIONS = new Set(['block_floating_cta', 'block_alert'])

export default function PageBuilder({
  blocks,
  lang,
  teamMembersMap,
  siteData,
  exhibitors = [],
  speakers = [],
  agendaSessions = [],
}: PageBuilderProps) {
  const event: EventBasicInfo | null = siteData?.event ?? null;
  const site = siteData?.slug || '';
  const agendaUrl = site ? `/${site}/${lang}/agenda` : undefined;
  const registerUrl = site ? `/${site}/${lang}/register` : undefined;

  // Filter out hidden blocks before rendering
  const visibleBlocks = blocks.filter(b => !b.hide_block)

  return (
    <>
      {visibleBlocks.map((block, index) => {
        // Guard: skip blocks with null/undefined items to prevent crashes
        if (!block.item) return null

        const blockContent = (() => { switch (block.collection) {
          case 'block_features':
            return <FeaturesBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_richtext':
            return <RichTextBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_hero':
            return <HeroBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_gallery':
            return <GalleryBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_quote':
            return <QuoteBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_logocloud':
            return <LogoCloudBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_video':
            return <VideoBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_testimonials':
            return <TestimonialsBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_steps':
            return <StepsBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_faqs':
            return <FaqsBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_cta':
            return <CtaBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_html':
            return <RawHtmlBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_columns':
            return <ColumnsBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_cardgroup':
            return <CardGroupBlock key={block.id || index} data={block.item} lang={lang} />
          case 'block_team':
            return <TeamBlock key={block.id || index} data={block.item} lang={lang} teams={block.item.team || []} />
          case 'block_form':
            return <FormBlock key={block.id || index} data={block.item} lang={lang} />

          // Event data blocks
          case 'block_exhibitors':
            return <ExhibitorsBlock key={block.id || index} data={block.item} lang={lang} exhibitors={exhibitors} />
          case 'block_speakers':
            return <SpeakersBlock key={block.id || index} data={block.item} lang={lang} speakers={speakers} />
          case 'block_agenda_preview':
            return <AgendaPreviewBlock key={block.id || index} data={block.item} lang={lang} agendaSessions={agendaSessions} agendaUrl={agendaUrl} />
          case 'block_countdown':
            return <CountdownBlock key={block.id || index} data={block.item} lang={lang} eventStartDate={event?.start_date} />
          case 'block_event_info':
            return <EventInfoBlock key={block.id || index} data={block.item} lang={lang} event={event} registerUrl={registerUrl} />

          case 'block_divider':
            return <DividerBlock key={block.id || index} />

          // New blocks — Phase 5
          case 'block_accordion':
            return <AccordionTabsBlock key={block.id || index} data={block.item} lang={lang} />

          // Unwrapped: renders as fixed overlay (position: fixed), bypasses section wrapper
          case 'block_floating_cta':
            return <FloatingCtaBlock key={block.id || index} data={block.item} lang={lang} />

          case 'block_map':
            return <MapBlock key={block.id || index} data={block.item} />

          // Unwrapped: full-bleed alert bar, bypasses section padding
          case 'block_alert':
            return <AlertBlock key={block.id || index} data={block.item} lang={lang} />

          default:
            return null
        } })();

        if (!blockContent) return null

        // Device visibility: apply responsive CSS classes from section_style.visibility
        const vis = block.section_style?.visibility;
        const visClasses = vis ? [
          vis.mobile === false ? 'max-sm:hidden' : '',
          vis.tablet === false ? 'sm:max-lg:hidden' : '',
          vis.desktop === false ? 'lg:hidden' : '',
        ].filter(Boolean).join(' ') : '';

        // Floating CTA and Alert render unwrapped — no section background/padding
        if (UNWRAPPED_COLLECTIONS.has(block.collection)) {
          return visClasses
            ? <div key={block.id || index} className={visClasses}>{blockContent}</div>
            : blockContent
        }

        return (
          <BlockSectionWrapper key={block.id || index} sectionStyle={block.section_style} className={visClasses}>
            {blockContent}
          </BlockSectionWrapper>
        )
      })}
    </>
  )
}
