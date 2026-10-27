import { useRef, useState } from 'react'
import { backupJson, usePrefs } from '../store/prefs'
import { useSession } from '../lib/sync'

/** Export / import the caught list and team as a JSON file (storage on iPhone home-screen apps can be cleared). */
export function BackupPanel() {
  const importBackup = usePrefs((s) => s.importBackup)
  const session = useSession()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const exportFile = async () => {
    const json = backupJson()
    const name = `scarlet-pokedex-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([json], { type: 'application/json' })
    const f = new File([blob], name, { type: 'application/json' })
    // iOS: the share sheet lets you save to Files; elsewhere fall back to a download
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], title: 'Scarlet Pokédex backup' }); setMsg('Backup shared.'); return } catch { /* cancelled: fall through */ }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Backup downloaded.')
  }

  const importFile = async (f: File | undefined) => {
    if (!f) return
    try {
      importBackup(JSON.parse(await f.text()))
      setMsg('Backup restored.')
    } catch (e) {
      setMsg(`Couldn’t restore: ${(e as Error).message}`)
    }
    if (file.current) file.current.value = ''
  }

  return (
    <section className="card p-3">
      <h2 className="font-display text-base font-bold">Backup</h2>
      <p className="mt-0.5 text-xs muted">
        {session
          ? 'Your caught list and team are synced to your account. A file backup is optional — handy before big changes.'
          : 'Your caught list and team are saved on this device only. Sign in above, or export a backup now and then — iPhone can clear website storage for home-screen apps.'}
      </p>
      <div className="mt-2 flex gap-2">
        <button className="btn-ghost flex-1" onClick={exportFile}>⬇️ Export backup</button>
        <button className="btn-ghost flex-1" onClick={() => file.current?.click()}>⬆️ Import backup</button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} data-testid="backup-input" />
      </div>
      {msg && <p role="status" className="mt-2 text-xs">{msg}</p>}
    </section>
  )
}
