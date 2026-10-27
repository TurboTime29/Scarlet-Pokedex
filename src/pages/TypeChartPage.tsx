import { TYPES, TYPE_COLORS, effectiveness, typeName } from '../lib/types'

const cell = (m: number) => (m === 2 ? { t: '2', c: 'bg-emerald-500 text-white' } : m === 0.5 ? { t: '½', c: 'bg-red-400/80 text-white' } : m === 0 ? { t: '0', c: 'bg-stone-800 text-white' } : { t: '', c: '' })

export default function TypeChartPage() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Type chart</h1>
        <p className="text-sm muted">Rows = attacking move type. Columns = defending Pokémon type. Dual types multiply (2 × 2 = 4×).</p>
      </div>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
        <table className="border-separate border-spacing-0.5 text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10" style={{ background: 'var(--bg)' }}><span className="muted">ATK ↓ DEF →</span></th>
              {TYPES.map((d) => (
                <th key={d} className="h-14 w-6 align-bottom">
                  <span className="type-badge inline-block rounded px-0.5 py-1 text-[9px] [writing-mode:vertical-rl]" style={{ background: TYPE_COLORS[d] }}>{typeName(d).slice(0, 3)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPES.map((a) => (
              <tr key={a}>
                <th className="sticky left-0 z-10 pr-1 text-right" style={{ background: 'var(--bg)' }}>
                  <span className="type-badge inline-block w-16 rounded py-0.5 text-[9px]" style={{ background: TYPE_COLORS[a] }}>{typeName(a)}</span>
                </th>
                {TYPES.map((d) => {
                  const c = cell(effectiveness(a, [d]))
                  return <td key={d} className={`h-6 w-6 rounded text-center font-bold ${c.c}`} style={c.c ? undefined : { background: 'var(--surface-2)' }}>{c.t}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> 2× super effective</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-400/80" /> ½× not very effective</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-stone-800" /> 0× no effect</span>
      </div>
    </div>
  )
}
