import React from 'react';

/**
 * Per-block section styling wrapper for the public site.
 *
 * Canonical sanitization logic lives in:
 *   nexpo-admin/src/features/pages/types/theme-types.ts
 * Keep these inline sanitizers in sync with that file.
 */

interface SectionStyle {
  paddingTop?: string;
  paddingBottom?: string;
  paddingX?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  maxWidth?: string;
}

interface BlockSectionWrapperProps {
  sectionStyle?: SectionStyle | null;
  children: React.ReactNode;
  className?: string;
}

/** Validate background image URL: HTTPS or Directus asset path only. Reject ')' to prevent CSS injection. */
function sanitizeBgUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.includes(')')) return undefined;
  if (trimmed.startsWith('https://')) return trimmed;
  if (/^\/assets\/[a-f0-9-]+/.test(trimmed)) return trimmed;
  return undefined;
}

/** Validate CSS max-width value */
function sanitizeMaxWidth(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value === 'full') return '100%';
  if (/^\d+(\.\d+)?(px|rem|%|em|vw)$/.test(value)) return value;
  return undefined;
}

/** Validate CSS color (hex, rgb/rgba, hsl/hsla, named colors) */
function sanitizeColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\([^)]+\)$/.test(v)) return v;
  if (/^[a-zA-Z]{3,20}$/.test(v)) return v;
  return undefined;
}

/** Validate CSS length value (digits + unit) */
function sanitizeCSSLength(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d+(\.\d+)?(px|rem|%|em|vw|vh)$/.test(v)) return v;
  if (/^var\(--[\w-]+(?:,\s*[\w.]+(?:px|rem|%|em)?)?\)$/.test(v)) return v;
  return undefined;
}

export default function BlockSectionWrapper({ sectionStyle, children, className }: BlockSectionWrapperProps) {
  if (!sectionStyle || Object.keys(sectionStyle).length === 0) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  const bgImage = sanitizeBgUrl(sectionStyle.backgroundImage);
  const maxWidth = sanitizeMaxWidth(sectionStyle.maxWidth);

  const style: React.CSSProperties = {
    paddingTop: sanitizeCSSLength(sectionStyle.paddingTop) || undefined,
    paddingBottom: sanitizeCSSLength(sectionStyle.paddingBottom) || undefined,
    paddingLeft: sanitizeCSSLength(sectionStyle.paddingX) || undefined,
    paddingRight: sanitizeCSSLength(sectionStyle.paddingX) || undefined,
    backgroundColor: sanitizeColor(sectionStyle.backgroundColor) || undefined,
    backgroundImage: bgImage ? `url(${bgImage})` : undefined,
    backgroundSize: bgImage ? 'cover' : undefined,
    backgroundPosition: bgImage ? 'center' : undefined,
    maxWidth: maxWidth || undefined,
    margin: maxWidth ? '0 auto' : undefined,
  };

  return <section style={style} className={className || undefined}>{children}</section>;
}
