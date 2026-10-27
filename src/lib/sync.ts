import { useEffect, useRef, useState } from 'react'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { exportProgress, isEmptyProgress, mergeProgress, usePrefs, type ProgressDoc } from '../store/prefs'

// Same Supabase project (and therefore the same accounts and passkeys) as FireRed Companion and Quit.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
// Accept a pasted REST/dashboard URL and reduce it to the project origin.
const url = rawUrl ? (() => { try { return new URL(rawUrl).origin } catch { return undefined } })() : undefined
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
const TABLE = 'scarlet_progress'

export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { experimental: { passkey: true } } }) : null
export const syncEnabled = !!supabase

type Status = 'disabled' | 'signed-out' | 'syncing' | 'synced' | 'error'
const listeners = new Set<(s: Status, msg?: string) => void>()
let status: Status = syncEnabled ? 'signed-out' : 'disabled'
let statusMsg = ''
function setStatus(s: Status, msg = '') { status = s; statusMsg = msg; listeners.forEach((l) => l(s, msg)) }

export function useSyncStatus() {
  const [s, setS] = useState<{ status: Status; msg: string }>({ status, msg: statusMsg })
  useEffect(() => { const l = (st: Status, m?: string) => setS({ status: st, msg: m ?? '' }); listeners.add(l); return () => { listeners.delete(l) } }, [])
  return s
}

/** Sends the sign-in email (magic link, plus a one-time code if the template includes {{ .Token }}). */
export async function signIn(email: string) {
  if (!supabase) throw new Error('sync disabled')
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
  if (error) throw error
}

/** True when this browser can do WebAuthn (Face ID / Touch ID / Windows Hello / security key). */
export const passkeySupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials

/** Face ID / Touch ID sign-in. Passkeys belong to turbotime29.github.io, so one made in FireRed or Quit works here. */
export async function signInWithPasskey() {
  if (!supabase) throw new Error('sync disabled')
  const { error } = await supabase.auth.signInWithPasskey()
  if (error) throw error
}

export async function registerPasskey() {
  if (!supabase) throw new Error('sync disabled')
  const { error } = await supabase.auth.registerPasskey()
  if (error) throw error
}

export interface PasskeyInfo { id: string; name?: string; createdAt: string; lastUsedAt?: string }
export async function listPasskeys(): Promise<PasskeyInfo[]> {
  if (!supabase) return []
  const { data, error } = await supabase.auth.passkey.list()
  if (error) throw error
  return (data ?? []).map((k) => ({ id: k.id, name: k.friendly_name, createdAt: k.created_at, lastUsedAt: k.last_used_at }))
}

/**
 * Completes sign-in from what the user pastes out of the email: a one-time code or the magic link itself
 * (its token_hash is verified in-app, so a home-screen app never has to open Safari).
 */
export async function verifyCode(email: string, input: string) {
  if (!supabase) throw new Error('sync disabled')
  const raw = input.trim()
  if (/^https?:\/\//i.test(raw)) {
    const u = new URL(raw)
    const hash = new URLSearchParams(u.hash.replace(/^#/, ''))
    const tokenHash = u.searchParams.get('token')
    if (tokenHash) {
      const t = (u.searchParams.get('type') || 'magiclink') as 'magiclink' | 'email' | 'signup' | 'recovery'
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: t })
      if (error) throw error
      return
    }
    if (hash.get('access_token') && hash.get('refresh_token')) {
      const { error } = await supabase.auth.setSession({ access_token: hash.get('access_token')!, refresh_token: hash.get('refresh_token')! })
      if (error) throw error
      return
    }
    if (u.searchParams.get('code')) throw new Error('that is the page Safari landed on, not the link from the email. Long-press the link inside the email and choose Copy Link')
    throw new Error('no sign-in token in that link')
  }
  const { error } = await supabase.auth.verifyOtp({ email, token: raw.replace(/\s+/g, ''), type: 'email' })
  if (error) throw error
}
export async function signOut() { await supabase?.auth.signOut() }

async function pull(userId: string): Promise<ProgressDoc | null> {
  const { data, error } = await supabase!.from(TABLE).select('doc').eq('user_id', userId).maybeSingle()
  if (error) throw error
  const doc = data?.doc as ProgressDoc | undefined
  return doc?.version === 2 ? doc : null
}
async function push(userId: string, doc: ProgressDoc) {
  const { error } = await supabase!.from(TABLE).upsert({ user_id: userId, doc, updated_at: new Date(doc.updatedAt || Date.now()).toISOString() })
  if (error) throw error
}

const friendly = (e: unknown) => {
  const m = (e as Error).message ?? String(e)
  return /relation .*scarlet_progress|does not exist|schema cache/i.test(m) ? 'cloud table not set up yet (run supabase/schema.sql)' : m
}

/** Mount once: pulls the cloud copy, merges it with this device, and pushes local changes (debounced). */
export function useSync() {
  const session = useSession()
  const lastPushed = useRef(0)
  useEffect(() => {
    if (!supabase || !session) { if (syncEnabled) setStatus('signed-out'); return }
    const userId = session.user.id
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    ;(async () => {
      try {
        setStatus('syncing')
        const remote = await pull(userId)
        const local = exportProgress(usePrefs.getState())
        if (remote && isEmptyProgress(local)) {
          lastPushed.current = remote.updatedAt
          usePrefs.getState().replaceProgress(remote) // fresh device: take the cloud copy
        } else if (remote) {
          const merged = mergeProgress(local, remote)
          lastPushed.current = merged.updatedAt
          if (JSON.stringify(merged) !== JSON.stringify(local)) usePrefs.getState().replaceProgress(merged)
          if (JSON.stringify(merged) !== JSON.stringify(remote)) await push(userId, merged)
        } else if (!isEmptyProgress(local)) {
          await push(userId, local)
          lastPushed.current = local.updatedAt
        }
        if (!cancelled) setStatus('synced')
      } catch (e) {
        setStatus('error', friendly(e))
      }
    })()
    const unsub = usePrefs.subscribe((s) => {
      if (s.updatedAt === lastPushed.current) return
      clearTimeout(timer)
      timer = setTimeout(async () => {
        try {
          setStatus('syncing')
          const doc = exportProgress(usePrefs.getState())
          if (isEmptyProgress(doc)) { setStatus('synced'); return } // never push a blank document over the cloud copy
          // merge with the cloud first so a change made on another device meanwhile isn't overwritten
          const remote = await pull(userId)
          const merged = remote ? mergeProgress(doc, remote) : doc
          lastPushed.current = merged.updatedAt
          if (JSON.stringify(merged) !== JSON.stringify(doc)) usePrefs.getState().replaceProgress(merged)
          await push(userId, merged)
          setStatus('synced')
        } catch (e) {
          setStatus('error', friendly(e))
        }
      }, 1500)
    })
    // pick up changes from other devices when the app comes back to the foreground
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const remote = await pull(userId)
        if (!remote) return
        const local = exportProgress(usePrefs.getState())
        const merged = mergeProgress(local, remote)
        if (JSON.stringify(merged) !== JSON.stringify(local)) { lastPushed.current = merged.updatedAt; usePrefs.getState().replaceProgress(merged) }
      } catch { /* offline: try again next time */ }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; clearTimeout(timer); unsub(); document.removeEventListener('visibilitychange', onVisible) }
  }, [session])
  return session
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  return session
}
