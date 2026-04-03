'use client';

import React, { useState } from 'react';
import BlockContainer from '@/components/BlockContainer';
import { findTranslation } from '@/lib/utils/translation-helpers';

interface AccordionItem {
  id: string;
  sort?: number;
  title_en?: string;
  title_vi?: string;
  content_en?: string;
  content_vi?: string;
  icon?: string;
}

interface BlockTranslation {
  title?: string;
  headline?: string;
  languages_code: string;
}

interface AccordionTabsBlockData {
  id?: string;
  display_mode?: string | null;
  allow_multiple_open?: boolean | null;
  items?: AccordionItem[];
  translations?: BlockTranslation[];
}

interface Props {
  data: AccordionTabsBlockData;
  lang: string;
}

// Resolve per-item bilingual title/content based on lang
function resolveItem(item: AccordionItem, lang: string) {
  const isVi = lang === 'vi' || lang === 'vi-VN';
  return {
    title: isVi ? (item.title_vi || item.title_en || '') : (item.title_en || item.title_vi || ''),
    content: isVi ? (item.content_vi || item.content_en || '') : (item.content_en || item.content_vi || ''),
  };
}

// Accordion panel component with CSS max-height transition
function AccordionPanel({
  title,
  content,
  isOpen,
  onToggle,
}: {
  title: string;
  content: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#4F80FF)]"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-neutral-900">{title}</span>
        <svg
          className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {/* CSS transition via grid-rows trick — no JS height measurement needed */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div
            className="px-5 py-4 text-sm text-neutral-600 border-t border-neutral-100 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}

// Tabs component
function TabsDisplay({ items, lang }: { items: AccordionItem[]; lang: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const activeItem = items[activeTab];
  const { content } = activeItem ? resolveItem(activeItem, lang) : { content: '' };

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex border-b border-neutral-200 overflow-x-auto"
        role="tablist"
        aria-label="Content tabs"
      >
        {items.map((item, idx) => {
          const { title } = resolveItem(item, lang);
          return (
            <button
              key={item.id || idx}
              type="button"
              role="tab"
              aria-selected={activeTab === idx}
              aria-controls={`tab-panel-${idx}`}
              id={`tab-${idx}`}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary,#4F80FF)] ${
                activeTab === idx
                  ? 'border-[var(--color-primary,#4F80FF)] text-[var(--color-primary,#4F80FF)]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
              onClick={() => setActiveTab(idx)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setActiveTab((p) => Math.min(p + 1, items.length - 1));
                if (e.key === 'ArrowLeft') setActiveTab((p) => Math.max(p - 1, 0));
              }}
            >
              {title || `Tab ${idx + 1}`}
            </button>
          );
        })}
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`tab-panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="pt-6"
      >
        {content ? (
          <div
            className="prose prose-sm max-w-none text-neutral-700"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-sm text-neutral-400 italic">No content for this tab.</p>
        )}
      </div>
    </div>
  );
}

export default function AccordionTabsBlock({ data, lang }: Props) {
  const translation = findTranslation(data.translations, lang);
  const title = translation?.title || '';
  const displayMode = data.display_mode || 'accordion';
  const allowMultiple = Boolean(data.allow_multiple_open);
  const items = (data.items || []).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  // Accordion open state — supports single or multiple open panels
  const [openPanels, setOpenPanels] = useState<Set<number>>(new Set([0]));

  const togglePanel = (idx: number) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        if (!allowMultiple) next.clear();
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <BlockContainer className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {title && (
        <h2 className="text-2xl font-bold text-[var(--color-primary,#4F80FF)] mb-8 text-center font-[var(--font-display)]">
          {title}
        </h2>
      )}

      {displayMode === 'tabs' ? (
        <TabsDisplay items={items} lang={lang} />
      ) : (
        <div className="space-y-3 max-w-3xl mx-auto">
          {items.map((item, idx) => {
            const { title: itemTitle, content } = resolveItem(item, lang);
            return (
              <AccordionPanel
                key={item.id || idx}
                title={itemTitle || `Item ${idx + 1}`}
                content={content}
                isOpen={openPanels.has(idx)}
                onToggle={() => togglePanel(idx)}
              />
            );
          })}
        </div>
      )}
    </BlockContainer>
  );
}
