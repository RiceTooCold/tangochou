import { useMemo, useState } from 'react'
import { DEFAULT_LESSONS, LESSON_NUMBERS, wordsForLessons } from '../data/lessons'
import { STATUS_OPTIONS, useProgress } from '../hooks/useProgress'
import { formatAccent, hasDistinctReading } from '../lib/text'
import { AppBar, Badge, Chip, SegToggle, StatusDot } from './ui'
import type { BadgeVariant } from './ui'
import type { Word, WordStatus, ScopeFilter } from '../types'

const STATUS_BADGE: Record<WordStatus, [BadgeVariant, string]> = {
  known: ['known', '認識'],
  unknown: ['unknown', '不熟'],
  unseen: ['unseen', '未見'],
}

interface WordGroup {
  label: string
  words: Word[]
}

function groupWords(words: Word[], byLesson: boolean): WordGroup[] {
  const groups: WordGroup[] = []
  const index = new Map<string, WordGroup>()
  for (const w of words) {
    const label = byLesson ? `第${w.lesson}課` : w.section || '（未分類）'
    let g = index.get(label)
    if (!g) {
      g = { label, words: [] }
      index.set(label, g)
      groups.push(g)
    }
    g.words.push(w)
  }
  return groups
}

interface VocabListScreenProps {
  onBack: () => void
}

export default function VocabListScreen({ onBack }: VocabListScreenProps): React.ReactElement {
  const { map } = useProgress()
  const [lessons, setLessons] = useState<number[]>(DEFAULT_LESSONS)
  const [query, setQuery] = useState<string>('')
  const [status, setStatus] = useState<ScopeFilter>('all')
  const [focused, setFocused] = useState<boolean>(false)

  const base = useMemo(() => wordsForLessons(lessons), [lessons])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return base.filter((w) => {
      const s = map[w.id]?.status || 'unseen'
      if (status !== 'all' && s !== status) return false
      if (!q) return true
      return (
        w.word.toLowerCase().includes(q) ||
        (w.reading || '').toLowerCase().includes(q) ||
        (w.meaning || '').toLowerCase().includes(q)
      )
    })
  }, [base, map, query, status])

  const byLesson = lessons.length !== 1
  const groups = useMemo(() => groupWords(filtered, byLesson), [filtered, byLesson])

  const allOn = lessons.length === LESSON_NUMBERS.length

  function toggleLesson(n: number): void {
    setLessons((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b),
    )
  }

  const countLabel = allOn ? '全部' : lessons.length === 0 ? '未選課' : lessons.length === 1 ? `第${lessons[0]}課` : `${lessons.length} 課`

  return (
    <div className="flex h-full flex-col">
      <AppBar
        title="單字列表"
        onBack={onBack}
        right={<span className="text-[13px] text-gr4 tnum">{countLabel} · {base.length}</span>}
      />

      {/* search */}
      <div className="px-[18px] pb-3">
        <div
          className={`flex h-10 items-center gap-2.5 rounded-md border-[.5px] bg-wht px-3.5 transition-shadow ${
            focused ? 'border-blk shadow-[0_0_0_3px_var(--color-gr1)]' : 'border-gr2'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7d7b76" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="搜尋日文或中文…"
            className="w-full bg-transparent text-sm text-blk placeholder:text-gr4 focus:outline-none"
          />
        </div>
      </div>

      {/* lesson filter — multi-select pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-[18px] pb-2.5">
        {LESSON_NUMBERS.map((n) => (
          <Chip key={n} active={lessons.includes(n)} onClick={() => toggleLesson(n)}>{`第${n}課`}</Chip>
        ))}
      </div>

      {/* status filter — single-select segmented control */}
      <div className="px-[18px] pb-2">
        <SegToggle options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </div>

      {/* list */}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <p className="px-[22px] py-16 text-center text-sm text-gr4">
            {lessons.length === 0 ? '請先選擇課別' : '沒有符合的單字'}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <div className="flex items-center gap-2.5 px-5 pb-2 pt-4">
                <Badge variant="sec">{g.label}</Badge>
                <span className="text-[11px] text-gr4">{g.words.length} 個</span>
              </div>
              {g.words.map((w) => {
                const s: WordStatus = map[w.id]?.status || 'unseen'
                const [variant, text] = STATUS_BADGE[s]
                return (
                  <div key={w.id} className="flex items-center gap-3.5 border-b-[.5px] border-gr1 px-5 py-3">
                    <StatusDot status={s} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-serif text-[17px] font-medium text-blk">{w.word}</span>
                        <span className="text-xs text-gr4">
                          {hasDistinctReading(w) ? `${w.reading} ` : ''}
                          {formatAccent(w.accent)}
                        </span>
                      </div>
                      <span className="truncate text-[12.5px] text-gr6">{w.meaning}</span>
                    </div>
                    <span className="ml-auto pl-2">
                      <Badge variant={variant}>{text}</Badge>
                    </span>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
