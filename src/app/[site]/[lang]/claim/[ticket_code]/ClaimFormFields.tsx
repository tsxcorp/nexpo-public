'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'

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
  fields: FormField[]
  answers: Record<string, string>
  onChange: (fieldName: string, value: string) => void
  lang: string
}

function InputField({
  label, value, onChange, type = 'text', required = false, placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; placeholder?: string
}) {
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

export default function ClaimFormFields({ fields, answers, onChange, lang }: Props) {
  const { t } = useTranslation()

  return (
    <>
      {fields.map(field => {
        const tr = field.translations?.find(tr => tr.languages_code?.startsWith(lang)) ?? field.translations?.[0]
        const label = tr?.label || field.name
        const placeholder = tr?.placeholder || ''
        const rawOptions = tr?.options ?? field.options ?? []
        const selectOptions = typeof rawOptions === 'string' ? (() => { try { return JSON.parse(rawOptions) } catch { return [] } })() : rawOptions

        if (field.type === 'select' && selectOptions.length) {
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <select
                value={answers[field.name] ?? ''}
                onChange={e => onChange(field.name, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              >
                <option value="">{t('claim.select_placeholder')}</option>
                {selectOptions.map((opt: { label: string; value: string }) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <textarea
                value={answers[field.name] ?? ''}
                onChange={e => onChange(field.name, e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition resize-none"
                style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </div>
          )
        }

        if (field.type === 'multiselect' && selectOptions.length) {
          const selected = (answers[field.name] ?? '').split(',').filter(Boolean)
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}{field.is_required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {selectOptions.map((opt: { label: string; value: string }) => {
                  const isSelected = selected.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? selected.filter(v => v !== opt.value)
                          : [...selected, opt.value]
                        onChange(field.name, next.join(','))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        }

        const inputType =
          field.type === 'email' ? 'email'
          : field.type === 'number' ? 'number'
          : field.type === 'date' ? 'date'
          : 'text'

        return (
          <InputField
            key={field.id}
            label={label}
            type={inputType}
            value={answers[field.name] ?? ''}
            onChange={v => onChange(field.name, v)}
            required={!!field.is_required}
            placeholder={placeholder}
          />
        )
      })}
    </>
  )
}
