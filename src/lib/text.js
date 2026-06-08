// Circled pitch-accent numerals: 0 → ⓪, 1..9 → ①..⑨
const CIRCLED = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨']

/** Format an accent array (number[]) as circled digits, e.g. [1,2] → "①②", [] → "". */
export function formatAccent(accent) {
  if (!Array.isArray(accent)) return ''
  return accent.map((n) => CIRCLED[n] ?? '').join('')
}

/**
 * Whether a word's reading is worth showing separately.
 * Hidden when the word is already kana (reading equals the word) or there is no reading.
 */
export function hasDistinctReading(word) {
  const r = (word.reading || '').trim()
  return r !== '' && r !== (word.word || '').trim()
}

const clean = (s) => s.replace(/[〜~\s]/g, '').trim()

/**
 * Every surface form we accept for one base string, treating each bracketed segment
 * (（…）, ［…］, 【…】) as independently optional. We expand the combinations of keeping
 * vs dropping each segment's content (so ［電話を］かけます（かける） yields かけます,
 * 電話をかけます, …) and also add each segment's content alone as an alternative form
 * (so あげます（あげる） accepts あげる).
 */
export function surfaceForms(base) {
  const b = (typeof base === 'string' ? base : '') || ''
  if (!b) return []
  const parts = [] // { text, optional }
  const re = /[（［【]([^）］】]*)[）］】]/g
  let last = 0
  let m
  while ((m = re.exec(b))) {
    if (m.index > last) parts.push({ text: b.slice(last, m.index), optional: false })
    parts.push({ text: m[1], optional: true })
    last = re.lastIndex
  }
  if (last < b.length) parts.push({ text: b.slice(last), optional: false })

  let combos = ['']
  for (const p of parts) {
    combos = p.optional
      ? combos.flatMap((c) => [c, c + p.text]) // drop or keep this segment
      : combos.map((c) => c + p.text)
  }
  const set = new Set(combos.map(clean))
  for (const p of parts) if (p.optional) set.add(clean(p.text)) // standalone alternative
  set.delete('')
  return [...set]
}

// ── Typing-mode fuzzy comparison (P2) ────────────────────────────
const FULLWIDTH_TO_HALF = (s) =>
  s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))

/**
 * Normalize an answer for lenient comparison: trim, half-width, long-vowel おお/ー unified.
 * Hiragana and katakana are NOT folded together — かぞく and カゾク stay distinct — so a
 * kana answer must use the right script; only kanji↔kana (via surfaceForms) is tolerated.
 */
export function normalizeAnswer(s) {
  let t = (s || '').trim()
  t = FULLWIDTH_TO_HALF(t)
  // treat long-vowel variants as equivalent: collapse おお → おう, ー dropped
  t = t.replace(/おお/g, 'おう').replace(/ー/g, '')
  return t
}

export function answersMatch(input, expected) {
  return normalizeAnswer(input) === normalizeAnswer(expected)
}
