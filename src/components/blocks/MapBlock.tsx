import React from 'react';
import BlockContainer from '@/components/BlockContainer';

interface MapBlockData {
  id?: string;
  embed_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number | null;
  height?: string | null;
  marker_label?: string | null;
}

interface Props {
  data: MapBlockData;
}

// Validate Google Maps embed URL to prevent arbitrary iframe injection
function isValidEmbedUrl(url: string): boolean {
  return url.startsWith('https://www.google.com/maps/embed');
}

// Build Google Maps embed URL from lat/lng coordinates
function buildCoordEmbedUrl(lat: number, lng: number, zoom: number): string {
  return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d${Math.round(156543 / Math.pow(2, zoom) * 256)}!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0`;
}

export default function MapBlock({ data }: Props) {
  const height = data.height || '400px';
  const zoom = data.zoom ?? 15;

  // Resolve embed URL: prefer explicit embed_url, fall back to coordinates
  let resolvedUrl: string | null = null;
  if (data.embed_url && isValidEmbedUrl(data.embed_url)) {
    resolvedUrl = data.embed_url;
  } else if (data.latitude != null && data.longitude != null) {
    resolvedUrl = buildCoordEmbedUrl(data.latitude, data.longitude, zoom);
  }

  if (!resolvedUrl) return null;

  return (
    <BlockContainer className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
      {data.marker_label && (
        <p className="text-sm font-medium text-neutral-600 mb-3 flex items-center gap-1.5">
          <svg
            className="w-4 h-4 text-red-500"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {data.marker_label}
        </p>
      )}
      <div className="w-full overflow-hidden rounded-xl border border-neutral-200 shadow-sm">
        <iframe
          src={resolvedUrl}
          width="100%"
          height={height}
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={data.marker_label || 'Map'}
        />
      </div>
    </BlockContainer>
  );
}
