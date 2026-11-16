import type { ReactNode } from 'react'
import type { Db } from '../data/types'
import { DITTO_CODE, EVO_CODES, EXCLUSIVE_CODES, SOURCE, STARTER_CODES } from '../data/linkCodes'
import { CodeChip, MonLink } from '../components/LinkCodes'
import { DlcBadge } from '../components/ui'
import { usePrefs } from '../store/prefs'

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      {hint && <p className="-mt-1 mb-1.5 text-xs muted">{hint}</p>}
      <ul className="card divide-y text-sm" style={{ borderColor: 'var(--ring)' }}>{children}</ul>
    </section>
  )
}

const Row = ({ children }: { children: ReactNode }) => (
  <li className="flex items-center gap-2 px-3 py-2" style={{ borderColor: 'var(--ring)' }}>{children}</li>
)

export default function TradesPage({ db }: { db: Db }) {
  const dlc = usePrefs((p) => p.dlc)
  const caught = usePrefs((p) => p.caught)
  const have = (s: string) => caught.includes(s)
  const exclusive = EXCLUSIVE_CODES.filter((e) => dlc || !e.dlc)
  const evo = EVO_CODES.filter((e) => dlc || !e.dlc)
  const hidden = EXCLUSIVE_CODES.length - exclusive.length + EVO_CODES.length - evo.length

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">🔁 Link trade codes</h1>
        <p className="mt-1 text-sm">
          Community codes for finding a trade partner. In the game: <b>Poké Portal → Link Trade → Set Link Code</b>, enter the 8 digits, and offer the Pokémon on your side. Tap a code to copy it.
        </p>
        {!dlc && hidden > 0 && <p className="mt-1 text-xs muted">{hidden} DLC codes are hidden. Turn on “I have the DLC” in Settings to see them.</p>}
      </div>

      <Section title="Version exclusives" hint="You offer the Scarlet Pokémon and get the Violet one back.">
        <li className="grid grid-cols-[7rem_1fr_1fr] gap-2 px-3 py-1.5 text-[10px] font-bold uppercase muted" style={{ borderColor: 'var(--ring)' }}>
          <span>Code</span><span className="text-scarlet-600">You offer</span><span className="text-violet-sv">You get</span>
        </li>
        {exclusive.map((e) => (
          <li key={e.code} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2 px-3 py-2" style={{ borderColor: 'var(--ring)' }}>
            <span><CodeChip code={e.code} size="sm" /></span>
            <span><MonLink db={db} mon={e.scarlet} />{have(e.scarlet.s) && <span className="text-emerald-600 dark:text-emerald-400" title="You’ve caught one"> ✓</span>}{e.dlc ? <> <DlcBadge title={`DLC Part ${e.dlc}`} /></> : null}</span>
            <span><MonLink db={db} mon={e.violet} />{have(e.violet.s) && <span className="muted" title="Already caught"> ✓</span>}</span>
          </li>
        ))}
      </Section>

      <Section title="Trade evolutions" hint="Mirror trades: both players offer the same Pokémon (check the held item) and keep the evolved one. Not tradebacks!">
        {evo.map((e) => (
          <Row key={e.code + e.from.label}>
            <CodeChip code={e.code} size="sm" />
            <span className="min-w-0 flex-1">
              <MonLink db={db} mon={e.from} /> → <MonLink db={db} mon={e.into} />
              {e.dlc ? <> <DlcBadge title={`DLC Part ${e.dlc}`} /></> : null}
              <span className="block text-xs muted">{e.item ? `Holding ${e.item}` : 'No item'}{e.pla ? ' · also evolves in Legends: Arceus without trading' : ''}</span>
            </span>
          </Row>
        ))}
      </Section>

      <Section title="Starters" hint="You can breed more of your starter to trade. Pokémon HOME also gives free starter sets for connecting other games.">
        {STARTER_CODES.map((e) => (
          <Row key={e.code}>
            <CodeChip code={e.code} size="sm" />
            <span className="min-w-0 flex-1">
              <MonLink db={db} mon={e.a} /> ↔ <MonLink db={db} mon={e.b} />
              {e.note && <span className="block text-xs muted">{e.note}</span>}
            </span>
          </Row>
        ))}
      </Section>

      <Section title="Foreign Ditto" hint="For the Masuda method. Check the Ditto’s language before trading.">
        <Row><CodeChip code={DITTO_CODE} size="sm" /><span><MonLink db={db} mon="ditto" /> from another language</span></Row>
      </Section>

      <p className="text-[11px] muted">Codes from the <a href={SOURCE.url} target="_blank" rel="noreferrer" className="underline">{SOURCE.name}</a>. Nothing guarantees the other player sends what the code says.</p>
    </div>
  )
}
