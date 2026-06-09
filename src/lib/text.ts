import type { Word } from '../types'

// Circled pitch-accent numerals: 0 → ⓪, 1..9 → ①..⑨
const CIRCLED = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨']

/** Format an accent array (number[]) as circled digits, e.g. [1,2] → "①②", [] → "". */
export function formatAccent(accent: number[]): string {
  if (!Array.isArray(accent)) return ''
  return accent.map((n) => CIRCLED[n] ?? '').join('')
}

/**
 * Whether a word's reading is worth showing separately.
 * Hidden when the word is already kana (reading equals the word) or there is no reading.
 */
export function hasDistinctReading(word: Word): boolean {
  const r = (word.reading || '').trim()
  return r !== '' && r !== (word.word || '').trim()
}

/** Strip decorative markers (（…）, ［…］, 〜, spaces) so 質問（する） / ［〜を］〜 compare leniently. */
export function bareWord(word: string | Word): string {
  const w = typeof word === 'string' ? word : word.word || ''
  return w
    .replace(/（[^）]*）/g, '')
    .replace(/［[^］]*］/g, '')
    .replace(/[〜~\s]/g, '')
    .trim()
}

// ── Typing-mode fuzzy comparison (P2) ────────────────────────────
const KATA_TO_HIRA = (s: string): string =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

const FULLWIDTH_TO_HALF = (s: string): string =>
  s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))

/** Normalize an answer for lenient comparison: trim, half-width, hiragana, long-vowel おお/おう unified. */
export function normalizeAnswer(s: string): string {
  let t = (s || '').trim()
  t = FULLWIDTH_TO_HALF(t)
  t = KATA_TO_HIRA(t)
  // treat long-vowel variants as equivalent: collapse おう/おお → おう family, ー → preceding vowel
  t = t.replace(/おお/g, 'おう').replace(/ー/g, '')
  return t
}

export function answersMatch(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected)
}
