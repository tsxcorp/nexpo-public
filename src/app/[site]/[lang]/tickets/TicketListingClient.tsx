'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { formatPrice, resolvePrice, getCurrencySymbol, getDefaultCurrencyForLang } from '@/lib/utils/currency-format'

interface Benefit { id: string; label: string; benefit_type: string }

interface TicketClass {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  /** Multi-currency prices: {"VND": 500000, "USD": 20} */
  prices?: Record<string, number> | null
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
  /** Tenant supported currencies from server component */
  supportedCurrencies: string[]
  /** Tenant default currency (first in supportedCurrencies) */
  defaultCurrency: string
}

const CART_KEY = 'nexpo_ticket_cart'
const CURRENCY_KEY = 'nexpo_selected_currency'

export default function TicketListingClient({ ticketClasses, site, lang, t: tProp, supportedCurrencies, defaultCurrency }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map())

  // Smart default: language-based, persisted to sessionStorage
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(CURRENCY_KEY)
      if (saved && supportedCurrencies.includes(saved)) return saved
    }
    return getDefaultCurrencyForLang(lang, supportedCurrencies, defaultCurrency)
  })

  const handleCurrencyChange = (cur: string) => {
    setSelectedCurrency(cur)
    sessionStorage.setItem(CURRENCY_KEY, cur)
    // Clear cart when switching currency (prices change)
    setCart(new Map())
  }

  const mainClasses = ticketClasses.filter(tc => !tc.is_addon)
  const addonClasses = ticketClasses.filter(tc => tc.is_addon)
  const parentIdsInCart = new Set(mainClasses.filter(tc => cart.has(tc.id)).map(tc => tc.id))

  const canAddAddon = (tc: TicketClass) => {
    if (!tc.requires_class_ids?.length) return parentIdsInCart.size > 0
    return tc.requires_class_ids.some(id => parentIdsInCart.has(id))
  }

  /** Resolve price for a ticket class in the selected currency */
  const getPrice = (tc: TicketClass): number | null => {
    return resolvePrice(tc.prices, selectedCurrency, tc.price, tc.currency)
  }

  const updateQty = useCallback((tc: TicketClass, delta: number, price: number) => {
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
          id: tc.id, name: tc.name, price,
          currency: selectedCurrency, quantity: newQty,
          max_per_order: tc.max_per_order, registration_mode: tc.registration_mode,
          is_addon: tc.is_addon,
        })
      }
      return next
    })
  }, [selectedCurrency])

  const totalItems = Array.from(cart.values()).reduce((s, c) => s + c.quantity, 0)
  const totalPrice = Array.from(cart.values()).reduce((s, c) => s + c.price * c.quantity, 0)

  const handleCheckout = () => {
    if (totalItems === 0) return
    sessionStorage.setItem(CART_KEY, JSON.stringify(Array.from(cart.values())))
    sessionStorage.setItem(CURRENCY_KEY, selectedCurrency)
    router.push(`/${site}/${lang}/checkout`)
  }

  const renderCard = (tc: TicketClass, addonBlocked: boolean) => {
    const remaining = tc.quantity_total === -1 ? null : tc.quantity_total - tc.quantity_sold
    const isSoldOut = remaining !== null && remaining <= 0
    const price = getPrice(tc)
    const priceUnavailable = price === null
    const priceDisplay = priceUnavailable
      ? null
      : price === 0
        ? tProp.free
        : formatPrice(price, selectedCurrency)
    const cartQty = cart.get(tc.id)?.quantity ?? 0
    const disabled = isSoldOut || addonBlocked || priceUnavailable

    return (
      <div key={tc.id}
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${disabled ? 'opacity-50' : ''}`}>
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
            {priceUnavailable ? (
              <span className="text-sm text-gray-400">{t('tickets.price_not_available')}</span>
            ) : (
              <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {priceDisplay ?? <span className="text-green-600">{tProp.free}</span>}
              </span>
            )}
            {remaining !== null && !isSoldOut && remaining <= 50 && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{remaining} {tProp.remaining}</span>
            )}
            {isSoldOut && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tProp.soldOut}</span>}
            {addonBlocked && !isSoldOut && (
              <span className="text-xs text-gray-400">{t('tickets.needs_main_ticket')}</span>
            )}
          </div>
        </div>

        {disabled ? (
          <span className="shrink-0 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400">
            {isSoldOut ? tProp.soldOut : priceUnavailable ? t('tickets.unavailable') : t('tickets.requires_ticket')}
          </span>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {cartQty > 0 ? (
              <>
                <button onClick={() => updateQty(tc, -1, price!)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">-</button>
                <span className="w-6 text-center text-sm font-semibold text-gray-900">{cartQty}</span>
                <button onClick={() => updateQty(tc, 1, price!)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white transition"
                  style={{ background: 'var(--color-primary)' }}>+</button>
              </>
            ) : (
              <button onClick={() => updateQty(tc, 1, price!)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>
                {t('tickets.add')}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Currency selector — only show when tenant has >1 currency */}
      {supportedCurrencies.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('tickets.currency')}:</span>
          <div className="flex gap-1">
            {supportedCurrencies.map(cur => (
              <button
                key={cur}
                onClick={() => handleCurrencyChange(cur)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCurrency === cur
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getCurrencySymbol(cur)} {cur}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main tickets */}
      {mainClasses.map(tc => renderCard(tc, false))}

      {/* Add-on tickets */}
      {addonClasses.length > 0 && (
        <>
          <div className="pt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('tickets.addons_title')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('tickets.addons_subtitle')}</p>
          </div>
          {addonClasses.map(tc => renderCard(tc, !canAddAddon(tc)))}
        </>
      )}

      {/* Floating cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              <span className="font-semibold">{totalItems}</span> {t('tickets.ticket_count')}
              {totalPrice > 0 && (
                <span className="ml-2 font-bold text-base" style={{ color: 'var(--color-primary)' }}>
                  {formatPrice(totalPrice, selectedCurrency)}
                </span>
              )}
              {totalPrice === 0 && <span className="ml-2 font-bold text-base text-green-600">{tProp.free}</span>}
            </div>
            <button onClick={handleCheckout}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              {t('tickets.checkout_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
