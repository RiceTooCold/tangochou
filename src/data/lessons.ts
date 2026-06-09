import type { Word, LessonBundle } from '../types'

import l7 from './vocab-lesson-7.json'
import l8 from './vocab-lesson-8.json'
import l9 from './vocab-lesson-9.json'
import l10 from './vocab-lesson-10.json'
import l11 from './vocab-lesson-11.json'
import l12 from './vocab-lesson-12.json'

// Ordered list of every lesson bundle, as imported from the static JSON.
export const LESSONS: LessonBundle[] = [l7, l8, l9, l10, l11, l12]

export const LESSON_NUMBERS: number[] = LESSONS.map((l) => l.lesson)

// Default focus for practice + list filters (the lessons being studied right now).
export const DEFAULT_LESSONS: number[] = [10, 11, 12]

// Flat list of all words across all lessons (ids are globally unique, e.g. "l9-001").
export const ALL_WORDS: Word[] = LESSONS.flatMap((l) => l.words)

const WORDS_BY_LESSON: Map<number, Word[]> = new Map(LESSONS.map((l) => [l.lesson, l.words]))

/** Words for a given lesson number, or ALL_WORDS when lesson is null/undefined ("全部"). */
export function wordsForLesson(lesson: number | null | undefined): Word[] {
  if (lesson == null) return ALL_WORDS
  return WORDS_BY_LESSON.get(lesson) ?? []
}

/** Words across a set of lesson numbers (canonical order). Empty → none; all selected → ALL_WORDS. */
export function wordsForLessons(lessons: number[]): Word[] {
  if (!lessons || lessons.length === 0) return []
  if (lessons.length === LESSON_NUMBERS.length) return ALL_WORDS
  const set = new Set(lessons)
  return ALL_WORDS.filter((w) => set.has(w.lesson))
}

/** Distinct section labels (in first-seen order) within a set of words. */
export function sectionsOf(words: Word[]): string[] {
  const seen: string[] = []
  const set = new Set<string>()
  for (const w of words) {
    const s = w.section || ''
    if (!set.has(s)) {
      set.add(s)
      seen.push(s)
    }
  }
  return seen
}
