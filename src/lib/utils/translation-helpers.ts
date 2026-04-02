/**
 * Utilities for handling Directus translation lookups.
 * Handles both correct string format ("en-US") and legacy corrupted
 * JSON object format for languages_code field ({"code":"en-US"}).
 */

/**
 * Resolve a languages_code value regardless of whether it's a plain string
 * or a stringified JSON object (corruption artifact from nexpo-admin).
 */
function resolveLanguagesCode(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed?.code === 'string' ? parsed.code : raw
    } catch {
      return raw
    }
  }
  return raw
}

/**
 * Find translation for given language, handling both correct string format
 * and legacy corrupted JSON object format for languages_code field.
 * Falls back to the first available translation if no match found.
 */
export function findTranslation<T extends { languages_code: string }>(
  translations: T[] | undefined | null,
  lang: string
): T | undefined {
  if (!translations?.length) return undefined
  const directusLang = lang === 'en' ? 'en-US' : 'vi-VN'
  return (
    translations.find(t => resolveLanguagesCode(t.languages_code) === directusLang) ??
    translations[0]
  )
}

/** Map frontend lang code to Directus language code */
export function toDirectusLang(lang: string): string {
  return lang === 'en' ? 'en-US' : 'vi-VN'
}
