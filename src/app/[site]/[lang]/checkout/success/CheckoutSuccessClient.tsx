'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'

interface Props { site: string; lang: string }

export default function CheckoutSuccessClient({ site, lang }: Props) {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const isVI = lang === 'vi'

  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'error'>('loading')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!orderId) { setStatus('error'); return }

    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/order-status?id=${orderId}`)
        const data = await res.json()
        if (cancelled) return
        if (data.status === 'paid') {
          setStatus('paid')
        } else if (attempts >= 10) {
          setStatus('pending')
        } else {
          setAttempts(a => a + 1)
          setTimeout(poll, 2000)
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    poll()
    return () => { cancelled = true }
  }, [orderId, attempts])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p className="text-gray-500 text-sm">
          {isVI ? 'Đang xác nhận thanh toán...' : 'Confirming payment...'}
        </p>
      </div>
    )
  }

  if (status === 'paid') {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <CheckCircle size={56} className="text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">
          {isVI ? 'Đặt vé thành công! 🎉' : 'Booking confirmed! 🎉'}
        </h1>
        <p className="text-gray-500 max-w-sm">
          {isVI
            ? 'Vé của bạn đã được xác nhận. Kiểm tra email để nhận mã QR.'
            : 'Your ticket is confirmed. Check your email for the QR code.'}
        </p>
        <Link
          href={`/${site}/${lang}/tickets`}
          className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          {isVI ? 'Xem vé khác' : 'Browse more tickets'}
        </Link>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Loader2 size={48} style={{ color: 'var(--color-primary)' }} />
        <h1 className="text-2xl font-bold text-gray-900">
          {isVI ? 'Đang chờ xác nhận' : 'Payment being processed'}
        </h1>
        <p className="text-gray-500 max-w-sm">
          {isVI
            ? 'Thanh toán đang được xử lý. Bạn sẽ nhận email xác nhận sớm.'
            : 'Your payment is being processed. You will receive a confirmation email shortly.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <XCircle size={48} className="text-red-400" />
      <p className="text-gray-500">{isVI ? 'Không tìm thấy đơn vé.' : 'Order not found.'}</p>
    </div>
  )
}
