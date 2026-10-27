import { Link } from 'react-router-dom'
import { mainForm, thumb } from '../data/db'
import type { Db, EvoNode, Form } from '../data/types'
import { Img, Types } from './ui'

interface Stage { node: EvoNode; parent?: string }

function stages(root: EvoNode): Stage[][] {
  const out: Stage[][] = []
  let level: Stage[] = [{ node: root }]
  while (level.length) {
    out.push(level)
    level = level.flatMap((st) => (st.node.to ?? []).map((node) => ({ node, parent: st.node.s })))
  }
  return out
}

/** Evolution line as columns of stages; every Pokémon in the game is tappable. */
export function EvolutionLine({ db, chain, current, currentForm, shiny }: { db: Db; chain: number; current: string; currentForm: Form; shiny: boolean }) {
  const root = db.evolutions[chain]
  if (!root || !root.to?.length) return <p className="text-sm muted">Does not evolve.</p>
  const cols = stages(root)
  if (cols.some((c) => c.length > 2)) {
    // wide branches (Eevee, Tyrogue) read better as stacked rows of a grid than as one very tall column
    return (
      <div className="space-y-1.5">
        {cols.map((col, i) => (
          <div key={i}>
            {i > 0 && <div className="text-center text-lg leading-none muted">⌄</div>}
            <div className={col.length > 1 ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'flex justify-center'}>
              {col.map(({ node, parent }) => (
                <EvoCard key={node.s + parent} db={db} node={node} parent={parent} current={current} currentForm={currentForm} shiny={shiny} wide={col.length > 1} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <div className="flex items-stretch gap-1">
        {cols.map((col, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-lg muted">›</span>}
            <div className="flex flex-col gap-2">
              {col.map(({ node, parent }) => (
                <EvoCard key={node.s + parent} db={db} node={node} parent={parent} current={current} currentForm={currentForm} shiny={shiny} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EvoCard({ db, node, current, currentForm, shiny, wide }: {
  db: Db; node: EvoNode; parent?: string; current: string; currentForm: Form; shiny: boolean; wide?: boolean
}) {
  const s = db.bySlug.get(node.s)
  const isCurrent = node.s === current
  const how = node.how && (
    <span className="block text-[10px] leading-tight muted">{node.how}</span>
  )
  if (!s || node.x) {
    return (
      <div className={`${wide ? 'w-full' : 'w-[9.5rem]'} rounded-xl border border-dashed p-2 text-center opacity-60`} style={{ borderColor: 'var(--ring)' }}>
        {how}
        <div className="mt-1 text-sm font-semibold capitalize">{node.s.replace(/-/g, ' ')}</div>
        <div className="text-[10px] muted">Not in Scarlet/Violet</div>
      </div>
    )
  }
  const f = isCurrent ? currentForm : mainForm(s)
  return (
    <Link
      to={`/p/${s.slug}`}
      className={`flex ${wide ? 'w-full' : 'w-[9.5rem]'} items-center gap-1.5 rounded-xl p-1.5 transition-transform active:scale-95 ${isCurrent ? 'ring-2 ring-scarlet-500' : ''}`}
      style={{ background: 'var(--surface-2)' }}
      aria-current={isCurrent ? 'page' : undefined}
    >
      <Img src={thumb(f, shiny)} alt="" size={48} className="h-12 w-12 shrink-0 object-contain" />
      <span className="min-w-0">
        {how}
        <span className="block truncate text-sm font-semibold">{s.name}</span>
        <Types types={f.types} size="sm" />
      </span>
    </Link>
  )
}
