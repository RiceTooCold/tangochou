import { useEffect, useMemo, useRef, useState } from 'react'
import { wordsForLessons } from '../data/lessons.js'
import { filterByScope, useProgress } from '../hooks/useProgress.jsx'
import { answersMatch, hasDistinctReading, surfaceForms } from '../lib/text.js'
import { AppBar, Badge, Button, Countdown, ProgressBar } from './ui.jsx'

const TIME_LIMIT = 20

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(words, count) {
  const n = count === 'all' ? words.length : Math.min(count, words.length)
  return shuffle(words)
    .slice(0, n)
    .map((word) => ({
      word,
      // ask for kanji or reading ~50/50; kana-only words can only be "kanji" (the word itself)
      target: hasDistinctReading(word) ? (Math.random() < 0.5 ? 'kanji' : 'reading') : 'kanji',
    }))
}

/**
 * Evaluate a typed answer. Returns { correct, viaReading }.
 * Either the kanji or the reading is accepted regardless of which was asked, and bracketed
 * parts are optional. Hiragana/katakana are not interchangeable (handled in normalizeAnswer).
 */
function judge(input, { word, target }) {
  const okWord = surfaceForms(word.word).some((f) => answersMatch(input, f))
  const okReading = surfaceForms(word.reading).some((f) => answersMatch(input, f))
  if (!okWord && !okReading) return { correct: false, viaReading: false }
  // flag when only the reading matched a question that asked for the kanji
  const viaReading = !okWord && target === 'kanji' && hasDistinctReading(word)
  return { correct: true, viaReading }
}

export default function TypingMode({ lessons, scope = 'all', count = 20, timed = true, onBack }) {
  const { map, setStatus } = useProgress()
  const base = useMemo(() => wordsForLessons(lessons), [lessons])

  const [round, setRound] = useState(0)
  const deck = useMemo(() => {
    return buildDeck(filterByScope(map, base, scope), count)
    // built once at entry / restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, scope, count, round])

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [verdict, setVerdict] = useState(null) // { correct, viaReading } | null
  const [results, setResults] = useState([])
  const [secLeft, setSecLeft] = useState(TIME_LIMIT)
  const inputRef = useRef(null)

  const total = deck.length
  const done = index >= total
  const card = deck[index]
  const answered = verdict !== null

  useEffect(() => {
    if (!done && !answered) inputRef.current?.focus()
  }, [index, done, answered])

  function submit() {
    if (answered || !card || !input.trim()) return
    const v = judge(input, card)
    setVerdict(v)
    setResults((r) => [...r, { word: card.word, correct: v.correct }])
    setStatus(card.word, v.correct ? 'known' : 'unknown')
  }

  function next() {
    setInput('')
    setVerdict(null)
    setSecLeft(TIME_LIMIT)
    setIndex((i) => i + 1)
  }

  function restart() {
    setInput('')
    setVerdict(null)
    setResults([])
    setSecLeft(TIME_LIMIT)
    setIndex(0)
    setRound((r) => r + 1)
  }

  // countdown — timeout reveals the answer as incorrect
  useEffect(() => {
    if (!timed || answered || done) return
    if (secLeft <= 0) {
      setVerdict({ correct: false, viaReading: false, timedOut: true })
      setResults((r) => [...r, { word: card.word, correct: false }])
      setStatus(card.word, 'unknown')
      return
    }
    const id = setTimeout(() => setSecLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, answered, done, secLeft, index])

  if (done) {
    return <TypingSummary results={results} total={total} onRestart={restart} onBack={onBack} />
  }

  return (
    <div className="flex h-full flex-col">
      <AppBar title="默寫" onBack={onBack} right={<span className="text-[13px] text-gr4 tnum">{index + 1} / {total}</span>} />

      <div className="px-[18px]">
        <ProgressBar value={total ? index / total : 0} />
      </div>
      {timed && (
        <div className="flex justify-end px-[18px] pt-2">
          <Countdown secLeft={secLeft} />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {/* question */}
        <div className="px-[22px] text-center">
          <div className="text-xs tracking-[.05em] text-gr4">這個意思的日文是？</div>
          <div className="mt-2.5 font-serif text-[36px] font-semibold leading-snug text-blk">{card.word.meaning}</div>
          <div className="mt-3.5 flex items-center justify-center gap-2">
            {card.word.tags?.[0] && <Badge variant="pos">{card.word.tags[0]}</Badge>}
            <Badge variant="sec">{card.target === 'reading' ? '請輸入讀音（假名）' : '請輸入漢字'}</Badge>
          </div>
        </div>

        {/* input */}
        <div className="mt-6 px-[18px]">
          <input
            ref={inputRef}
            value={input}
            disabled={answered}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              answered ? next() : submit()
            }}
            placeholder="輸入答案後按 Enter"
            className="h-12 w-full rounded-md border-[.5px] border-gr2 bg-wht px-3.5 text-center text-base text-blk placeholder:text-gr4 focus:border-blk focus:shadow-[0_0_0_3px_var(--color-gr1)] focus:outline-none disabled:opacity-70"
          />
        </div>

        {/* reveal */}
        {answered && (
          <div className="mt-4 px-[18px]">
            <div
              className={`rounded-md border-[.5px] px-4 py-4 text-center ${
                verdict.correct ? 'border-g100 bg-g50' : 'border-r100 bg-r50'
              }`}
            >
              <div className={`text-[11px] font-semibold uppercase tracking-[.08em] ${verdict.correct ? 'text-g700' : 'text-r700'}`}>
                {verdict.correct ? '✓ 正確' : verdict.timedOut ? '✕ 時間到' : '✕ 正確答案'}
              </div>
              <div className="mt-2.5 flex items-baseline justify-center gap-3">
                <span className="font-serif text-2xl font-semibold text-blk">{card.word.word}</span>
                {hasDistinctReading(card.word) && <span className="text-sm text-gr4">{card.word.reading}</span>}
              </div>
              {verdict.viaReading && <div className="mt-1.5 text-[11px] text-gr4">輸入了讀音也算對 · 漢字為 {card.word.word}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="px-[18px] pb-5 pt-3.5">
        {answered ? (
          <Button variant="primary" className="w-full" onClick={next}>
            {index + 1 === total ? '看結果' : '下一題'}　›
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled={!input.trim()} onClick={submit}>
            確認
          </Button>
        )}
      </div>
    </div>
  )
}

function TypingSummary({ results, total, onRestart, onBack }) {
  const correct = results.filter((r) => r.correct).length
  const pct = total ? Math.round((correct / total) * 100) : 0
  const wrong = results.filter((r) => !r.correct)

  return (
    <div className="flex h-full flex-col">
      <AppBar title="默寫 · 結果" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-[22px] py-6">
        <div className="text-center">
          <div className="text-[11px] font-medium uppercase tracking-[.1em] text-gr4">正確率</div>
          <div className="mt-2 font-serif text-5xl font-semibold text-blk tnum">{pct}%</div>
          <div className="mt-1 text-sm text-gr4 tnum">答對 {correct} / {total} 題</div>
        </div>

        {wrong.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[.1em] text-gr4">需加強（{wrong.length}）</div>
            <div className="rounded-lg border-[.5px] border-gr1">
              {wrong.map(({ word }, i) => (
                <div key={word.id} className={`flex items-baseline gap-3 px-4 py-3 ${i > 0 ? 'border-t-[.5px] border-gr1' : ''}`}>
                  <span className="font-serif text-[17px] text-blk">{word.word}</span>
                  {hasDistinctReading(word) && <span className="text-xs text-gr4">{word.reading}</span>}
                  <span className="ml-auto text-[13px] text-gr6">{word.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onBack}>回首頁</Button>
          <Button variant="outline" className="flex-1" onClick={onRestart}>再來一次</Button>
        </div>
      </div>
    </div>
  )
}
