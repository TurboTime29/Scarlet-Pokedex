import { Link } from 'react-router-dom'
import { formLabel, pad, thumb } from '../data/db'
import type { Db } from '../data/types'
import { summarizeTeam } from '../lib/team'
import { TYPES, type Type } from '../lib/types'
import { TEAM_SIZE, usePrefs } from '../store/prefs'
import { Img, TypeBadge, Types, VersionBadge } from '../components/ui'

export default function TeamPage({ db }: { db: Db }) {
  const { team, caught, shiny, toggleTeam, moveTeam } = usePrefs()
  const members = team.map((slug) => db.formBySlug.get(slug)).filter((m): m is NonNullable<typeof m> => !!m)
  const summary = summarizeTeam(members.map((m) => m.form.types))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">My Team</h1>
        <p className="text-sm muted">{members.length}/{TEAM_SIZE} on the team · {caught.length} Pokémon marked caught</p>
      </div>

      {!members.length ? (
        <div className="card p-6 text-center text-sm muted">
          No team yet. Open any Pokémon and tap <b>☆ Add to team</b>. Mark Pokémon as caught with the Poké Ball on each dex row.
          <div className="mt-3"><Link to="/" className="btn-primary">Browse the dex</Link></div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {members.map(({ species: s, form: f }, i) => (
            <li key={f.slug} className="card relative p-2">
              <Link to={`/p/${s.slug}${f.default ? '' : `/${f.slug}`}`} className="flex flex-col items-center text-center">
                <Img src={thumb(f, shiny)} alt="" size={80} className="h-20 w-20 object-contain" />
                <span className="mt-1 font-semibold leading-tight">{s.name}</span>
                {!f.default && f.label && <span className="text-[10px] muted">{formLabel(f)}</span>}
                <span className="mt-1"><Types types={f.types} size="sm" /></span>
                <span className="mt-1"><VersionBadge form={f} /></span>
              </Link>
              <div className="mt-2 flex justify-center gap-1 text-xs">
                <button className="btn-ghost px-2 py-1" disabled={i === 0} aria-label="Move left" onClick={() => moveTeam(f.slug, -1)}>‹</button>
                <button className="btn-ghost px-2 py-1" aria-label={`Remove ${s.name}`} onClick={() => toggleTeam(f.slug, s.slug)}>Remove</button>
                <button className="btn-ghost px-2 py-1" disabled={i === members.length - 1} aria-label="Move right" onClick={() => moveTeam(f.slug, 1)}>›</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {members.length > 0 && (
        <>
          <section className="card p-3">
            <h2 className="font-display text-base font-bold">Team weaknesses</h2>
            {summary.threats.length ? (
              <p className="mt-1 text-sm">
                ⚠️ Watch out for{' '}
                {summary.threats.map((t, i) => (
                  <span key={t}>{i > 0 && ', '}<b>{t[0].toUpperCase() + t.slice(1)}</b> ({summary.weak[t]} weak, nobody resists)</span>
                ))}.
              </p>
            ) : <p className="mt-1 text-sm">✅ No type hits two or more of your team without someone resisting it.</p>}
            <div className="mt-3 grid grid-cols-[4.4rem_1fr_1fr] gap-x-2 gap-y-1 text-xs">
              <span className="font-bold muted">Attack</span><span className="font-bold muted">Weak</span><span className="font-bold muted">Resist / immune</span>
              {TYPES.map((t) => (
                <TypeRow key={t} t={t} weak={summary.weak[t]} resist={summary.resist[t]} />
              ))}
            </div>
          </section>

          <section className="card p-3">
            <h2 className="font-display text-base font-bold">Coverage gaps</h2>
            {summary.gaps.length ? (
              <>
                <p className="mt-1 text-sm">Nobody’s own type hits these super-effectively. A Pokémon (or a TM move) of a type that beats them would help:</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {summary.gaps.map((t) => <Link key={t} to={`/counters?t=${t}`}><TypeBadge type={t} /></Link>)}
                </div>
                <p className="mt-1 text-[11px] muted">Tap a type to find Pokémon that beat it.</p>
              </>
            ) : <p className="mt-1 text-sm">✅ Your team’s types can hit every type super-effectively.</p>}
          </section>
        </>
      )}

      {caught.length > 0 && (
        <section>
          <h2 className="section-title">Caught ({caught.length})</h2>
          <div className="flex flex-wrap gap-1">
            {caught.map((slug) => db.bySlug.get(slug)).filter(Boolean).sort((a, b) => (a!.dex.paldea ?? 999 + a!.id) - (b!.dex.paldea ?? 999 + b!.id)).map((s) => (
              <Link key={s!.slug} to={`/p/${s!.slug}`} className="chip" title={s!.dex.paldea ? `Paldea #${pad(s!.dex.paldea)}` : undefined}>{s!.name}</Link>
            ))}
          </div>
        </section>
      )}

      <Link to="/settings" className="card flex items-center gap-2 p-3 text-sm">
        <span className="text-lg">☁️</span>
        <span className="flex-1"><b>Sync &amp; backup</b><span className="block text-xs muted">Sign in to keep your caught list and team on all your devices.</span></span>
        <span className="muted">›</span>
      </Link>
    </div>
  )
}

function TypeRow({ t, weak, resist }: { t: Type; weak: number; resist: number }) {
  return (
    <>
      <span><TypeBadge type={t} size="sm" /></span>
      <span className="flex items-center gap-0.5">{Array.from({ length: weak }, (_, i) => <span key={i} className={`h-3 w-3 rounded-sm ${resist ? 'bg-orange-400' : 'bg-red-500'}`} />)}{!weak && <span className="muted">–</span>}</span>
      <span className="flex items-center gap-0.5">{Array.from({ length: resist }, (_, i) => <span key={i} className="h-3 w-3 rounded-sm bg-emerald-500" />)}{!resist && <span className="muted">–</span>}</span>
    </>
  )
}
