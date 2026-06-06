export const meta = {
  name: 'vocab-extract',
  description: 'Extract a Japanese vocab-table PDF into structured JSON via per-page vision sub-agents + text-layer cross-check',
  whenToUse: 'When adding a new lesson: extract N単語.pdf into src/data/vocab-lesson-N.json. Invoke with args = { pdfPath, lesson }. After it returns, the assistant reviews flags against the PDF and writes the JSON file.',
  phases: [
    { title: 'Prep', detail: 'pdfplumber: per-page character anchor sets', model: 'haiku' },
    { title: 'Extract', detail: 'Sonnet vision, one sub-agent per page', model: 'sonnet' },
    { title: 'Merge', detail: 'JS merge + word/reading/meaning cross-check + IDs' },
  ],
}

// ── Input ────────────────────────────────────────────────────
// EDIT THIS for each lesson, then run:
//   Workflow({ scriptPath: '<repo>/.claude/workflows/vocab-extract.js' })
// (The `args` channel is honoured if available, but is currently unreliable
//  in this runtime, so the editable TARGET below is the supported path.)
const TARGET = {
  pdfPath: '/Users/josephlee/Projects/単語帳/12単語.pdf',
  lesson: 12,
}

// Canonical path: invoke `/vocab-extract` and let Claude fill `args`.
// If args is provided (even partially) we use it and validate; otherwise we fall
// back to the edited TARGET above — so a partial args never silently runs TARGET.
const argsGiven = typeof args !== 'undefined' && args && (args.pdfPath || args.lesson)
const input = argsGiven ? args : TARGET
if (!input || !input.pdfPath || !input.lesson) {
  throw new Error('vocab-extract: need { pdfPath, lesson } — pass via args, or edit TARGET at the top of the file')
}
const { pdfPath, lesson } = input
const source = pdfPath.split('/').pop()
const repoRoot = pdfPath.slice(0, pdfPath.lastIndexOf('/'))
const genScript = `${repoRoot}/scripts/gen_anchors.py`

// ── Schemas ──────────────────────────────────────────────────
const PREP_SCHEMA = {
  type: 'object',
  properties: {
    pageAnchors: {
      type: 'array',
      items: {
        type: 'object',
        properties: { page: { type: 'integer' }, chars: { type: 'string' } },
        required: ['page', 'chars'],
      },
    },
  },
  required: ['pageAnchors'],
}

const ENTRY_PROPS = {
  word: { type: 'string', description: 'Japanese word incl. kanji and bracket forms' },
  reading: { type: 'string', description: 'kana reading; "" if none' },
  accent: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 9 }, description: 'all pitch-accent circled numbers (⓪=0 .. ⑨=9); may be multiple; [] if none' },
  meaning: { type: 'string', description: 'Chinese meaning only, no icons' },
  section: { type: 'string', description: 'e.g. 文型１ / 会話; "" if the row continues a section from the previous page' },
  tags: { type: 'array', items: { type: 'string' }, description: '動詞/名詞/い形容詞/な形容詞/する動詞/慣用句' },
  uncertain: { type: 'boolean', description: 'true if any character could not be read clearly' },
}
const ENTRY_SCHEMA = {
  type: 'object',
  properties: { entries: { type: 'array', items: { type: 'object', properties: ENTRY_PROPS, required: Object.keys(ENTRY_PROPS) } } },
  required: ['entries'],
}

function extractRules(page) {
  return `你是日文單字表 PDF 的視覺抽取員。用 Read 工具讀取 PDF 第 ${page} 頁圖片（file_path: ${pdfPath}，pages: "${page}"）。

欄位由左到右：【日文單字 word】【聲調圈＋假名讀音 reading】【中文意思 meaning】。意思欄旁可能有裝飾性小圖示 —— 完全忽略。

逐行抽取（由上到下，不可略過、不可總結）：
1. word：保留漢字與方括號形（如 ［〜を］〜、駅）。
2. accent：讀音前圈圈 ⓪①②③④⑤⑥⑦⑧⑨ 是聲調，同行可能多個 → 全放進整數陣列，⓪=0，無則 []。注意可能出現 ⑦⑧ 等較大值。
3. reading：假名讀音（忽略上方紅色高低線）。word 本身是假名且無另列讀音時重複該假名；真的沒有則 ""。
4. meaning：只取中文文字，排除圖示，保留括號註解。
5. section：綠色橫條標題（文型N／会話／文法／家族 等），其下各行沿用至下一標題；若本頁開頭在任何標題之前（延續上一頁）則設 ""。注意：表格最上方的詞若上方沒有任何綠色標題，section 設 ""（不要把第一個「單字」誤當標題）。
6. tags：詞性，從 動詞/名詞/い形容詞/な形容詞/する動詞/慣用句 擇一放陣列（副詞等無法歸類者留空 []）。
7. uncertain：有任何字看不清設 true，絕不腦補漢字。

依序回傳所有 entries。`
}

// ── Phase 1: Prep — per-page character anchors via pdfplumber ─
phase('Prep')
const prep = await agent(
  `用 Bash 工具執行以下指令，並把它印到 stdout 的 JSON 原樣回傳（內含 pageAnchors 陣列；chars 欄位務必逐字照抄、不可改動或省略任何字元；不要加任何說明文字）：\n\n` +
  `uvx --from pdfplumber python3 ${genScript} ${pdfPath}`,
  { label: 'prep:anchors', phase: 'Prep', model: 'haiku', schema: PREP_SCHEMA }
)
const pageAnchors = prep.pageAnchors
log(`Prep: ${pageAnchors.length} pages`)

// ── Phase 2: Extract — one Sonnet vision sub-agent per page ───
phase('Extract')
const pageResults = await parallel(
  pageAnchors.map(p => p.page).map(page => () =>
    agent(extractRules(page), { label: `extract:p${page}`, phase: 'Extract', model: 'sonnet', schema: ENTRY_SCHEMA })
      .then(r => ({ page, entries: (r && r.entries) || [] }))
  )
)

// ── Phase 3: Merge — cross-check (word/reading/meaning) + IDs ─
phase('Merge')
function cjkChars(s) {
  return [...(s || '')].filter(c => {
    const cp = c.codePointAt(0)
    return (cp >= 0x3040 && cp <= 0x30FF) || (cp >= 0x4E00 && cp <= 0x9FFF)
  })
}
// normalize section digits to full-width for consistency (文型3 -> 文型３)
function normSection(s) {
  return [...(s || '')].map(c => (c >= '0' && c <= '9') ? String.fromCharCode(c.charCodeAt(0) + 0xFEE0) : c).join('')
}
const anchorByPage = {}
for (const pa of pageAnchors) anchorByPage[pa.page] = new Set([...pa.chars])

const words = []
const flags = []
let seq = 0
let lastSection = ''

for (const pr of pageResults.filter(Boolean).sort((a, b) => a.page - b.page)) {
  const anchor = anchorByPage[pr.page] || new Set()
  for (const e of pr.entries) {
    seq += 1
    const id = `l${lesson}-${String(seq).padStart(3, '0')}`
    const section = (e.section && e.section.trim()) ? normSection(e.section.trim()) : lastSection
    if (section) lastSection = section
    const nameMissing = [...new Set(cjkChars((e.word || '') + (e.reading || '')).filter(c => !anchor.has(c)))]
    const meaningMissing = [...new Set(cjkChars(e.meaning || '').filter(c => !anchor.has(c)))]
    words.push({
      id, word: e.word, reading: e.reading,
      accent: Array.isArray(e.accent) ? e.accent : [],
      meaning: e.meaning, section, lesson,
      tags: Array.isArray(e.tags) ? e.tags : [],
    })
    if (nameMissing.length || meaningMissing.length || e.uncertain) {
      flags.push({ id, page: pr.page, word: e.word, reading: e.reading, nameMissing, meaningMissing, uncertain: !!e.uncertain })
    }
  }
}

log(`Merged ${words.length} words; ${flags.length} flagged for review`)
return { lesson, source, count: words.length, words, flags }
