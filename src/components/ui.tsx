import { useState } from 'react'
import { TYPE_COLORS, typeName, type Type } from '../lib/types'
import type { Form } from '../data/types'
import { usePrefs } from '../store/prefs'

export function TypeBadge({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'h-5 min-w-14 px-1.5 text-[10px]' : size === 'lg' ? 'h-7 min-w-20 px-3 text-xs' : 'h-6 min-w-16 px-2 text-[11px]'
  return <span className={`type-badge ${cls}`} style={{ background: TYPE_COLORS[type as Type] ?? '#888' }}>{typeName(type)}</span>
}

export function Types({ types, size }: { types: string[]; size?: 'sm' | 'md' | 'lg' }) {
  return <span className="inline-flex flex-wrap gap-1">{types.map((t) => <TypeBadge key={t} type={t} size={size} />)}</span>
}

export function VersionBadge({ form, long }: { form: Form; long?: boolean }) {
  if (form.ver === 'violet')
    return <span className="inline-flex items-center rounded-full bg-violet-sv px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">{long ? 'Violet only — not in Scarlet' : 'Violet only'}</span>
  if (form.ver === 'scarlet')
    return <span className="inline-flex items-center rounded-full bg-scarlet-600 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">Scarlet only</span>
  if (form.ver === 'coop')
    return <span className="inline-flex items-center rounded-full bg-violet-sv/70 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">Co-op only</span>
  return null
}

/** Poké Ball toggle for "caught". */
export function CaughtToggle({ species, size = 30 }: { species: string; size?: number }) {
  const caught = usePrefs((s) => s.caught.includes(species))
  const toggle = usePrefs((s) => s.toggleCaught)
  const [anim, setAnim] = useState(0)
  return (
    <button
      type="button"
      aria-pressed={caught}
      aria-label={caught ? 'Caught (tap to unmark)' : 'Mark as caught'}
      title={caught ? 'Caught' : 'Mark as caught'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(species); setAnim((n) => n + 1) }}
      className="grid shrink-0 place-items-center rounded-full p-1.5"
      style={{ width: size + 12, height: size + 12 }}
    >
      <Pokeball key={anim} size={size} on={caught} className={anim ? 'pop' : ''} />
    </button>
  )
}

export function Pokeball({ size = 24, on = true, className = '' }: { size?: number; on?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill={on ? '#fff' : 'none'} stroke={on ? '#1f1712' : 'currentColor'} strokeOpacity={on ? 1 : 0.35} strokeWidth="2" />
      {on && <path d="M1.5 16a14.5 14.5 0 0 1 29 0z" fill="#e8492a" stroke="#1f1712" strokeWidth="2" />}
      {!on && <path d="M1.5 16h29" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />}
      <circle cx="16" cy="16" r="4.5" fill={on ? '#fff' : 'var(--surface)'} stroke={on ? '#1f1712' : 'currentColor'} strokeOpacity={on ? 1 : 0.35} strokeWidth="2" />
    </svg>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={() => onChange(!on)}>
      {label}
    </button>
  )
}

export function ShinyButton() {
  const shiny = usePrefs((s) => s.shiny)
  const setShiny = usePrefs((s) => s.setShiny)
  return (
    <button
      type="button"
      onClick={() => setShiny(!shiny)}
      aria-pressed={shiny}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${shiny ? 'bg-amber-400 text-amber-950' : 'bg-white/15 text-white'}`}
    >
      <span className={shiny ? 'sparkle' : ''}>✨</span> Shiny
    </button>
  )
}

export function Img({ src, alt, className, size }: { src: string; alt: string; className?: string; size?: number }) {
  const [failedSrc, setFailedSrc] = useState('')
  if (failedSrc === src || !src) return <div className={`grid place-items-center opacity-30 ${className ?? ''}`} style={{ width: size, height: size }}><Pokeball size={(size ?? 48) / 2} on={false} /></div>
  return <img src={src} alt={alt} loading="lazy" decoding="async" width={size} height={size} className={className} onError={() => setFailedSrc(src)} />
}
