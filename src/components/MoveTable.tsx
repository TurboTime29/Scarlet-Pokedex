import { useState } from 'react'
import type { Db, Form } from '../data/types'
import { TypeBadge } from './ui'

const CAT: Record<string, { label: string; cls: string }> = {
  ph: { label: 'Phys', cls: 'bg-orange-500/15 text-orange-600' },
  sp: { label: 'Spec', cls: 'bg-sky-500/15 text-sky-600' },
  st: { label: 'Status', cls: 'bg-stone-500/15 muted' },
}

type Tab = 'lv' | 'tm' | 'egg'

export function MoveTable({ db, form }: { db: Db; form: Form }) {
  const [tab, setTab] = useState<Tab>('lv')
  const [open, setOpen] = useState<number | null>(null)
  const rows: [string, number][] =
    tab === 'lv' ? form.lv.map(([l, m]) => [l === 0 ? 'Evo' : l === 1 ? '1' : String(l), m])
      : (tab === 'tm' ? form.tm : form.egg).map((m) => ['', m] as [string, number])
        .sort((a, b) => db.moves[a[1]].n.localeCompare(db.moves[b[1]].n))
  const stab = new Set(form.types)
  return (
    <div>
      <div className="seg mb-2" role="tablist">
        <button role="tab" aria-selected={tab === 'lv'} onClick={() => setTab('lv')}>Level up ({form.lv.length})</button>
        <button role="tab" aria-selected={tab === 'tm'} onClick={() => setTab('tm')}>TMs ({form.tm.length})</button>
        {form.egg.length > 0 && <button role="tab" aria-selected={tab === 'egg'} onClick={() => setTab('egg')}>Egg ({form.egg.length})</button>}
      </div>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2.25rem_1fr_3.75rem_2.6rem_2rem_2.2rem] items-center gap-x-1.5 px-2 py-1.5 text-[10px] font-bold uppercase muted" style={{ background: 'var(--surface-2)' }}>
          <span>{tab === 'lv' ? 'Lv' : ''}</span><span>Move</span><span>Type</span><span>Cat</span><span className="text-right">Pow</span><span className="text-right">Acc</span>
        </div>
        {rows.map(([lv, i], k) => {
          const m = db.moves[i]
          const isOpen = open === k
          return (
            <button key={k} type="button" onClick={() => setOpen(isOpen ? null : k)} className="block w-full border-t text-left text-sm active:bg-black/5" style={{ borderColor: 'var(--ring)' }}>
              <span className="grid grid-cols-[2.25rem_1fr_3.75rem_2.6rem_2rem_2.2rem] items-center gap-x-1.5 px-2 py-1.5">
                <span className="font-mono text-xs font-bold tabular-nums muted">{lv}</span>
                <span className={`truncate ${stab.has(m.t) && m.c !== 'st' ? 'font-bold' : 'font-medium'}`}>{m.n}</span>
                <TypeBadge type={m.t} size="sm" />
                <span className={`rounded px-1 py-0.5 text-center text-[9px] font-bold ${CAT[m.c].cls}`}>{CAT[m.c].label}</span>
                <span className="text-right tabular-nums">{m.p ?? '—'}</span>
                <span className="text-right tabular-nums muted">{m.a ?? '—'}</span>
              </span>
              {isOpen && <span className="block px-2 pb-2 pl-[2.9rem] text-xs muted">{m.e} <span className="whitespace-nowrap">· PP {m.pp}</span></span>}
            </button>
          )
        })}
        {!rows.length && <p className="p-3 text-sm muted">None.</p>}
      </div>
      <p className="mt-1.5 text-[11px] muted">Bold = same type as this Pokémon (1.5× damage bonus). “Evo” = learned when it evolves. Tap a move for details.</p>
    </div>
  )
}
