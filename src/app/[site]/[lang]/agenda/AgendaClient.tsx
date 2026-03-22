'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import { getDirectusMedia } from '@/lib/utils/directus-helpers'
import type { AgendaSession, AgendaTrack } from '@/directus/types'

// ─── Config ──────────────────────────────────────────────────────────────────

const TRACK_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EC4899',
  '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16',
]
const DEFAULT_TRACK_COLOR = '#64748B'

const SESSION_TYPE_LABEL: Record<string, string> = {
  keynote: 'Keynote', talk: 'Talk', panel: 'Panel',
  workshop: 'Workshop', break: 'Break', networking: 'Networking',
  ceremony: 'Ceremony', other: 'Other',
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface FlatSession {
  id: string
  dayKey: string
  trackKey: string
  title: string
  startTime: string
  endTime: string
  location: string
  speakers: Array<{ id: string; name: string; photo?: string | null }>
  type: string
  description: string
  featured: boolean
}

interface Day {
  key: string
  date?: string
  dayNumber?: number | null
  label: string
  shortDate: string
}

interface Track {
  id: string
  name: string
  color: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtTime(value?: string | null): string {
  if (!value) return ''
  if (/^\d{2}:\d{2}/.test(value)) return value.substring(0, 5)
  try {
    const d = new Date(value)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function pickTitle(
  translations?: Array<{ languages_code?: string; title?: string }>,
  lang?: string
): string | null {
  if (!translations?.length) return null
  return (
    translations.find(t => t.languages_code?.startsWith(lang ?? 'vi'))?.title ??
    translations.find(t => t.languages_code?.startsWith('en'))?.title ??
    translations[0]?.title ??
    null
  )
}

function pickDescription(
  translations?: Array<{ languages_code?: string; description?: string | null }>,
  lang?: string
): string {
  if (!translations?.length) return ''
  return (
    translations.find(t => t.languages_code?.startsWith(lang ?? 'vi'))?.description ??
    translations.find(t => t.languages_code?.startsWith('en'))?.description ??
    translations[0]?.description ??
    ''
  ) || ''
}

// ─── buildSchedule ────────────────────────────────────────────────────────────

function buildSchedule(
  agendas: AgendaSession[],
  agendaTracks: AgendaTrack[],
  lang: string
): { days: Day[]; tracks: Track[]; sessions: FlatSession[] } {
  const tracksById = new Map<string, Track>(
    agendaTracks.map((t, i) => [
      t.id,
      {
        id: t.id,
        name:
          t.translations?.find(tr => tr.languages_code?.startsWith(lang))?.name ??
          t.default_name ??
          t.track_slug ??
          t.id,
        color: t.track_color ?? TRACK_PALETTE[i % TRACK_PALETTE.length],
      },
    ])
  )

  // Build days
  const dayMap = new Map<string, Day>()
  for (const a of agendas) {
    const key = a.date ?? (a.day_number != null ? `day-${a.day_number}` : 'no-day')
    if (!dayMap.has(key)) {
      dayMap.set(key, {
        key,
        date: a.date ?? undefined,
        dayNumber: a.day_number ?? null,
        label: a.day_number ? `Day ${a.day_number}` : 'Program',
        shortDate: a.date ? fmtDate(a.date) : a.day_number ? `Day ${a.day_number}` : '—',
      })
    }
  }
  const days = Array.from(dayMap.values()).sort((a, b) => a.key.localeCompare(b.key))

  // Location → color for sessions without track
  const locationColorMap = new Map<string, string>()
  let colorIdx = agendaTracks.length

  function getLocationColor(loc: string): string {
    if (!locationColorMap.has(loc)) {
      locationColorMap.set(loc, TRACK_PALETTE[colorIdx++ % TRACK_PALETTE.length])
    }
    return locationColorMap.get(loc)!
  }

  // Build flat sessions from agendas (fallback mode — no sessions collection)
  const flatSessions: FlatSession[] = []
  for (const a of agendas) {
    const hasSessionData = Boolean(a.start_time) || Boolean(a.end_time) || Boolean(a.session_type)
    if (!hasSessionData) continue

    const rawTrackId = typeof a.track_id === 'string' ? a.track_id : (a.track_id as any)?.id ?? null
    const resolvedTrack = rawTrackId ? tracksById.get(rawTrackId) : null
    const trackKey = resolvedTrack?.id ?? a.location ?? 'General'
    const dayKey = a.date ?? (a.day_number != null ? `day-${a.day_number}` : 'no-day')

    // M2M speakers: speakers.speakers_id.name
    const speakerList = (a.speakers ?? [])
      .map(j => j.speakers_id)
      .filter((s): s is NonNullable<typeof s> => !!s)

    flatSessions.push({
      id: a.id,
      dayKey,
      trackKey,
      title: pickTitle(a.translations, lang) ?? 'Untitled',
      startTime: fmtTime(a.start_time),
      endTime: fmtTime(a.end_time),
      location: a.location ?? '',
      speakers: speakerList,
      type: a.session_type ?? 'other',
      description: pickDescription(a.translations, lang),
      featured: a.is_featured ?? false,
    })
  }

  // Build tracks from used trackKeys
  const usedKeys = new Set(flatSessions.map(s => s.trackKey))
  const tracks: Track[] = []
  for (const key of usedKeys) {
    const byId = tracksById.get(key)
    if (byId) {
      tracks.push(byId)
    } else {
      tracks.push({ id: key, name: key, color: getLocationColor(key) })
    }
  }
  if (tracks.length === 0) {
    tracks.push({ id: 'General', name: 'General', color: DEFAULT_TRACK_COLOR })
  }

  return { days, tracks, sessions: flatSessions }
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  track,
  expanded,
  onToggle,
}: {
  session: FlatSession
  track: Track
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-shadow w-full"
      style={{ borderLeftWidth: '3px', borderLeftColor: track.color }}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(session.startTime || session.endTime) && (
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              {session.startTime}{session.endTime ? ` – ${session.endTime}` : ''}
            </span>
          )}
          {session.type && session.type !== 'other' && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ color: track.color }}>
              {SESSION_TYPE_LABEL[session.type] ?? session.type}
            </span>
          )}
        </div>
        {session.featured && <span className="text-yellow-500 text-xs">⭐</span>}
      </div>

      <h4 className="font-semibold text-sm text-gray-800 mb-1 leading-snug">{session.title}</h4>

      {session.location && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <svg className="w-3 h-3 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {session.location}
        </div>
      )}

      {session.speakers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {session.speakers.slice(0, 3).map((sp, idx) => {
            const photoUrl = sp.photo ? getDirectusMedia(sp.photo) : null
            return (
              <div key={`${sp.id}-${idx}`} className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {photoUrl ? (
                    <Image src={photoUrl} alt={sp.name} width={20} height={20} className="object-cover w-full h-full" />
                  ) : (
                    <span className="flex items-center justify-center h-full text-[10px] text-gray-500">
                      {sp.name?.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">{sp.name}</span>
              </div>
            )
          })}
          {session.speakers.length > 3 && (
            <span className="text-xs text-gray-400">+{session.speakers.length - 3}</span>
          )}
        </div>
      )}

      {expanded && session.description && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-gray-500 leading-relaxed">{session.description}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  sessions: AgendaSession[]
  tracks: AgendaTrack[]
  lang: string
  t: {
    all_days: string
    day: string
    all_tracks: string
    no_sessions: string
  }
}

export default function AgendaClient({ sessions, tracks, lang, t }: Props) {
  const schedule = useMemo(() => buildSchedule(sessions, tracks, lang), [sessions, tracks, lang])

  const [activeDayKey, setActiveDayKey] = useState<string | null>(null)
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const currentDayKey = activeDayKey ?? schedule.days[0]?.key ?? null
  const activeTracks = selectedTracks.length > 0 ? selectedTracks : schedule.tracks.map(t => t.id)

  const filteredSessions = useMemo(
    () => schedule.sessions.filter(s => s.dayKey === currentDayKey && activeTracks.includes(s.trackKey)),
    [schedule.sessions, currentDayKey, activeTracks]
  )

  const timeSlots = useMemo(
    () => [...new Set(filteredSessions.map(s => s.startTime))].sort(),
    [filteredSessions]
  )

  const getTrack = (id: string): Track =>
    schedule.tracks.find(t => t.id === id) ?? { id, name: id, color: DEFAULT_TRACK_COLOR }

  const toggleTrack = (id: string) => {
    setSelectedTracks(prev => {
      const all = schedule.tracks.map(t => t.id)
      const current = prev.length > 0 ? prev : all
      if (current.length === 1 && current[0] === id) return current
      return current.includes(id) ? current.filter(t => t !== id) : [...current, id]
    })
  }

  if (schedule.days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>{t.no_sessions}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Day tabs + track filter */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Day tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.day}:</span>
          <div className="flex gap-1 flex-wrap">
            {schedule.days.map(day => {
              const isActive = currentDayKey === day.key
              return (
                <button
                  key={day.key}
                  onClick={() => { setActiveDayKey(day.key); setSelectedTracks([]) }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center min-w-[52px] border"
                  style={
                    isActive
                      ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                      : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }
                  }
                >
                  {day.date && (
                    <span className={`block text-[10px] ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
                      {day.shortDate}
                    </span>
                  )}
                  <span>{day.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Track filter */}
        {schedule.tracks.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Track:</span>
            {schedule.tracks.map(track => {
              const active = activeTracks.includes(track.id)
              return (
                <button
                  key={track.id}
                  onClick={() => toggleTrack(track.id)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all border"
                  style={{
                    backgroundColor: active ? track.color : 'white',
                    borderColor: active ? track.color : '#e2e8f0',
                    color: active ? '#fff' : track.color,
                  }}
                >
                  {track.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
        </span>
        <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
          {(['timeline', 'list'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                viewMode === mode ? 'bg-slate-100 text-gray-800' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {mode === 'timeline' ? '⊞ Timeline' : '≡ List'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline view */}
      {viewMode === 'timeline' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div style={{ minWidth: `${80 + activeTracks.length * 220}px` }}>
            {/* Track headers */}
            <div
              className="grid border-b border-slate-200 sticky top-0 z-10 bg-white"
              style={{ gridTemplateColumns: `80px repeat(${activeTracks.length}, minmax(200px, 1fr))` }}
            >
              <div className="px-3 py-2.5 text-xs font-semibold text-gray-400 border-r border-slate-200">
                Time
              </div>
              {activeTracks.map(trackId => {
                const track = getTrack(trackId)
                return (
                  <div
                    key={trackId}
                    className="px-3 py-2.5 text-sm font-bold text-white text-center"
                    style={{ backgroundColor: track.color }}
                  >
                    {track.name}
                  </div>
                )
              })}
            </div>

            {timeSlots.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">{t.no_sessions}</div>
            ) : (
              timeSlots.map((time, rowIdx) => (
                <div
                  key={time}
                  className={`grid ${rowIdx > 0 ? 'border-t border-slate-100' : ''}`}
                  style={{ gridTemplateColumns: `80px repeat(${activeTracks.length}, minmax(200px, 1fr))` }}
                >
                  <div className="px-3 py-3 text-sm font-medium text-gray-500 border-r border-slate-100 bg-slate-50 flex items-start">
                    {time || '—'}
                  </div>
                  {activeTracks.map(trackId => {
                    const track = getTrack(trackId)
                    const here = filteredSessions.filter(
                      s => s.startTime === time && s.trackKey === trackId
                    )
                    return (
                      <div key={trackId} className="p-2 border-l border-slate-100 min-h-[80px] space-y-2">
                        {here.map(session => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            track={track}
                            expanded={expandedId === session.id}
                            onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">{t.no_sessions}</div>
          ) : (
            [...filteredSessions]
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  track={getTrack(session.trackKey)}
                  expanded={expandedId === session.id}
                  onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                />
              ))
          )}
        </div>
      )}
    </div>
  )
}
