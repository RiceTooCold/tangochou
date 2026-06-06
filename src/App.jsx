import { useState } from 'react'
import { DEFAULT_LESSONS } from './data/lessons.js'
import { ProgressProvider } from './hooks/useProgress.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import FlashcardMode from './components/FlashcardMode.jsx'
import QuizMode from './components/QuizMode.jsx'
import TypingMode from './components/TypingMode.jsx'
import VocabListScreen from './components/VocabListScreen.jsx'
import PracticeSetupModal from './components/PracticeSetupModal.jsx'

const PRACTICE_MODES = new Set(['flashcard', 'quiz', 'typing'])

export default function App() {
  const [route, setRoute] = useState('home')
  const [pendingMode, setPendingMode] = useState(null) // practice mode awaiting setup
  const [practice, setPractice] = useState({
    lessons: DEFAULT_LESSONS,
    scope: 'all',
    count: 20,
    timed: true,
  })

  function go(target) {
    if (PRACTICE_MODES.has(target)) setPendingMode(target)
    else setRoute(target)
  }

  function startPractice(config) {
    setPractice(config)
    setRoute(pendingMode)
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
