import type { PageProps } from '@/types/next'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import Link from 'next/link'
export const metadata = { title: 'Payment Cancelled', robots: { index: false } }

export default async function CheckoutCancelPage({ params }: PageProps) {
  const { site, lang } = await params
  const isVI = lang === 'vi'

  const [siteData, mainNav, footerNav] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
  ])

  return (
    <>
      <TheHeader navigation={mainNav} lang={lang} site={siteData?.slug ?? site} siteData={siteData} translations={[]} pathname="" />
      <main className="min-h-screen bg-gray-50 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center py-24 gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <h1 className="text-2xl font-bold text-gray-900">
            {isVI ? 'Thanh toán đã bị huỷ' : 'Payment Cancelled'}
          </h1>
          <p className="text-gray-500 max-w-sm">
            {isVI
              ? 'Giao dịch của bạn đã bị huỷ. Đơn vé sẽ được giải phóng sau vài phút.'
              : 'Your transaction was cancelled. The ticket reservation will be released shortly.'}
          </p>
          <Link
            href={`/${site}/${lang}/tickets`}
            className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {isVI ? 'Thử lại' : 'Try again'}
          </Link>
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
