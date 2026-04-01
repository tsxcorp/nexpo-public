import type { PageProps } from '@/types/next'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import { initTranslations } from '@/i18n/i18n'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import Link from 'next/link'
export const metadata = { title: 'Payment Cancelled', robots: { index: false } }

export default async function CheckoutCancelPage({ params }: PageProps) {
  const { site, lang } = await params

  const [siteData, mainNav, footerNav, { t }] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    initTranslations(lang),
  ])

  return (
    <>
      <TheHeader navigation={mainNav} lang={lang} site={siteData?.slug ?? site} siteData={siteData} translations={[]} pathname="" />
      <main className="min-h-screen bg-gray-50 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center py-24 gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('checkout_cancel.title')}
          </h1>
          <p className="text-gray-500 max-w-sm">
            {t('checkout_cancel.body')}
          </p>
          <Link
            href={`/${site}/${lang}/tickets`}
            className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {t('checkout_cancel.try_again')}
          </Link>
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
