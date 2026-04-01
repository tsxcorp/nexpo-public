'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import ClaimFormFields from './ClaimFormFields'

interface FormField {
  id: string
  name: string
  type: string
  is_required?: boolean
  is_email_contact?: boolean
  is_name_field?: boolean
  is_phone_field?: boolean
  options?: Array<{ label: string; value: string }>
  translations?: Array<{
    languages_code: string
    label?: string
    placeholder?: string
    options?: Array<{ label: string; value: string }>
  }>
}

interface Props {
  ticket: {
    id: string
    holder_name: string
    holder_email: string | null
    status: string
    ticket_class_id: string
    registration_id: string | null
  }
  ticketClassForm: { id: string; fields: FormField[] } | null
  site: string
  lang: string
  registrationId: string | null
}

export default function ClaimClient({ ticket, ticketClassForm, site, lang, registrationId }: Props) {
  const router = useRouter()
  const { t } = useTranslation()

  const formFields = ticketClassForm?.fields ?? []
  const formHasContact = formFields.some(f => f.is_email_contact)
  // Show fallback name/email when no form OR form lacks contact tags
  const showSimpleFields = !ticketClassForm || !formHasContact

  const [name, setName] = useState(ticket.holder_name ?? '')
  const [email, setEmail] = useState(ticket.holder_email ?? '')
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (ticket.status === 'used') {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-semibold text-gray-700">{t('claim.already_used')}</h1>
      </div>
    )
  }

  const validate = (): boolean => {
    if (showSimpleFields && (!name.trim() || !email.trim())) {
      setError(t('claim.err_required'))
      return false
    }
    const missing = formFields.some(f => f.is_required && !(formAnswers[f.name] ?? '').trim())
    if (missing) {
      setError(t('claim.err_required_fields'))
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setError(null)

    // Derive contact from tagged form fields when form has contact tags
    let derivedName = name.trim()
    let derivedEmail = email.trim()
    if (ticketClassForm && formFields.length > 0) {
      const nameFields = formFields.filter(f => f.is_name_field)
      if (nameFields.length > 0) {
        const joined = nameFields.map(f => formAnswers[f.name] ?? '').filter(Boolean).join(' ')
        if (joined) derivedName = joined
      }
      const emailField = formFields.find(f => f.is_email_contact)
      if (emailField) derivedEmail = formAnswers[emailField.name] ?? email.trim()
    }

    // Build form_answers payload: [{ field: field.id, value }]
    const formAnswersPayload = ticketClassForm
      ? formFields.map(f => ({ field: f.id, value: formAnswers[f.name] ?? '' })).filter(a => a.value !== '')
      : []

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticket.id,
          registration_id: registrationId,
          name: derivedName,
          email: derivedEmail,
          site_slug: site,
          lang,
          ...(ticketClassForm && formAnswersPayload.length > 0
            ? { form_id: ticketClassForm.id, form_answers: formAnswersPayload }
            : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t('claim.err_general')); return }
      if (data.registration_id) {
        router.push(`https://insights.nexpo.vn/${data.registration_id}`)
      }
    } catch {
      setError(t('claim.err_general'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎟️</div>
        <h1 className="text-2xl font-bold text-gray-900">{t('claim.title')}</h1>
        <p className="text-gray-500 text-sm mt-2">{t('claim.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        {/* Simple name/email — shown when no form or form lacks contact tags */}
        {showSimpleFields && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('claim.name')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('claim.email')}<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </div>
          </>
        )}

        {/* Dynamic form fields from ticket class */}
        {formFields.length > 0 && (
          <div className={showSimpleFields ? 'pt-4 border-t border-gray-100 space-y-4' : 'space-y-4'}>
            <ClaimFormFields
              fields={formFields}
              answers={formAnswers}
              onChange={(fieldName: string, value: string) => setFormAnswers(prev => ({ ...prev, [fieldName]: value }))}
              lang={lang}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl text-white font-semibold mt-2 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {submitting ? t('claim.loading') : t('claim.submit')}
        </button>
      </form>
    </div>
  )
}
