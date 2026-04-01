'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props { site: string; lang: string }

export default function CheckoutSuccessClient({ site, lang }: Props) {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  const { t } = useTranslation()

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
          {t('checkout_success.confirming')}
        </p>
      </div>
    )
  }

  if (status === 'paid') {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <CheckCircle size={56} className="text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">
          {t('checkout_success.confirmed_title')}
        </h1>
        <p className="text-gray-500 max-w-sm">
          {t('checkout_success.confirmed_body')}
        </p>
        <Link
          href={`/${site}/${lang}/tickets`}
          className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          {t('checkout_success.browse_more')}
        </Link>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Loader2 size={48} style={{ color: 'var(--color-primary)' }} />
        <h1 className="text-2xl font-bold text-gray-900">
          {t('checkout_success.processing_title')}
        </h1>
        <p className="text-gray-500 max-w-sm">
          {t('checkout_success.processing_body')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <XCircle size={48} className="text-red-400" />
      <p className="text-gray-500">{t('checkout_success.not_found')}</p>
    </div>
  )
}
