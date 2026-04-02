import { readItems } from '@directus/sdk'
import directus from '../client'
import { withRevalidate, safeApiCall } from '../utils'
import type { Page } from '../types'
import { getSite } from './sites'
import { toDirectusLang } from '@/lib/utils/translation-helpers'

// --- Field fragments for blocks ---
const blockFormFields = [
  '*',
  {
    form: [
      '*',
      {
        fields: [
          '*',
          { translations: ['languages_code', 'label', 'placeholder', 'help', 'options'] },
        ],
      },
      { translations: ['languages_code', 'title', 'submit_label', 'success_message'] },
    ],
  },
  { translations: ['title', 'headline', 'languages_code'] },
];

const galleryItemFields = [
  '*',
  { directus_files_id: ['*'] },
  {
    translations: [
      '*',
      { title: ['*'], headline: ['*'] }
    ]
  }
];

const blockTeamFields = [
  '*',
  { team: [
      '*',
      { image: ['*'] },
      { translations: ['bio', 'job_title', 'languages_code'] }
    ]
  },
  {
    translations: [
      'title',
      'headline',
      'content',
      'languages_code'
    ]
  }
];

const blockItemFields = [
  '*',
  { form: [
    '*', 
    { fields: [
      '*',
      { translations: ['*'] }] },
    { translations: ['*'] }] },
  { team: [
      '*',
      { image: ['*'] },
      { translations: ['bio', 'job_title', 'languages_code'] }
    ]
  },
  { translations: ['*', { faqs: ['*'] }] },
  { button_group: ['*', { buttons: ['*', { translations: ['*'] }] }] },
  { rows: [
    '*',
    { image: ['*'] },
    { translations: ['*'] }
  ] },
  { steps: ['*', { translations: ['*'] }] },
  { testimonials: [
      '*',
      { testimonials_id: ['*', { translations: ['*'] }] },
      { translations: ['*'] }
    ]
  },
  { logos: ['*', { directus_files_id: ['*'] }, { translations: ['*', 'title', 'headline'] }] },
  { gallery_items: galleryItemFields },
  { block_form: blockFormFields },
  { block_team: blockTeamFields },
  { video: ['*', { translations: ['*'] }] },
];

export const fetchPage = async (siteSlug: string, lang: string, permalink: string = '/') => {
  const site = await getSite(siteSlug);
  if (!site) return null;

  const langCode = toDirectusLang(lang);

  return await safeApiCall(async () => {
    const pages = await directus.request(
      withRevalidate(
        readItems('pages' as any, {
          filter: {
            site_id: { _eq: site.id },
            status: { _eq: 'published' },
            translations: { permalink: { _eq: permalink } },
          },
          fields: [
            '*',
            { translations: ['*'] },
            { blocks: ['*', { item: blockItemFields }] },
            { seo: ['*'] },
            { site_id: ['*'] },
          ],
          deep: {
            // TypeScript is too strict for Directus _filter syntax, so we cast as any for these nested filters
            blocks: {
              item: {
                translations: { _filter: { languages_code: { _eq: langCode } } } as any,
                form: {
                  translations: { _filter: { languages_code: { _eq: langCode } } } as any,
                  fields: {
                    translations: { _filter: { languages_code: { _eq: langCode } } } as any,
                  },
                },
                rows: {
                  translations: { _filter: { languages_code: { _eq: langCode } } } as any,
                },
              },
            },
          },
          limit: 1,
        }),
        60
      )
    ) as any[];

    if (!pages[0]) return null;

    return pages[0];
  }, null, `fetchPage(${siteSlug}, ${lang}, ${permalink})`);
} 