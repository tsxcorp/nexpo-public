'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Benefit { id: string; label: string; benefit_type: string }

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
  is_addon?: boolean
  requires_class_ids?: string[] | null
  addon_max_per_parent?: number
  benefits?: Benefit[]
}

export interface CartItem {
  id: string
  name: string
  price: number
  currency: string
  quantity: number
  max_per_order: number
  registration_mode: string
  is_addon?: boolean
}

interface Props {
  ticketClasses: TicketClass[]
  site: string
  lang: string
  t: Record<string, string>
}

function formatPrice(price: number, currency: string) {
  if (price === 0) return null
  if (currency === 'VND') return price.toLocaleString('vi-VN') + '₫'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}

const CART_KEY = 'nexpo_ticket_cart'

export default function TicketListingClient({ ticketClasses, site, lang, t }: Props) {
  const router = useRouter()
  const isVI = lang === 'vi'
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map())

  const mainClasses = ticketClasses.filter(tc => !tc.is_addon)
  const addonClasses = ticketClasses.filter(tc => tc.is_addon)
  const parentIdsInCart = new Set(mainClasses.filter(tc => cart.has(tc.id)).map(tc => tc.id))

  const canAddAddon = (tc: TicketClass) => {
    if (!tc.requires_class_ids?.length) return parentIdsInCart.size > 0
    return tc.requires_class_ids.some(id => parentIdsInCart.has(id))
  }

  const updateQty = useCallback((tc: TicketClass, delta: number) => {
    setCart(prev => {
      const next = new Map(prev)
      const existing = next.get(tc.id)
      const remaining = tc.quantity_total === -1 ? Infinity : tc.quantity_total - tc.quantity_sold
      const currentQty = existing?.quantity ?? 0
      const newQty = Math.max(0, Math.min(tc.max_per_order, remaining, currentQty + delta))

      if (newQty === 0) {
        next.delete(tc.id)
      } else {
        next.set(tc.id, {
          id: tc.id, name: tc.name, price: tc.price,
          currency: tc.currency, quantity: newQty,
          max_per_order: tc.max_per_order, registration_mode: tc.registration_mode,
          is_addon: tc.is_addon,
        })
      }
      return next
    })
  }, [])

  const totalItems = Array.from(cart.values()).reduce((s, c) => s + c.quantity, 0)
  const totalPrice = Array.from(cart.values()).reduce((s, c) => s + c.price * c.quantity, 0)
  const currency = ticketClasses[0]?.currency ?? 'VND'

  const handleCheckout = () => {
    if (totalItems === 0) return
    sessionStorage.setItem(CART_KEY, JSON.stringify(Array.from(cart.values())))
    router.push(`/${site}/${lang}/checkout`)
  }

  const renderCard = (tc: TicketClass, addonBlocked: boolean) => {
    const remaining = tc.quantity_total === -1 ? null : tc.quantity_total - tc.quantity_sold
    const isSoldOut = remaining !== null && remaining <= 0
    const priceDisplay = tc.price === 0 ? t.free : formatPrice(tc.price, tc.currency)
    const cartQty = cart.get(tc.id)?.quantity ?? 0
    const disabled = isSoldOut || addonBlocked

    return (
      <div key={tc.id}
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${addonBlocked ? 'opacity-50' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900">{tc.name}</h2>
            {tc.is_addon && (
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Add-on</span>
            )}
          </div>
          {tc.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{tc.description}</p>}
          {tc.benefits && tc.benefits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tc.benefits.map(b => (
                <span key={b.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {b.label}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {priceDisplay ?? <span className="text-green-600">{t.free}</span>}
            </span>
            {remaining !== null && !isSoldOut && remaining <= 50 && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{remaining} {t.remaining}</span>
            )}
            {isSoldOut && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.soldOut}</span>}
            {addonBlocked && !isSoldOut && (
              <span className="text-xs text-gray-400">{isVI ? 'Cần thêm vé chính trước' : 'Add a main ticket first'}</span>
            )}
          </div>
        </div>

        {disabled ? (
          <span className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400">
            {isSoldOut ? t.soldOut : (isVI ? 'Yêu cầu vé chính' : 'Requires ticket')}
          </span>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {cartQty > 0 ? (
              <>
                <button onClick={() => updateQty(tc, -1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">-</button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900">{cartQty}</span>
                <button onClick={() => updateQty(tc, 1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white transition"
                  style={{ background: 'var(--color-primary)' }}>+</button>
              </>
            ) : (
              <button onClick={() => updateQty(tc, 1)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {isVI ? 'Thêm' : 'Add'}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Main tickets */}
      {mainClasses.map(tc => renderCard(tc, false))}

      {/* Add-on tickets */}
      {addonClasses.length > 0 && (
        <>
          <div className="pt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{isVI ? 'Vé bổ sung' : 'Add-ons'}</h2>
            <p className="text-sm text-gray-500 mb-3">{isVI ? 'Chọn thêm cùng với vé chính' : 'Available with a main ticket'}</p>
          </div>
          {addonClasses.map(tc => renderCard(tc, !canAddAddon(tc)))}
        </>
      )}

      {/* Floating cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{totalItems}</span> {isVI ? 'vé' : 'ticket(s)'}
              {totalPrice > 0 && (
                <span className="ml-2 font-bold text-base" style={{ color: 'var(--color-primary)' }}>
                  {formatPrice(totalPrice, currency)}
                </span>
              )}
              {totalPrice === 0 && <span className="ml-2 font-bold text-base text-green-600">{t.free}</span>}
            </div>
            <button onClick={handleCheckout}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              {isVI ? 'Đặt vé' : 'Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
