import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSite } from '@/directus/queries/sites'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import type { PageProps } from '@/types/next'
import CheckoutClient from './CheckoutClient'
import { createDirectus, rest, staticToken, readItem } from '@directus/sdk'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

const serverDirectus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!)
  .with(rest())
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN!))

async function fetchTicketClass(classId: string) {
  try {
    return await serverDirectus.request(readItem('ticket_classes' as never, classId as never, {
      fields: [
        'id', 'name', 'price', 'currency', 'quantity_total',
        'quantity_sold', 'max_per_order', 'registration_mode',
      ] as never,
    })) as any
  } catch {
    return null
  }
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { site, lang } = await params
  const sp = await searchParams
  const classId = typeof sp.class === 'string' ? sp.class : ''
  const currentPathname = `/${site}/${lang}/checkout`

  const [siteData, mainNav, footerNav, ticketClass] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
    classId ? fetchTicketClass(classId) : Promise.resolve(null),
  ])

  const title = lang === 'vi' ? 'Đặt vé' : 'Checkout'

  return (
    <>
      <TheHeader
        navigation={mainNav}
        lang={lang}
        site={siteData?.slug ?? site}
        siteData={siteData}
        translations={[]}
        pathname={currentPathname}
      />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--color-primary)' }}>
            {title}
          </h1>
          <Suspense fallback={
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            </div>
          }>
            <CheckoutClient site={site} lang={lang} initialTicketClass={ticketClass} />
          </Suspense>
        </div>
      </main>
      <TheFooter navigation={footerNav} lang={lang} />
    </>
  )
}
