import { useEffect, useState } from 'react'
import { listPasskeys, passkeySupported, registerPasskey, signIn, signInWithPasskey, signOut, syncEnabled, useSession, useSyncStatus, verifyCode, type PasskeyInfo } from '../lib/sync'
import { usePrefs } from '../store/prefs'
import { BackupPanel } from '../components/BackupPanel'

const PENDING = 'scarlet-pending-email'
const read = (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* private mode */ } }

export default function SettingsPage() {
  const session = useSession()
  const sync = useSyncStatus()
  const caught = usePrefs((s) => s.caught.length)
  const team = usePrefs((s) => s.team.length)
  const [email, setEmail] = useState(() => read(PENDING))
  const [sent, setSent] = useState(() => !!read(PENDING))
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async (f: () => Promise<void>, ok: string, fail: string) => {
    setBusy(true); setMsg('')
    try { await f(); setMsg(ok) } catch (e) { setMsg(`${fail}: ${(e as Error).message}`) } finally { setBusy(false) }
  }
  const passkeyLogin = () => run(signInWithPasskey, 'Signed in.', 'Passkey sign-in failed. Use the email option below instead')
  const sendCode = () => run(async () => { await signIn(email); write(PENDING, email); setSent(true) }, '', 'Could not send the email')
  const verify = () => run(async () => { await verifyCode(email, code); write(PENDING, null); setSent(false); setCode('') }, 'Signed in.', 'Not accepted (links and codes work once and expire — send a new one if needed)')

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold">Settings</h1>

      <DlcSetting />

      <section className="card p-3">
        <h2 className="font-display text-base font-bold">☁️ Cloud sync</h2>
        <p className="mt-0.5 text-xs muted">Sign in to keep your caught list, team and shiny settings in sync on every device. Same account as FireRed Companion and Quit — your passkey from those works here.</p>

        {!syncEnabled && <p className="mt-2 text-sm muted">Sync isn’t configured in this build. Everything stays on this device; use Backup below to move it.</p>}

        {syncEnabled && session && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Signed in as <b>{session.user.email}</b></span>
              <SyncChip status={sync.status} />
              <button className="btn-ghost ml-auto px-2 py-1 text-xs" onClick={() => void signOut()}>Sign out</button>
            </div>
            {sync.msg && <p className="text-xs text-red-600">{sync.msg}</p>}
            <p className="text-xs muted">{caught} caught · {team} on the team. Changes upload a couple of seconds after you make them; other devices pick them up when you open the app. Devices are merged, so nothing marked on one is lost.</p>
            <PasskeyManager />
          </div>
        )}

        {syncEnabled && !session && !sent && (
          <div className="mt-3 space-y-3">
            {passkeySupported && (
              <div>
                <button className="btn-primary w-full py-2.5 text-base" onClick={() => void passkeyLogin()} disabled={busy}>🔐 {busy ? 'Waiting for device…' : 'Sign in with passkey'}</button>
                <p className="mt-1 text-center text-xs muted">Face ID, Touch ID or Windows Hello.</p>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void sendCode() }} className="space-y-1">
              <p className="text-xs muted">No passkey on this device? Get a sign-in email:</p>
              <div className="flex gap-2">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" autoComplete="email" />
                <button className="btn-ghost shrink-0" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
              </div>
            </form>
          </div>
        )}

        {syncEnabled && !session && sent && (
          <form onSubmit={(e) => { e.preventDefault(); void verify() }} className="mt-3 space-y-2">
            <p className="text-sm">Email sent to <b>{email}</b>.</p>
            <ul className="list-disc space-y-0.5 pl-5 text-xs muted">
              <li><b>Home-screen app:</b> in the email, long-press the “Log In” link → <b>Copy Link</b>, then paste it here (tapping it would open Safari instead).</li>
              <li><b>Computer:</b> click the link, or paste it here.</li>
              <li>A numeric code from the email works too.</li>
            </ul>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" placeholder="Paste the link or code" className="input font-mono text-sm" autoFocus />
              <button className="btn-primary shrink-0" disabled={busy || code.trim().length < 6}>{busy ? 'Checking…' : 'Sign in'}</button>
            </div>
            <div className="flex gap-3 text-xs">
              <button type="button" className="font-semibold text-scarlet-600" onClick={() => void sendCode()} disabled={busy}>Resend</button>
              <button type="button" className="font-semibold text-scarlet-600" onClick={() => { setSent(false); setCode(''); write(PENDING, null) }}>Use a different email</button>
            </div>
          </form>
        )}
        {msg && <p role="status" className="mt-2 text-xs">{msg}</p>}
      </section>

      <BackupPanel />

      <section className="card p-3 text-xs muted">
        <div>App built {__BUILD_TIME__} · {window.matchMedia('(display-mode: standalone)').matches ? 'installed app' : 'browser tab'}</div>
        <button className="btn-ghost mt-2 text-xs" onClick={async () => { try { const regs = await navigator.serviceWorker?.getRegistrations(); for (const r of regs ?? []) await r.update() } catch { /* ignore */ } window.location.reload() }}>Check for update &amp; reload</button>
      </section>
    </div>
  )
}

export function SyncChip({ status }: { status: string }) {
  const cls = status === 'synced' ? 'bg-emerald-600 text-white' : status === 'error' ? 'bg-red-600 text-white' : status === 'syncing' ? 'bg-amber-400 text-amber-950' : ''
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`} style={cls ? undefined : { background: 'var(--surface-2)' }}>{status === 'synced' ? '✓ synced' : status}</span>
}

function PasskeyManager() {
  const [keys, setKeys] = useState<PasskeyInfo[] | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = () => listPasskeys().then(setKeys).catch((e) => setMsg((e as Error).message))
  useEffect(() => { void refresh() }, [])
  const add = async () => {
    setBusy(true); setMsg('')
    try { await registerPasskey(); setMsg('Passkey added.'); await refresh() } catch (e) { setMsg('Could not add a passkey: ' + (e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="rounded-xl p-2.5 text-sm" style={{ background: 'var(--surface-2)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">🔐 Passkeys</span>
        <span className="text-xs muted">{keys ? `${keys.length} on this account` : ''}</span>
        {passkeySupported && <button className="btn-ghost ml-auto px-2 py-1 text-xs" onClick={() => void add()} disabled={busy}>{busy ? 'Waiting…' : '+ Add on this device'}</button>}
      </div>
      {keys && keys.length > 0 && <p className="mt-1 text-xs muted">You already have a passkey (shared with FireRed and Quit), so next time just tap “Sign in with passkey”. Only add another if this device can’t see it.</p>}
      {msg && <p className="mt-1 text-xs">{msg}</p>}
    </div>
  )
}

function DlcSetting() {
  const dlc = usePrefs((s) => s.dlc)
  const setDlc = usePrefs((s) => s.setDlc)
  return (
    <section className="card p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-bold">🎮 I have the DLC</span>
          <span className="mt-0.5 block text-xs muted">
            The Hidden Treasure of Area Zero: The Teal Mask (Kitakami) and The Indigo Disk (Blueberry Academy).
            {dlc
              ? ' Showing all three Pokédexes, DLC Pokémon in Beat a type, and DLC spawn spots.'
              : ' Off: only the Paldea Pokédex is shown, Beat a type only suggests Pokémon you can catch in the base game, and DLC Pokémon are marked with a DLC tag.'}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={dlc}
          onChange={(e) => setDlc(e.target.checked)}
        />
        <span aria-hidden className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${dlc ? 'bg-teal-600' : 'bg-stone-400/50'} peer-focus-visible:ring-2 peer-focus-visible:ring-scarlet-500`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${dlc ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </span>
      </label>
    </section>
  )
}
