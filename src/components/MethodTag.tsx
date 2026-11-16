import type { Method, Via } from '../lib/hunt'

/** How a Paldea dex entry is obtained in Scarlet, shared by the Hunt tab and the Pokédex list. */
export const METHOD: Record<Method, { icon: string; label: string; pill: string }> = {
  catch: { icon: '🎯', label: 'Catch', pill: '' },
  evolve: { icon: '🧬', label: 'Evolve', pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  trade: { icon: '🔁', label: 'Trade', pill: 'bg-violet-sv/15 text-violet-sv' },
  special: { icon: '🎁', label: 'Gift & special', pill: 'bg-amber-500/15 text-amber-800 dark:text-amber-200' },
}

/** Short word for a non-catch entry: evolve / trade / gift / special. */
export const viaWord = (via: Via) => (via.kind === 'special' ? (via.gift ? 'gift' : 'special') : via.kind)

export function MethodTag({ via }: { via: Via }) {
  return <span className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold ${METHOD[via.kind].pill}`}>{viaWord(via)}</span>
}
