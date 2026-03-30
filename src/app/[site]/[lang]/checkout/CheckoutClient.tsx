'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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

function formatPrice(price: number, currency: string) {
  if (currency === 'VND') return price.toLocaleString('vi-VN') + '₫'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)
}

interface InputFieldProps { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }
function InputField({ label, value, onChange, type = 'text', required = false, placeholder = '' }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
        style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
      />
    </div>
  )
}

interface Props { site: string; lang: string; initialTicketClass: TicketClass | null }

export default function CheckoutClient({ site, lang, initialTicketClass }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initQty = Math.max(1, parseInt(searchParams.get('qty') ?? '1', 10))

  const isVI = lang === 'vi'
  const T = {
    step1: isVI ? 'Chọn vé' : 'Select Ticket',
    step2: isVI ? 'Thông tin' : 'Your Info',
    step3: isVI ? 'Xác nhận & Thanh toán' : 'Confirm & Pay',
    next: isVI ? 'Tiếp tục' : 'Continue',
    back: isVI ? 'Quay lại' : 'Back',
    confirm: isVI ? 'Xác nhận & Đặt vé' : 'Confirm & Book',
    loading: isVI ? 'Đang xử lý...' : 'Processing...',
    qty: isVI ? 'Số lượng' : 'Quantity',
    name: isVI ? 'Họ và tên' : 'Full Name',
    email: 'Email',
    phone: isVI ? 'Số điện thoại' : 'Phone',
    holderInfo: isVI ? 'Thông tin người đi kèm' : 'Companion Info',
    total: isVI ? 'Tổng cộng' : 'Total',
    free: isVI ? 'Miễn phí' : 'Free',
    ticket: isVI ? 'loại vé' : 'ticket class',
    perTicket: isVI ? 'Vé' : 'Ticket',
    errRequired: isVI ? 'Vui lòng điền đầy đủ thông tin bắt buộc.' : 'Please fill in all required fields.',
    errSoldOut: isVI ? 'Vé đã hết.' : 'Tickets sold out.',
    errGeneral: isVI ? 'Đã có lỗi xảy ra. Vui lòng thử lại.' : 'Something went wrong. Please try again.',
  }

  const [step, setStep] = useState(1)
  const [ticketClass] = useState<TicketClass | null>(initialTicketClass)
  const [qty, setQty] = useState(initialTicketClass ? Math.min(initQty, initialTicketClass.max_per_order) : initQty)
  const [buyer, setBuyer] = useState<BuyerInfo>({ name: '', email: '', phone: '' })
  const [holders, setHolders] = useState<HolderInfo[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync holders array to qty
  useEffect(() => {
    setHolders(prev => {
      const extras = qty - 1
      if (extras <= 0) return []
      const next = [...prev]
      while (next.length < extras) next.push({ name: '', email: '' })
      return next.slice(0, extras)
    })
  }, [qty])

  const updateHolder = useCallback((idx: number, field: keyof HolderInfo, value: string) => {
    setHolders(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }, [])

  const validateStep1 = () => {
    if (!ticketClass) return false
    const remaining = ticketClass.quantity_total === -1 ? Infinity : ticketClass.quantity_total - ticketClass.quantity_sold
    if (qty > remaining) { setError(T.errSoldOut); return false }
    if (qty > ticketClass.max_per_order) return false
    return true
  }

  const validateStep2 = () => {
    if (!buyer.name.trim() || !buyer.email.trim()) { setError(T.errRequired); return false }
    return true
  }

  const handleConfirm = async () => {
    if (!ticketClass) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_class_id: ticketClass.id,
          quantity: qty,
          buyer,
          holders,
          site_slug: site,
          lang,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? T.errGeneral); return }
      if (data.payment_url) {
        window.location.href = data.payment_url
      } else {
        // Free order — go to success
        router.push(`/${site}/${lang}/checkout/success?order=${data.order_id}`)
      }
    } catch {
      setError(T.errGeneral)
    } finally {
      setSubmitting(false)
    }
  }

  if (!ticketClass) {
    return <div className="text-center py-24 text-gray-400">{isVI ? 'Không tìm thấy loại vé.' : 'Ticket class not found.'}</div>
  }

  const totalAmount = ticketClass.price * qty

  // ── Step indicator ──
  const steps = [T.step1, T.step2, T.step3]
  const StepBar = () => (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const active = step === n
        const done = step > n
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
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

        {/* ── Step 1: Select quantity ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-lg">{ticketClass.name}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
                  {ticketClass.price === 0 ? T.free : formatPrice(ticketClass.price, ticketClass.currency)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{T.qty}</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition"
                  style={{ background: '#f3f4f6', color: '#374151' }}
                >-</button>
                <span className="text-lg font-semibold w-8 text-center" style={{ color: '#111827' }}>{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(ticketClass.max_per_order, q + 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >+</button>
                <span className="text-xs" style={{ color: '#9ca3af' }}>max {ticketClass.max_per_order}</span>
              </div>
            </div>

            {totalAmount > 0 && (
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-gray-600 text-sm">{T.total}</span>
                <span className="text-xl font-bold text-gray-900">{formatPrice(totalAmount, ticketClass.currency)}</span>
              </div>
            )}

            <button
              onClick={() => { if (validateStep1()) { setError(null); setStep(2) } }}
              className="w-full py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >{T.next}</button>
          </div>
        )}

        {/* ── Step 2: Buyer info ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">{isVI ? 'Thông tin người mua' : 'Buyer Information'}</h2>

            <InputField label={T.name} value={buyer.name} onChange={(v: string) => setBuyer(b => ({ ...b, name: v }))} required placeholder={isVI ? 'Nguyễn Văn A' : 'John Doe'} />
            <InputField label={T.email} type="email" value={buyer.email} onChange={(v: string) => setBuyer(b => ({ ...b, email: v }))} required placeholder="email@example.com" />
            <InputField label={T.phone} type="tel" value={buyer.phone} onChange={(v: string) => setBuyer(b => ({ ...b, phone: v }))} placeholder="+84..." />

            {/* Companion holders if qty > 1 */}
            {holders.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <p className="font-medium text-sm text-gray-700">{T.holderInfo}</p>
                {holders.map((h, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gray-50 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{T.perTicket} {i + 2}</p>
                    <InputField label={T.name} value={h.name} onChange={(v: string) => updateHolder(i, 'name', v)} placeholder={isVI ? 'Tên người đi kèm' : "Companion's name"} />
                    <InputField label={T.email} type="email" value={h.email} onChange={(v: string) => updateHolder(i, 'email', v)} placeholder={isVI ? 'Email người đi kèm (để nhận link)' : "Companion email (to receive claim link)"} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setError(null); setStep(1) }} className="flex-1 py-3 rounded-xl border text-sm font-medium transition" style={{ borderColor: '#e5e7eb', color: '#4b5563' }}>{T.back}</button>
              <button
                onClick={() => { if (validateStep2()) { setError(null); setStep(3) } }}
                className="flex-[2] py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)' }}
              >{T.next}</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-semibold text-gray-900 mb-2">{isVI ? 'Xác nhận đơn vé' : 'Order Summary'}</h2>

            <div className="space-y-3 text-sm" style={{ color: '#111827' }}>
              <div className="flex justify-between">
                <span style={{ color: '#6b7280' }}>{isVI ? 'Loại vé' : 'Ticket'}</span>
                <span className="font-medium">{ticketClass.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6b7280' }}>{T.qty}</span>
                <span className="font-medium">{qty}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6b7280' }}>{isVI ? 'Người mua' : 'Buyer'}</span>
                <span className="font-medium">{buyer.name}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#6b7280' }}>Email</span>
                <span className="font-medium">{buyer.email}</span>
              </div>
              <div className="flex justify-between pt-3 border-t text-base" style={{ borderColor: '#f3f4f6' }}>
                <span className="font-semibold">{T.total}</span>
                <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                  {totalAmount === 0 ? T.free : formatPrice(totalAmount, ticketClass.currency)}
                </span>
              </div>
            </div>

            {totalAmount > 0 && (
              <p className="text-xs text-gray-400 text-center">
                {isVI ? 'Bạn sẽ được chuyển đến trang thanh toán PayOS.' : 'You will be redirected to PayOS payment page.'}
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setError(null); setStep(2) }} className="flex-1 py-3 rounded-xl border text-sm font-medium transition" style={{ borderColor: '#e5e7eb', color: '#4b5563' }}>{T.back}</button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-[2] py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
              >
                {submitting ? T.loading : T.confirm}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
