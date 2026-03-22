import React from 'react';
import '@/app/globals.css'; // Đảm bảo Tailwind được import
import { getTranslations } from '@/i18n/i18n'

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;
  
  // Initialize i18n instance
  await getTranslations({ locale: lang })

  // pt-16 = header height on mobile (~64px: logo h-10 + py-3)
  // md:pt-20 = header height on desktop (~80px: logo h-14 + py-3)
  return <div className="pt-16 md:pt-20">{children}</div>;
} 