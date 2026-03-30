'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  ticket: {
    id: string
    holder_name: string
    holder_email: string | null
    status: string
    ticket_class_id: string
    registration_id: string | null
  }
  form: any | null
  site: string
  lang: string
  registrationId: string | null
}

export default function ClaimClient({ ticket, site, lang, registrationId }: Props) {
  const router = useRouter()
  const isVI = lang === 'vi'

  const [name, setName] = useState(ticket.holder_name ?? '')
  const [email, setEmail] = useState(ticket.holder_email ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const T = {
    title: isVI ? 'Nhận vé của bạn' : 'Claim Your Ticket',
    subtitle: isVI ? 'Điền thông tin để nhận mã QR vào cửa.' : 'Fill in your details to receive your entry QR code.',
    name: isVI ? 'Họ và tên' : 'Full Name',
    email: 'Email',
    submit: isVI ? 'Nhận vé' : 'Claim Ticket',
    loading: isVI ? 'Đang xử lý...' : 'Processing...',
    success: isVI ? 'Đã nhận vé! Đang chuyển hướng...' : 'Ticket claimed! Redirecting...',
    err_required: isVI ? 'Vui lòng điền đủ tên và email.' : 'Name and email are required.',
    err_general: isVI ? 'Đã có lỗi. Vui lòng thử lại.' : 'Something went wrong. Please try again.',
    already_used: isVI ? 'Vé này đã được sử dụng.' : 'This ticket has already been used.',
  }

  if (ticket.status === 'used') {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-semibold text-gray-700">{T.already_used}</h1>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError(T.err_required); return }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticket.id,
          registration_id: registrationId,
          name: name.trim(),
          email: email.trim(),
          site_slug: site,
          lang,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? T.err_general); return }
      // Redirect to insight
      if (data.registration_id) {
        router.push(`https://insights.nexpo.vn/${data.registration_id}`)
      }
    } catch {
      setError(T.err_general)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎟️</div>
        <h1 className="text-2xl font-bold text-gray-900">{T.title}</h1>
        <p className="text-gray-500 text-sm mt-2">{T.subtitle}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {T.name}<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--color-primary)' } as any}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {T.email}<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl text-white font-semibold mt-2 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? T.loading : T.submit}
        </button>
      </form>
    </div>
  )
}
