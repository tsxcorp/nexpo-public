import { Suspense } from 'react'
import type { PageProps } from '@/types/next'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import CheckoutSuccessClient from './CheckoutSuccessClient'

export const metadata = { title: 'Order Confirmed', robots: { index: false } }

export default async function CheckoutSuccessPage({ params }: PageProps) {
  const { site, lang } = await params
  const [siteData, mainNav, footerNav] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
  ])

  return (
    <>
      <TheHeader navigation={mainNav} lang={lang} site={siteData?.slug ?? site} siteData={siteData} translations={[]} pathname="" />
      <main className="min-h-screen bg-gray-50 px-4">
        <div className="max-w-lg mx-auto">
          <Suspense fallback={<div className="py-24 text-center text-gray-400">Loading…</div>}>
            <CheckoutSuccessClient site={site} lang={lang} />
          </Suspense>
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
