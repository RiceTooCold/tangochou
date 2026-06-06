import { useEffect, useMemo, useState } from 'react'
import { wordsForLessons } from '../data/lessons.js'
import { filterByScope, useProgress } from '../hooks/useProgress.jsx'
import { hasDistinctReading } from '../lib/text.js'
import { AppBar, Button, ProgressBar } from './ui.jsx'

const QUIZ_LEN = 20
const TIME_LIMIT = 15

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// questions drawn from `questionWords`; distractors from the wider `pool`
function buildQuiz(questionWords, pool) {
  const picked = shuffle(questionWords).slice(0, Math.min(QUIZ_LEN, questionWords.length))
  return picked.map((answer) => {
    const distractors = shuffle(pool.filter((w) => w.id !== answer.id)).slice(0, 3)
    return { answer, options: shuffle([answer, ...distractors]) }
  })
}

export default function QuizMode({ lessons, scope = 'all', onBack }) {
  const { map, setStatus } = useProgress()
  const pool = useMemo(() => wordsForLessons(lessons), [lessons])

  const [round, setRound] = useState(0)
  const quiz = useMemo(() => {
    return buildQuiz(filterByScope(map, pool, scope), pool)
    // built once at entry / restart — not rebuilt as statuses change mid-round
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, scope, round])

  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null) // option index chosen, or 'timeout'
  const [answered, setAnswered] = useState(false)
  const [results, setResults] = useState([]) // { word, correct }
  const [timerOn, setTimerOn] = useState(true)
  const [secLeft, setSecLeft] = useState(TIME_LIMIT)

  const total = quiz.length
  const done = qIndex >= total
  const q = quiz[qIndex]

  function answer(optionIndex) {
    if (answered || !q) return
    const word = q.options[optionIndex] ?? null
    const correct = word?.id === q.answer.id
    setSelected(optionIndex)
    setAnswered(true)
    setResults((r) => [...r, { word: q.answer, correct }])
    setStatus(q.answer, correct ? 'known' : 'unknown')
  }

  function next() {
    setSelected(null)
    setAnswered(false)
    setSecLeft(TIME_LIMIT)
    setQIndex((i) => i + 1)
  }

  function restart() {
    setResults([])
    setSelected(null)
    setAnswered(false)
    setSecLeft(TIME_LIMIT)
    setQIndex(0)
    setRound((r) => r + 1)
  }

  // countdown
  useEffect(() => {
    if (!timerOn || answered || done) return
    if (secLeft <= 0) {
      // timeout counts as a wrong answer with no selection
      setSelected('timeout')
      setAnswered(true)
      setResults((r) => [...r, { word: q.answer, correct: false }])
      setStatus(q.answer, 'unknown')
      return
    }
    const id = setTimeout(() => setSecLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerOn, answered, done, secLeft, qIndex])

  if (done) {
    return <QuizSummary results={results} total={total} onRestart={restart} onBack={onBack} />
  }

  return (
    <div className="flex h-full flex-col">
      <AppBar title="選擇題" onBack={onBack} right={<span className="text-[13px] text-gr4 tnum">{qIndex + 1} / {total}</span>} />

      <div className="px-[18px]">
        <ProgressBar value={total ? qIndex / total : 0} />
      </div>
      <div className="flex justify-end px-2.5 pt-2">
        <button
          aria-label="計時開關"
          onClick={() => {
            setTimerOn((v) => !v)
            setSecLeft(TIME_LIMIT)
          }}
          className="inline-flex items-center gap-1.5 text-xs text-gr6 tnum"
        >
          {timerOn ? (
            <>
              <span
                className="inline-block h-3 w-3 rounded-full border-2 border-gr2"
                style={{ borderTopColor: secLeft <= 5 ? 'var(--color-r700)' : 'var(--color-blk)' }}
              />
              {secLeft}s
            </>
          ) : (
            <span className="text-gr4">計時 ✕</span>
          )}
        </button>
      </div>

      {/* question */}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <div className="px-[22px] pb-5 pt-6 text-center">
          <div className="text-xs tracking-[.05em] text-gr4">這個意思的日文是？</div>
          <div className="mt-2.5 font-serif text-[34px] font-semibold leading-snug text-blk">{q.answer.meaning}</div>
        </div>

        <div className="mt-1">
          {q.options.map((opt, i) => {
            const isCorrect = opt.id === q.answer.id
            const isPicked = selected === i
            let cls = 'border-gr2 text-gr8'
            if (answered) {
              if (isCorrect) cls = 'border-g700 bg-g50 text-g700'
              else if (isPicked) cls = 'border-r700 bg-r50 text-r700'
              else cls = 'border-gr2 text-gr8 opacity-45'
            }
            return (
              <button
                key={opt.id}
                disabled={answered}
                onClick={() => answer(i)}
                className={`relative mx-[18px] mb-2.5 flex w-[calc(100%-36px)] items-baseline justify-center gap-2.5 rounded-md border-[.5px] px-4 py-3.5 text-[15px] transition-colors ${cls}`}
              >
                <span className={`font-serif text-[17px] ${answered && isCorrect ? 'text-g700' : answered && isPicked ? 'text-r700' : 'text-blk'}`}>
                  {opt.word}
                </span>
                {hasDistinctReading(opt) && <span className="text-[13px] text-current opacity-70">{opt.reading}</span>}
                {answered && isCorrect && <span className="absolute right-4 top-1/2 -translate-y-1/2">✓</span>}
                {answered && isPicked && !isCorrect && <span className="absolute right-4 top-1/2 -translate-y-1/2">✕</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-[18px] pb-5 pt-3.5">
        <Button variant="primary" className="w-full" disabled={!answered} onClick={next}>
          {qIndex + 1 === total ? '看結果' : '下一題'}　›
        </Button>
      </div>
    </div>
  )
}

function QuizSummary({ results, total, onRestart, onBack }) {
  const correct = results.filter((r) => r.correct).length
  const pct = total ? Math.round((correct / total) * 100) : 0
  const wrong = results.filter((r) => !r.correct)

  return (
    <div className="flex h-full flex-col">
      <AppBar title="選擇題 · 結果" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-[22px] py-6">
        <div className="text-center">
          <div className="text-[11px] font-medium uppercase tracking-[.1em] text-gr4">正確率</div>
          <div className="mt-2 font-serif text-5xl font-semibold text-blk tnum">{pct}%</div>
          <div className="mt-1 text-sm text-gr4 tnum">答對 {correct} / {total} 題</div>
        </div>

        {wrong.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[.1em] text-gr4">答錯（{wrong.length}）</div>
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
