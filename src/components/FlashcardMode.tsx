import { useMemo, useState } from 'react'
import { wordsForLessons } from '../data/lessons'
import { filterByScope, useProgress } from '../hooks/useProgress'
import { formatAccent, hasDistinctReading } from '../lib/text'
import { AppBar, Badge, Button, ProgressBar, SegToggle } from './ui'
import type { ScopeFilter, Word, WordStatus } from '../types'

type FlashcardDirection = 'jp' | 'cn'

interface GradedEntry {
  word: Word
  status: WordStatus
}

interface FlashcardModeProps {
  lessons: number[]
  scope?: ScopeFilter
  onBack: () => void
}

interface SummaryProps {
  graded: GradedEntry[]
  total: number
  onRestart: () => void
  onBack: () => void
}

export default function FlashcardMode({ lessons, scope = 'all', onBack }: FlashcardModeProps) {
  const { map, setStatus } = useProgress()

  const [dir, setDir] = useState<FlashcardDirection>('jp') // 'jp' = 日→中 (front Japanese) | 'cn' = 中→日

  const deck = useMemo(() => {
    return filterByScope(map, wordsForLessons(lessons), scope)
    // fixed at entry time — not re-filtered as words get graded this session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons, scope])

  const [index, setIndex] = useState<number>(0)
  const [flipped, setFlipped] = useState<boolean>(false)
  const [graded, setGraded] = useState<GradedEntry[]>([])

  function grade(status: WordStatus): void {
    const word = deck[index]
    if (!word) return
    setStatus(word, status)
    setGraded((g) => [...g, { word, status }])
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  function restart(): void {
    setIndex(0)
    setFlipped(false)
    setGraded([])
  }

  const total = deck.length
  const done = index >= total
  const word = deck[index]

  return (
    <div className="flex h-full flex-col">
      <AppBar
        title="閃卡"
        onBack={onBack}
        right={!done && total > 0 ? <span className="text-[13px] text-gr4 tnum">{index + 1} / {total}</span> : null}
      />

      {total > 0 && (
        <div className="px-[18px]">
          <ProgressBar value={total ? index / total : 0} />
        </div>
      )}

      {/* direction */}
      <div className="px-[18px] pb-1 pt-3">
        <SegToggle
          options={[
            { id: 'jp', label: '日 → 中' },
            { id: 'cn', label: '中 → 日' },
          ] as const}
          value={dir}
          onChange={setDir}
        />
      </div>

      {done ? (
        <Summary graded={graded} total={total} onRestart={restart} onBack={onBack} />
      ) : (
        <>
          <div className="min-h-0 flex-1 px-[22px] py-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setFlipped((f) => !f)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFlipped((f) => !f)}
              className="flip h-full w-full cursor-pointer outline-none"
            >
              <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
                {/* FRONT */}
                <div className="flip-face flex flex-col items-center justify-center gap-3.5 rounded-lg border-[.5px] border-gr1 bg-wht p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)]">
                  {dir === 'jp' ? (
                    <>
                      {word.accent?.length > 0 && (
                        <div className="text-[13px] tracking-[.1em] text-gr4">{formatAccent(word.accent)}</div>
                      )}
                      <div className="text-center font-serif text-[44px] font-semibold leading-tight tracking-[.04em] text-blk">
                        {word.word}
                      </div>
                    </>
                  ) : (
                    <div className="text-center font-serif text-[34px] font-semibold leading-snug text-blk">{word.meaning}</div>
                  )}
                  <div className="absolute bottom-4 text-[11px] tracking-[.05em] text-gr4">點擊翻面</div>
                </div>

                {/* BACK */}
                <div className="flip-face flip-back flex flex-col items-center justify-center gap-2.5 rounded-lg border-[.5px] border-gr1 bg-gr0 p-6">
                  {word.section && <Badge variant="sec" className="absolute left-[18px] top-[18px]">{word.section}</Badge>}
                  {word.tags?.[0] && <Badge variant="pos" className="absolute right-[18px] top-[18px]">{word.tags[0]}</Badge>}

                  {dir === 'jp' ? (
                    <>
                      {hasDistinctReading(word) && <div className="text-[19px] text-gr4">{word.reading}</div>}
                      <div className="text-center text-base font-medium text-blk">{word.meaning}</div>
                    </>
                  ) : (
                    <>
                      {word.accent?.length > 0 && (
                        <div className="text-[13px] tracking-[.1em] text-gr4">{formatAccent(word.accent)}</div>
                      )}
                      <div className="text-center font-serif text-[36px] font-semibold text-blk">{word.word}</div>
                      {hasDistinctReading(word) && <div className="text-base text-gr4">{word.reading}</div>}
                    </>
                  )}
                  <div className="absolute bottom-4 text-[11px] tracking-[.05em] text-gr4">點擊翻回正面</div>
                </div>
              </div>
            </div>
          </div>

          {/* grade */}
          <div className="px-[18px] pb-5 pt-3.5">
            <div className="flex gap-3">
              <Button variant="dont" className="flex-1" onClick={() => grade('unknown')}>✕　不熟</Button>
              <Button variant="know" className="flex-1" onClick={() => grade('known')}>✓　認識</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Summary({ graded, total, onRestart, onBack }: SummaryProps) {
  if (total === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-sm text-gr6">這個範圍沒有單字</p>
        <Button variant="outline" onClick={onBack}>回首頁</Button>
      </div>
    )
  }
  const known = graded.filter((g) => g.status === 'known').length
  const weak = graded.filter((g) => g.status === 'unknown')

  return (
    <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-[22px] py-6">
      <div className="text-center">
        <div className="text-[11px] font-medium uppercase tracking-[.1em] text-gr4">本回合完成</div>
        <div className="mt-2 font-serif text-3xl font-semibold text-blk tnum">
          {known} <span className="font-sans text-sm font-normal text-gr4">/ {total} 認識</span>
        </div>
      </div>

      {weak.length > 0 && (
        <div className="mt-7">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[.1em] text-gr4">需加強（{weak.length}）</div>
          <div className="rounded-lg border-[.5px] border-gr1">
            {weak.map(({ word }, i) => (
              <div key={word.id} className={`flex items-baseline gap-3 px-4 py-3 ${i > 0 ? 'border-t-[.5px] border-gr1' : ''}`}>
                <span className="font-serif text-[17px] text-blk">{word.word}</span>
                {hasDistinctReading(word) && <span className="text-xs text-gr4">{word.reading}</span>}
                <span className="ml-auto text-[13px] text-gr6">{word.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onBack}>回首頁</Button>
        <Button variant="outline" className="flex-1" onClick={onRestart}>再來一次</Button>
      </div>
    </div>
  )
}
