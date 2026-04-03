'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from './ThemeProvider';

/** Fonts bundled via next/font — skip loading from Google */
const BUNDLED_FONTS = ['geist', 'inter'];
const SYSTEM_FONTS = ['sans-serif', 'serif', 'monospace', 'arial', 'helvetica', 'system-ui'];

function shouldLoadFont(fontFamily: string): boolean {
  const name = fontFamily.split(',')[0].trim().replace(/['"]/g, '').toLowerCase();
  return !BUNDLED_FONTS.includes(name) && !SYSTEM_FONTS.includes(name);
}

function loadGoogleFonts(families: string[]) {
  if (typeof document === 'undefined') return;
  const toLoad = families.filter(shouldLoadFont).map(f => f.split(',')[0].trim().replace(/['"]/g, ''));
  if (toLoad.length === 0) return;

  const params = toLoad.map(n => `family=${encodeURIComponent(n)}:wght@400;500;600;700;800`).join('&');
  const url = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  if (document.querySelector(`link[href="${url}"]`)) return;

  // Preconnect
  if (!document.querySelector('link[href="https://fonts.googleapis.com"][rel="preconnect"]')) {
    const pc = document.createElement('link');
    pc.rel = 'preconnect';
    pc.href = 'https://fonts.googleapis.com';
    document.head.appendChild(pc);
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

interface ClientThemeWrapperProps {
  children: React.ReactNode;
  theme: any;
  globals: any;
  styleVars: Record<string, string>;
}

export function ClientThemeWrapper({ children, theme, globals, styleVars }: ClientThemeWrapperProps) {
  // Load custom Google Fonts when theme specifies non-bundled fonts
  useEffect(() => {
    const families: string[] = [];
    if (theme?.fonts?.families?.display) families.push(theme.fonts.families.display);
    if (theme?.fonts?.families?.body) families.push(theme.fonts.families.body);
    loadGoogleFonts(families);
  }, [theme?.fonts?.families?.display, theme?.fonts?.families?.body]);

  return (
    <div style={styleVars as React.CSSProperties}>
      <ThemeProvider theme={theme} globals={globals}>
        {children}
      </ThemeProvider>
    </div>
  );
} 