/** A single vocabulary word from the lesson JSON. */
export interface Word {
  id: string
  word: string
  reading: string
  accent: number[]
  meaning: string
  section: string
  lesson: number
  tags: string[]
}

/** A lesson bundle as loaded from the JSON file. */
export interface LessonBundle {
  lesson: number
  generatedAt: string
  source: string
  words: Word[]
}

/** Progress record persisted per word. */
export interface ProgressRecord {
  status: WordStatus
  reviewCount: number
  lastReviewed: string
}

/** The three possible statuses a word can have. */
export type WordStatus = 'known' | 'unknown' | 'unseen'

/** Scope filter for practice setup. */
export type ScopeFilter = 'all' | WordStatus

/** Practice configuration passed to mode components. */
export interface PracticeConfig {
  lessons: number[]
  scope: ScopeFilter
  count: number | 'all'
  timed: boolean
}

/** Route names in the app. */
export type Route = 'home' | 'flashcard' | 'quiz' | 'typing' | 'list'

/** Practice mode identifiers. */
export type PracticeMode = 'flashcard' | 'quiz' | 'typing'
