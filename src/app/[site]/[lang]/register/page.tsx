import React from 'react'
import type { Metadata } from 'next'
import { getSite } from '@/directus/queries/sites'
import { fetchRegistrationForm } from '@/directus/queries/forms'
import { fetchNavigationSafe } from '@/directus/queries/navigation'
import TheHeader from '@/components/navigation/TheHeader'
import TheFooter from '@/components/navigation/TheFooter'
import FormBlock from '@/components/blocks/FormBlock'
import type { PageProps } from '@/types/next'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { site, lang } = await params
  const siteData = await getSite(site)
  const title = lang === 'vi' ? 'Đăng ký tham dự' : 'Register'
  return {
    title: siteData?.name ? `${title} — ${siteData.name}` : title,
    robots: { index: false, follow: false },
  }
}

export default async function RegisterPage({ params }: PageProps) {
  const { site, lang } = await params
  const currentPathname = `/${site}/${lang}/register`

  const [siteData, mainNav, footerNav] = await Promise.all([
    getSite(site),
    fetchNavigationSafe(site, lang, 'header'),
    fetchNavigationSafe(site, lang, 'footer'),
  ])

  const eventId = (siteData as any)?.event_id as number | undefined
  const form = await fetchRegistrationForm(site, eventId)

  const t = lang === 'vi'
    ? { title: 'Đăng ký tham dự', not_found: 'Form đăng ký chưa được cấu hình.' }
    : { title: 'Register', not_found: 'Registration form is not available yet.' }

  return (
    <>
      <TheHeader
        navigation={mainNav}
        lang={lang}
        site={siteData?.slug ?? site}
        siteData={siteData}
        translations={[]}
        pathname={currentPathname}
      />

      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-3xl font-bold text-center mb-10"
            style={{ color: 'var(--color-primary)' }}
          >
            {t.title}
          </h1>

          {form ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
              <FormBlock
                data={{
                  id: form.id,
                  form,
                  translations: [],
                }}
                lang={lang}
              />
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20">
              <p>{t.not_found}</p>
            </div>
          )}
        </div>
      </main>

      <TheFooter navigation={footerNav} lang={lang} pathname={currentPathname} />
    </>
  )
}
