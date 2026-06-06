import { ALL_WORDS } from '../data/lessons.js'
import { useProgress, tally } from '../hooks/useProgress.jsx'
import { ProgressBar } from './ui.jsx'

const MODES = [
  { id: 'flashcard', glyph: '札', name: '閃卡', desc: '看日文翻面對讀音與意思' },
  { id: 'quiz', glyph: '選', name: '選擇題', desc: '四選一，可開 15 秒倒數' },
  { id: 'typing', glyph: '書', name: '默寫', desc: '看中文輸入漢字或讀音' },
]

function Row({ glyph, name, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="mx-[18px] mb-2.5 flex w-[calc(100%-36px)] items-center gap-3.5 rounded-md border-[.5px] border-gr1 bg-wht px-4 py-[15px] text-left transition-colors hover:border-gr2"
    >
      <span className="w-[30px] text-center font-serif text-xl text-blk">{glyph}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-blk">{name}</span>
        <span className="block text-xs text-gr4">{desc}</span>
      </span>
      <span className="ml-auto pl-2 text-lg text-gr2">›</span>
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="px-[22px] pb-2.5 pt-[22px] text-[11px] font-medium uppercase tracking-[.1em] text-gr4">
      {children}
    </div>
  )
}

export default function HomeScreen({ onStartPractice, onOpenList }) {
  const { map, resetAll } = useProgress()
  const stats = tally(map, ALL_WORDS)

  function handleReset() {
    if (stats.known === 0 && stats.unknown === 0) return
    if (!window.confirm('確定要清除所有課程的學習進度嗎？此動作無法復原。')) return
    resetAll()
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-6">
      {/* hero */}
      <div className="px-[22px] pb-5 pt-3">
        <h1 className="font-serif text-3xl font-semibold tracking-[.04em] text-blk">単語帳</h1>
        <p className="mt-1.5 text-xs tracking-[.04em] text-gr4">日文單字練習</p>
      </div>

      {/* total progress */}
      <div className="mx-[18px] rounded-lg border-[.5px] border-gr1 bg-gr0 px-[18px] pb-4 pt-[18px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[.1em] text-gr4">總進度</span>
          <button
            onClick={handleReset}
            className="text-[11px] text-gr4 underline-offset-4 transition-colors hover:text-r700 hover:underline"
          >
            重置進度
          </button>
        </div>
        <div className="mt-1.5 font-serif text-3xl font-semibold text-blk tnum">
          {stats.known} <span className="font-sans text-sm font-normal text-gr4">/ {stats.total} 個認識</span>
        </div>
        <ProgressBar className="mt-3.5" value={stats.total ? stats.known / stats.total : 0} />
        <div className="mt-2.5 flex gap-3.5 text-[11px] text-gr6 tnum">
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-g700" />認識 {stats.known}</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-r700" />不熟 {stats.unknown}</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-gr2" />未見 {stats.unseen}</span>
        </div>
      </div>

      {/* browse — above practice modes */}
      <SectionLabel>瀏覽</SectionLabel>
      <Row glyph="表" name="單字列表" desc="依課／文型分組 · 搜尋 · 篩選" onClick={onOpenList} />

      {/* practice modes — each opens the setup sheet */}
      <SectionLabel>練習模式</SectionLabel>
      {MODES.map((m) => (
        <Row key={m.id} {...m} onClick={() => onStartPractice(m.id)} />
      ))}
    </div>
  )
}
