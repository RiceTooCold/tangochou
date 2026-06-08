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

/** Strip whole bracketed segments (（…）, ［…］, 【…】) plus 〜 and spaces, e.g. 質問（する） → 質問. */
export function bareWord(word) {
  const w = typeof word === 'string' ? word : word.word || ''
  return w
    .replace(/（[^）]*）/g, '')
    .replace(/［[^］]*］/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/[〜~\s]/g, '')
    .trim()
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

/** Whether a word is a katakana loanword (its bare form is entirely katakana) — answered in katakana. */
const KATAKANA_ONLY = /^[ァ-ヶーｰ・]+$/
export function isKatakanaWord(word) {
  const bare = bareWord(typeof word === 'string' ? word : word?.word || '')
  return bare !== '' && KATAKANA_ONLY.test(bare)
}

// ── Typing-mode fuzzy comparison (P2) ────────────────────────────
const KATA_TO_HIRA = (s) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

const FULLWIDTH_TO_HALF = (s) =>
  s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))

/**
 * Normalize an answer for lenient comparison: trim, half-width, long-vowel おお/おう unified.
 * Katakana folds to hiragana unless `foldKana` is false (loanwords must stay katakana).
 */
export function normalizeAnswer(s, { foldKana = true } = {}) {
  let t = (s || '').trim()
  t = FULLWIDTH_TO_HALF(t)
  if (foldKana) t = KATA_TO_HIRA(t)
  // treat long-vowel variants as equivalent: collapse おお → おう, ー dropped
  t = t.replace(/おお/g, 'おう').replace(/ー/g, '')
  return t
}

export function answersMatch(input, expected, opts) {
  return normalizeAnswer(input, opts) === normalizeAnswer(expected, opts)
}
