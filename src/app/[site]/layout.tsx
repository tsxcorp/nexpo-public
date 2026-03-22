import React from 'react';
import { fetchGlobals } from '@/directus/queries/globals';
import { getSite } from '@/directus/queries/sites';
import '@/app/globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ClientThemeWrapper } from '@/components/providers/ClientThemeWrapper';
import { FontVariablesSetter } from '@/components/providers/FontVariablesSetter';
import { FaviconProvider } from '@/components/providers/FaviconProvider';
import { Metadata } from 'next';

const tailwindColors = { violet: '#8b5cf6', slate: '#64748b' };
const tailwindRadius = { xl: '1rem', lg: '0.5rem' };

// Generate metadata for the site
export async function generateMetadata({ params }: { params: Promise<{ site: string }> | { site: string } }): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const siteSlug = resolvedParams.site;
  
  try {
    const siteData = await getSite(siteSlug);
    const globals = await fetchGlobals(siteData?.id);
    
    const defaultTranslation = globals?.translations?.[0];
    
    // Use Directus URL directly for favicon instead of /api/assets/
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
    const faviconUrl = siteData?.favicon && directusUrl 
      ? `${directusUrl}/assets/${siteData.favicon}` 
      : '/favicon.ico';
    
    // Prefer: globals title → site translations title (any lang) → site name field → slug
    const siteTranslationTitle = siteData?.translations?.find(t =>
      t.languages_code?.startsWith('en') || t.languages_code?.startsWith('vi')
    )?.title || siteData?.translations?.[0]?.title;
    const siteName = defaultTranslation?.title || siteTranslationTitle || siteData?.name || siteSlug;
    return {
      title: {
        default: siteName,
        template: `%s | ${siteName}`
      },
      description: defaultTranslation?.description || 'Site description',
      icons: {
        icon: faviconUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Site',
      description: 'Site description',
    };
  }
}

// Create a theme context

export default async function SiteLayout(props: { children: React.ReactNode, params: Promise<{ site: string }> }) {
  const { children } = props;
  const params = await props.params;

  const timestamp = new Date().toISOString();
  process.stdout.write(`\n[${timestamp}] 🏗️ SITE_LAYOUT: Starting layout render for site: ${params.site}\n`);
  
  const siteSlug = params.site;

  // Fetch site data to get siteId and favicon
  process.stdout.write(`[${timestamp}] 📥 SITE_LAYOUT: Fetching site data...\n`);
  const siteData = await getSite(siteSlug);
  process.stdout.write(`[${timestamp}] 📦 SITE_LAYOUT: Received site data: ${siteData ? 'yes' : 'no'}\n`);

  // Fetch globals for this site
  process.stdout.write(`[${timestamp}] 📥 SITE_LAYOUT: Fetching globals...\n`);
  const globals = await fetchGlobals(siteData?.id);
  const theme = (globals as any)?.theme || globals?.translations?.[0]?.theme || {};
  process.stdout.write(`[${timestamp}] 📦 SITE_LAYOUT: Received globals: ${globals ? 'yes' : 'no'}\n`);
  
  // const theme = globals?.theme || {};
  process.stdout.write(`[${timestamp}] 🎨 SITE_LAYOUT: Theme data: ${JSON.stringify(theme, null, 2)}\n`);

  // Generate CSS variables from theme
  const styleVars = {
    '--color-primary': theme.primary || '#1E40AF',
    '--color-gray': theme.gray || '#1E293B',
    '--border-radius': theme.borderRadius || '1rem',
    '--font-display': theme.fonts?.families?.display || 'Poppins, sans-serif',
    '--font-body': theme.fonts?.families?.body || 'Inter, sans-serif',
    '--font-code': theme.fonts?.families?.code || 'Fira Code, monospace',
  };
  process.stdout.write(`[${timestamp}] 🎯 SITE_LAYOUT: Style variables: ${JSON.stringify(styleVars, null, 2)}\n`);

  const fontVars = {
    '--font-display': styleVars['--font-display'],
    '--font-body': styleVars['--font-body'],
    '--font-code': styleVars['--font-code'],
  };

  return (
    <ThemeProvider theme={theme} globals={globals}>
      <FaviconProvider siteData={siteData} />
      <FontVariablesSetter fontVars={fontVars} />
      <div style={styleVars as React.CSSProperties}>
        <ClientThemeWrapper theme={theme} globals={globals} styleVars={styleVars}>
          {children}
        </ClientThemeWrapper>
      </div>
    </ThemeProvider>
  );
} 