import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { LESSON_NUMBERS } from '../data/lessons.js'

// localStorage: one key per lesson — jp-vocab-progress-lesson-{N}
const keyFor = (n) => `jp-vocab-progress-lesson-${n}`
const prefixFor = (n) => `l${n}-`

const ProgressContext = createContext(null)

function loadAll() {
  const map = {}
  for (const n of LESSON_NUMBERS) {
    try {
      const raw = localStorage.getItem(keyFor(n))
      if (!raw) continue
      const parsed = JSON.parse(raw)
      Object.assign(map, parsed.progress || {})
    } catch {
      /* ignore corrupt entry */
    }
  }
  return map
}

function persistLesson(n, fullMap) {
  const progress = {}
  const prefix = prefixFor(n)
  for (const [id, rec] of Object.entries(fullMap)) {
    if (id.startsWith(prefix)) progress[id] = rec
  }
  try {
    localStorage.setItem(keyFor(n), JSON.stringify({ progress }))
  } catch {
    /* storage full / unavailable — keep in-memory only */
  }
}

export function ProgressProvider({ children }) {
  const [map, setMap] = useState(loadAll)

  const setStatus = useCallback((word, status) => {
    setMap((prev) => {
      const existing = prev[word.id]
      const rec = {
        status,
        reviewCount: (existing?.reviewCount || 0) + 1,
        lastReviewed: new Date().toISOString(),
      }
      const next = { ...prev, [word.id]: rec }
      persistLesson(word.lesson, next)
      return next
    })
  }, [])

  const resetLesson = useCallback((n) => {
    setMap((prev) => {
      const next = {}
      const prefix = prefixFor(n)
      for (const [id, rec] of Object.entries(prev)) {
        if (!id.startsWith(prefix)) next[id] = rec
      }
      try {
        localStorage.removeItem(keyFor(n))
      } catch {
        /* noop */
      }
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    for (const n of LESSON_NUMBERS) {
      try {
        localStorage.removeItem(keyFor(n))
      } catch {
        /* noop */
      }
    }
    setMap({})
  }, [])

  const value = useMemo(
    () => ({ map, setStatus, resetLesson, resetAll }),
    [map, setStatus, resetLesson, resetAll],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within <ProgressProvider>')
  return ctx
}

/** Status of a single word id: "known" | "unknown" | "unseen". */
export function statusOf(map, id) {
  return map[id]?.status || 'unseen'
}

// Shared status axis used by the list filter and the practice-setup scope.
export const STATUS_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'known', label: '認識' },
  { id: 'unknown', label: '不熟' },
  { id: 'unseen', label: '未見' },
]

/** Filter words by a status scope: 'all' | 'known' | 'unknown' | 'unseen'. */
export function filterByScope(map, words, scope) {
  if (!scope || scope === 'all') return words
  return words.filter((w) => (map[w.id]?.status || 'unseen') === scope)
}

/** Tally known / unknown / unseen across a list of words. */
export function tally(map, words) {
  let known = 0
  let unknown = 0
  for (const w of words) {
    const s = map[w.id]?.status
    if (s === 'known') known += 1
    else if (s === 'unknown') unknown += 1
  }
  return { known, unknown, unseen: words.length - known - unknown, total: words.length }
}
