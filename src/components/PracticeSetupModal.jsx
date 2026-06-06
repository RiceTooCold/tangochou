import { useMemo, useState } from 'react'
import { LESSON_NUMBERS, wordsForLessons } from '../data/lessons.js'
import { STATUS_OPTIONS, filterByScope, useProgress } from '../hooks/useProgress.jsx'
import { Button, Chip, SegToggle } from './ui.jsx'

const MODE_TITLE = { flashcard: '閃卡', quiz: '選擇題', typing: '默寫' }

const COUNT_OPTIONS = [
  { id: 10, label: '10' },
  { id: 20, label: '20' },
  { id: 30, label: '30' },
  { id: 'all', label: '全部' },
]

export default function PracticeSetupModal({ mode, initial, onStart, onClose }) {
  const { map } = useProgress()
  const [lessons, setLessons] = useState(initial?.lessons ?? LESSON_NUMBERS)
  const [scope, setScope] = useState(initial?.scope ?? 'all')
  const [qCount, setQCount] = useState(initial?.count ?? 20)
  const [timed, setTimed] = useState(initial?.timed ?? true)

  const words = useMemo(() => wordsForLessons(lessons), [lessons])
  const available = filterByScope(map, words, scope).length

  // flashcard runs the whole deck; quiz/typing run a fixed number of questions
  const hasRound = mode !== 'flashcard'
  const roundN = qCount === 'all' ? available : Math.min(qCount, available)
  const startLabel =
    available === 0 ? '沒有符合的單字' : hasRound ? `開始（${roundN} 題）` : `開始（${available} 字）`

  const allOn = lessons.length === LESSON_NUMBERS.length

  function toggleLesson(n) {
    setLessons((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b),
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 animate-[fade_.2s_ease] bg-blk/40" onClick={onClose} />
      <div className="relative max-h-[88%] w-full max-w-[400px] animate-[pop_.2s_ease] overflow-y-auto no-scrollbar rounded-2xl bg-wht px-5 pb-6 pt-5 shadow-[0_20px_50px_-12px_rgba(20,20,18,.4)]">
        <h3 className="font-serif text-xl font-semibold text-blk">
          {MODE_TITLE[mode]}　<span className="font-sans text-sm font-normal text-gr4">開始練習</span>
        </h3>

        <div className="mb-2.5 mt-5 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[.1em] text-gr4">選擇課別（可複選）</span>
          <button
            onClick={() => setLessons(allOn ? [] : LESSON_NUMBERS)}
            className="text-xs text-gr6 hover:text-blk"
          >
            {allOn ? '全部取消' : '全選'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {LESSON_NUMBERS.map((n) => (
            <Chip key={n} active={lessons.includes(n)} onClick={() => toggleLesson(n)}>{`第${n}課`}</Chip>
          ))}
        </div>

        <div className="mb-2.5 mt-5 text-[11px] font-medium uppercase tracking-[.1em] text-gr4">範圍</div>
        <SegToggle options={STATUS_OPTIONS} value={scope} onChange={setScope} />

        {hasRound && (
          <>
            <div className="mb-2.5 mt-5 text-[11px] font-medium uppercase tracking-[.1em] text-gr4">題數</div>
            <SegToggle options={COUNT_OPTIONS} value={qCount} onChange={setQCount} />

            <div className="mb-2.5 mt-5 text-[11px] font-medium uppercase tracking-[.1em] text-gr4">計時</div>
            <SegToggle
              options={[
                { id: 'off', label: '不計時' },
                { id: 'on', label: '計時' },
              ]}
              value={timed ? 'on' : 'off'}
              onChange={(v) => setTimed(v === 'on')}
            />
          </>
        )}

        <div className="mt-7 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            className="flex-[1.4]"
            disabled={available === 0}
            onClick={() => onStart({ lessons, scope, count: qCount, timed })}
          >
            {startLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
