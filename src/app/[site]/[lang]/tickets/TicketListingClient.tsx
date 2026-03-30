'use client'

import { useRouter } from 'next/navigation'

interface TicketClass {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  quantity_total: number
  quantity_sold: number
  max_per_order: number
  registration_mode: string
}

interface Props {
  ticketClasses: TicketClass[]
  site: string
  lang: string
  t: Record<string, string>
}

function formatPrice(price: number, currency: string) {
  if (price === 0) return null
  if (currency === 'VND') {
    return price.toLocaleString('vi-VN') + '₫'
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}

export default function TicketListingClient({ ticketClasses, site, lang, t }: Props) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      {ticketClasses.map(tc => {
        const remaining = tc.quantity_total === -1 ? null : tc.quantity_total - tc.quantity_sold
        const isSoldOut = remaining !== null && remaining <= 0
        const priceDisplay = tc.price === 0 ? t.free : formatPrice(tc.price, tc.currency)

        return (
          <div
            key={tc.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{tc.name}</h2>
              {tc.description && (
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">{tc.description}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                  {priceDisplay ?? <span className="text-green-600">{t.free}</span>}
                </span>
                {remaining !== null && !isSoldOut && remaining <= 50 && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    {remaining} {t.remaining}
                  </span>
                )}
                {isSoldOut && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {t.soldOut}
                  </span>
                )}
              </div>
            </div>

            <button
              disabled={isSoldOut}
              onClick={() => router.push(`/${site}/${lang}/checkout?class=${tc.id}&qty=1`)}
              className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isSoldOut ? undefined : 'var(--color-primary)',
                color: isSoldOut ? undefined : 'white',
                backgroundColor: isSoldOut ? '#e5e7eb' : undefined,
              }}
            >
              {isSoldOut ? t.soldOut : t.buyNow}
            </button>
          </div>
        )
      })}
    </div>
  )
}
