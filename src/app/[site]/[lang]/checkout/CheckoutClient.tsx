'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { CartItem } from '../tickets/TicketListingClient'

interface TicketClass {
  id: string
  name: string
  price: number
  currency: string
  quantity_total: number
  quantity_sold: number
  max_per_order: number
  registration_mode: 'none' | 'buyer_only' | 'per_ticket'
}

interface HolderInfo { name: string; email: string }
interface BuyerInfo { name: string; email: string; phone: string }

interface RegistrationFormField {
  id: string; name: string; type: string; is_required?: boolean
  is_email_contact?: boolean; is_name_field?: boolean; is_phone_field?: boolean
  options?: Array<{ label: string; value: string }>
  translations?: Array<{ languages_code: string; label?: string; placeholder?: string; options?: Array<{ label: string; value: string }> }>
}

interface RegistrationForm { id: string; fields?: RegistrationFormField[] }

import { formatPrice as _formatPrice } from '@/lib/utils/currency-format'

/** Wrapper that never returns null — checkout always shows a value */
function formatPrice(price: number, currency: string) {
  return _formatPrice(price, currency) ?? '0'
}

function InputField({ label, value, onChange, type = 'text', required = false, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
        style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
    </div>
  )
}

interface Props {
  site: string; lang: string
  initialTicketClass: TicketClass | null
  registrationForm?: RegistrationForm | null
}

const CART_KEY = 'nexpo_ticket_cart'

export default function CheckoutClient({ site, lang, initialTicketClass, registrationForm = null }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  // ── Cart state ──
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)
  const [step, setStep] = useState(1)
  const [buyer, setBuyer] = useState<BuyerInfo>({ name: '', email: '', phone: '' })
  const [holders, setHolders] = useState<HolderInfo[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({})
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoValidating, setPromoValidating] = useState(false)

  // Load cart from sessionStorage or fall back to single-class URL param
  useEffect(() => {
    const stored = sessionStorage.getItem(CART_KEY)
    if (stored) {
      try {
        const items = JSON.parse(stored) as CartItem[]
        if (items.length > 0) { setCartItems(items); setCartLoaded(true); return }
      } catch { /* ignore */ }
    }
    // Backward compat: single-class from URL param (via page.tsx server fetch)
    if (initialTicketClass) {
      const initQty = Math.max(1, parseInt(searchParams.get('qty') ?? '1', 10))
      setCartItems([{
        id: initialTicketClass.id, name: initialTicketClass.name,
        price: initialTicketClass.price, currency: initialTicketClass.currency,
        quantity: Math.min(initQty, initialTicketClass.max_per_order),
        max_per_order: initialTicketClass.max_per_order,
        registration_mode: initialTicketClass.registration_mode,
      }])
    }
    setCartLoaded(true)
  }, [initialTicketClass, searchParams])

  const totalQty = cartItems.reduce((s, c) => s + c.quantity, 0)
  const subtotal = cartItems.reduce((s, c) => s + c.price * c.quantity, 0)
  const totalAmount = Math.max(0, subtotal - promoDiscount)
  const currency = cartItems[0]?.currency ?? 'VND'

  const validatePromo = async () => {
    if (!promoCode.trim()) return
    setPromoValidating(true); setError(null)
    try {
      const res = await fetch(`/api/validate-promo?code=${encodeURIComponent(promoCode)}&site_slug=${site}&subtotal=${subtotal}&items=${encodeURIComponent(JSON.stringify(cartItems.map(c => c.id)))}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid promo code'); setPromoApplied(false); setPromoDiscount(0); return }
      setPromoDiscount(data.discount ?? 0)
      setPromoApplied(true)
    } catch { setError(t('checkout.err_promo')) }
    finally { setPromoValidating(false) }
  }

  // Form fields: from server prop OR fetched client-side for cart mode
  const [clientForm, setClientForm] = useState<RegistrationForm | null>(null)
  const activeForm = registrationForm ?? clientForm
  const hasCheckoutForm = !!activeForm?.fields?.length
  const formFields = activeForm?.fields || []
  // If form has no email-tagged field, show registration fallback fields (name/email/phone) before form fields
  const formHasContact = formFields.some(f => f.is_email_contact)
  const showFallbackBeforeForm = hasCheckoutForm && !formHasContact

  // Fetch form client-side when cart loads (cart mode = no server-side form fetch)
  useEffect(() => {
    if (registrationForm || !cartLoaded || cartItems.length === 0) return
    // Use first non-addon item's class ID to check for form config
    const mainItem = cartItems.find(c => !c.is_addon) ?? cartItems[0]
    if (!mainItem) return
    fetch(`/api/ticket-class-form?class_id=${mainItem.id}`)
      .then(r => r.json())
      .then(data => { if (data.form) setClientForm(data.form) })
      .catch(() => {})
  }, [cartLoaded, cartItems, registrationForm])

  // Sync holders to total qty - 1
  useEffect(() => {
    setHolders(prev => {
      const extras = totalQty - 1
      if (extras <= 0) return []
      const next = [...prev]
      while (next.length < extras) next.push({ name: '', email: '' })
      return next.slice(0, extras)
    })
  }, [totalQty])

  const updateCartQty = useCallback((id: string, delta: number) => {
    setCartItems(prev => prev.map(c => {
      if (c.id !== id) return c
      const newQty = Math.max(1, Math.min(c.max_per_order, c.quantity + delta))
      return { ...c, quantity: newQty }
    }))
  }, [])

  const removeCartItem = useCallback((id: string) => {
    setCartItems(prev => prev.filter(c => c.id !== id))
  }, [])

  const updateHolder = useCallback((idx: number, field: keyof HolderInfo, value: string) => {
    setHolders(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next })
  }, [])

  const validateStep1 = () => cartItems.length > 0
  const validateStep2 = () => {
    // Fallback fields shown when no form OR form lacks contact fields
    if (!hasCheckoutForm || showFallbackBeforeForm) {
      if (!buyer.name.trim() || !buyer.email.trim()) { setError(t('checkout.err_required')); return false }
    }
    // Form fields validation
    if (hasCheckoutForm) {
      const missing = formFields.some(f => f.is_required && !formAnswers[f.name]?.trim())
      if (missing) { setError(t('checkout.err_required')); return false }
    }
    return true
  }

  // Derive contact info from form tagged fields
  const deriveBuyerFromForm = () => {
    if (!hasCheckoutForm) return buyer
    const nameFields = formFields.filter(f => f.is_name_field)
    const fullName = nameFields.length > 0
      ? nameFields.map(f => formAnswers[f.name] ?? '').filter(Boolean).join(' ')
      : buyer.name
    const emailField = formFields.find(f => f.is_email_contact)
    const email = emailField ? (formAnswers[emailField.name] ?? '') : buyer.email
    const phoneField = formFields.find(f => f.is_phone_field)
    const phone = phoneField ? (formAnswers[phoneField.name] ?? '') : buyer.phone
    return { name: fullName, email, phone }
  }

  const handleConfirm = async () => {
    if (cartItems.length === 0) return
    setSubmitting(true); setError(null)
    try {
      const derivedBuyer = deriveBuyerFromForm()
      // Pass the currency from the cart (set during ticket selection)
      const cartCurrency = cartItems[0]?.currency ?? 'VND'
      const payload: Record<string, unknown> = {
        items: cartItems.map(c => ({ ticket_class_id: c.id, quantity: c.quantity })),
        buyer: derivedBuyer, holders, site_slug: site, lang,
        currency: cartCurrency,
        ...(promoApplied && promoCode ? { promo_code: promoCode } : {}),
      }
      // Include form answers for form_submission creation
      if (hasCheckoutForm && activeForm?.id && formFields.length > 0) {
        payload.registration_form_id = activeForm.id
        payload.buyer_form_answers = formFields.map(f => ({ field: f.id, value: formAnswers[f.name] ?? '' }))
      }
      const res = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t('checkout.err_general')); return }
      // Clear cart
      sessionStorage.removeItem(CART_KEY)
      if (data.payment_url) {
        window.location.href = data.payment_url
      } else {
        router.push(`/${site}/${lang}/checkout/success?order=${data.order_id}`)
      }
    } catch { setError(t('checkout.err_general')) }
    finally { setSubmitting(false) }
  }

  if (!cartLoaded) {
    return <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} /></div>
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400 mb-4">{t('checkout.empty_cart')}</p>
        <button onClick={() => router.back()} className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{t('checkout.back')}</button>
      </div>
    )
  }

  // ── Step bar ──
  const steps = [t('checkout.step1'), t('checkout.step2'), t('checkout.step3')]
  const StepBar = () => (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1; const active = step === n; const done = step > n
        return (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5" style={{ fontWeight: active ? 600 : 400, color: active ? '#111827' : '#9ca3af' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={done ? { background: '#22c55e', color: '#fff' } : active ? { background: 'var(--color-primary)', color: '#fff' } : { background: '#e5e7eb', color: '#6b7280' }}>
                {done ? '✓' : n}
              </span>
              <span className="text-sm hidden sm:inline">{label}</span>
            </div>
            {i < 2 && <div className="flex-1 h-0.5 rounded" style={{ background: step > n ? '#4ade80' : '#e5e7eb' }} />}
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ color: '#111827' }}>
      <StepBar />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2">
          <span>!</span> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

        {/* ── Step 1: Review Cart ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-2">{t('checkout.your_tickets')}</h2>

            {cartItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-primary)' }}>
                    {item.price === 0 ? t('checkout.free') : formatPrice(item.price, item.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateCartQty(item.id, -1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition">-</button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button onClick={() => updateCartQty(item.id, 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white transition"
                    style={{ background: 'var(--color-primary)' }}>+</button>
                  <button onClick={() => removeCartItem(item.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Subtotal per class + total */}
            <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between text-gray-600">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{item.price === 0 ? t('checkout.free') : formatPrice(item.price * item.quantity, item.currency)}</span>
                </div>
              ))}
              {/* Promo code */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <input
                  type="text" value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); if (promoApplied) { setPromoApplied(false); setPromoDiscount(0); } }}
                  placeholder={t('checkout.promo_code')}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:border-transparent transition"
                  style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                />
                <button onClick={validatePromo} disabled={promoValidating || !promoCode.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition disabled:opacity-40">
                  {promoValidating ? '...' : t('checkout.apply')}
                </button>
              </div>
              {promoApplied && promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t('checkout.discount')}</span>
                  <span>-{formatPrice(promoDiscount, currency)}</span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-100 text-base font-semibold text-gray-900">
                <span>{t('checkout.total')}</span>
                <span style={{ color: 'var(--color-primary)' }}>
                  {totalAmount === 0 ? t('checkout.free') : formatPrice(totalAmount, currency)}
                </span>
              </div>
            </div>

            <button onClick={() => { if (validateStep1()) { setError(null); setStep(2) } }}
              className="w-full py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>{t('checkout.next')}</button>
          </div>
        )}

        {/* ── Step 2: Registration info (form fields or fallback) ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">{t('checkout.registration_info')}</h2>

            {/* Registration fallback: always show if no form OR form lacks contact fields */}
            {(!hasCheckoutForm || showFallbackBeforeForm) && (
              <div className="space-y-4">
                <InputField label={t('checkout.full_name')} value={buyer.name} onChange={v => setBuyer(b => ({ ...b, name: v }))} required placeholder={t('checkout.full_name_placeholder')} />
                <InputField label={t('checkout.email')} type="email" value={buyer.email} onChange={v => setBuyer(b => ({ ...b, email: v }))} required placeholder="email@example.com" />
                <InputField label={t('checkout.phone')} type="tel" value={buyer.phone} onChange={v => setBuyer(b => ({ ...b, phone: v }))} placeholder={t('checkout.phone_placeholder')} />
              </div>
            )}

            {hasCheckoutForm ? (
              /* Form mode: render all form fields (contact + profile, sorted by admin) */
              <div className={`space-y-4 ${showFallbackBeforeForm ? 'pt-4 border-t border-gray-100' : ''}`}>
                {formFields.map(field => {
                  const tr = field.translations?.find(tr => tr.languages_code === lang) ?? field.translations?.[0]
                  const label = tr?.label || field.name
                  const placeholder = tr?.placeholder || ''
                  const selectOptions = tr?.options ?? field.options ?? []
                  if (field.type === 'select' && selectOptions.length) {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}</label>
                        <select value={formAnswers[field.name] ?? ''} onChange={e => setFormAnswers(prev => ({ ...prev, [field.name]: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
                          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}>
                          <option value="">{t('checkout.select_placeholder')}</option>
                          {selectOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    )
                  }
                  if (field.type === 'textarea') {
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}</label>
                        <textarea value={formAnswers[field.name] ?? ''} onChange={e => setFormAnswers(prev => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={placeholder} rows={3}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition resize-none"
                          style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties} />
                      </div>
                    )
                  }
                  if (field.type === 'multiselect' && selectOptions.length) {
                    const selected = (formAnswers[field.name] ?? '').split(',').filter(Boolean)
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}</label>
                        <div className="flex flex-wrap gap-2">
                          {selectOptions.map(opt => {
                            const isSelected = selected.includes(opt.value)
                            return (
                              <button key={opt.value} type="button" onClick={() => {
                                const next = isSelected ? selected.filter(v => v !== opt.value) : [...selected, opt.value]
                                setFormAnswers(prev => ({ ...prev, [field.name]: next.join(',') }))
                              }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }
                  const inputType = field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'input' ? 'text' : 'text'
                  return <InputField key={field.id} label={label} type={inputType} value={formAnswers[field.name] ?? ''}
                    onChange={v => setFormAnswers(prev => ({ ...prev, [field.name]: v }))} required={!!field.is_required} placeholder={placeholder} />
                })}
              </div>
            ) : null}

            {/* Companion holders */}
            {holders.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <p className="font-medium text-sm text-gray-700">{t('checkout.holder_info')}</p>
                {holders.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('checkout.per_ticket')} {i + 2}</p>
                    <InputField label={t('checkout.name')} value={h.name} onChange={v => updateHolder(i, 'name', v)} placeholder={t('checkout.companion_name')} />
                    <InputField label={t('checkout.email')} type="email" value={h.email} onChange={v => updateHolder(i, 'email', v)} placeholder={t('checkout.companion_email')} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setError(null); setStep(1) }} className="flex-1 py-3 rounded-xl border text-sm font-medium transition" style={{ borderColor: '#e5e7eb', color: '#4b5563' }}>{t('checkout.back')}</button>
              <button onClick={() => { if (validateStep2()) { setError(null); setStep(3) } }}
                className="flex-[2] py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}>{t('checkout.next')}</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 mb-2">{t('checkout.order_summary')}</h2>

            <div className="space-y-3 text-sm" style={{ color: '#111827' }}>
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span style={{ color: '#6b7280' }}>{item.name} x{item.quantity}</span>
                  <span className="font-medium">{item.price === 0 ? t('checkout.free') : formatPrice(item.price * item.quantity, item.currency)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2" />
              <div className="flex justify-between"><span style={{ color: '#6b7280' }}>{t('checkout.buyer')}</span><span className="font-medium">{buyer.name}</span></div>
              <div className="flex justify-between"><span style={{ color: '#6b7280' }}>{t('checkout.email')}</span><span className="font-medium">{buyer.email}</span></div>
              <div className="flex justify-between pt-3 border-t text-base" style={{ borderColor: '#f3f4f6' }}>
                <span className="font-semibold">{t('checkout.total')}</span>
                <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                  {totalAmount === 0 ? t('checkout.free') : formatPrice(totalAmount, currency)}
                </span>
              </div>
            </div>

            {totalAmount > 0 && (
              <p className="text-xs text-gray-400 text-center">{t('checkout.payos_redirect')}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setError(null); setStep(2) }} className="flex-1 py-3 rounded-xl border text-sm font-medium transition" style={{ borderColor: '#e5e7eb', color: '#4b5563' }}>{t('checkout.back')}</button>
              <button onClick={handleConfirm} disabled={submitting}
                className="flex-[2] py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}>
                {submitting ? t('checkout.loading') : t('checkout.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
