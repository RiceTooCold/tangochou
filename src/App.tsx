import { useState } from 'react'
import { DEFAULT_LESSONS } from './data/lessons'
import { ProgressProvider } from './hooks/useProgress'
import HomeScreen from './components/HomeScreen'
import FlashcardMode from './components/FlashcardMode'
import QuizMode from './components/QuizMode'
import TypingMode from './components/TypingMode'
import VocabListScreen from './components/VocabListScreen'
import PracticeSetupModal from './components/PracticeSetupModal'
import type { Route, PracticeMode, PracticeConfig } from './types'

const PRACTICE_MODES = new Set<string>(['flashcard', 'quiz', 'typing'])

export default function App() {
  const [route, setRoute] = useState<Route>('home')
  const [pendingMode, setPendingMode] = useState<PracticeMode | null>(null) // practice mode awaiting setup
  const [practice, setPractice] = useState<PracticeConfig>({
    lessons: DEFAULT_LESSONS,
    scope: 'all',
    count: 20,
    timed: true,
  })

  function go(target: Route | PracticeMode) {
    if (PRACTICE_MODES.has(target)) {
      setPendingMode(target as PracticeMode)
    } else {
      setRoute(target as Route)
    }
  }

  function startPractice(config: PracticeConfig) {
    setPractice(config)
    if (pendingMode) {
      setRoute(pendingMode)
    }
    setPendingMode(null)
  }

  const home = () => setRoute('home')

  return (
    <ProgressProvider>
      <div className="min-h-[100dvh] bg-gr0">
        <div className="relative mx-auto flex h-[100dvh] w-full max-w-[560px] flex-col overflow-hidden bg-wht shadow-[0_0_40px_-12px_rgba(20,20,18,.12)]">
          {route === 'home' && <HomeScreen onStartPractice={go} onOpenList={() => setRoute('list')} />}
          {route === 'flashcard' && <FlashcardMode {...practice} onBack={home} />}
          {route === 'quiz' && <QuizMode {...practice} onBack={home} />}
          {route === 'typing' && <TypingMode {...practice} onBack={home} />}
          {route === 'list' && <VocabListScreen onBack={home} />}

          {pendingMode && (
            <PracticeSetupModal
              mode={pendingMode}
              initial={practice}
              onStart={startPractice}
              onClose={() => setPendingMode(null)}
            />
          )}
        </div>
      </div>
    </ProgressProvider>
  )
}
