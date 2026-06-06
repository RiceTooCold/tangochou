# Spec：Vision 單字抽取 Workflow（pilot：第 12 課）

**日期：** 2026-06-06
**狀態：** Approved design，待實作

---

## 1. 目標與背景

現有 `scripts/parse_vocab.py`（pdfplumber + regex）對排版不穩、夾帶裝飾圖示的單字表 PDF 很脆弱：會產生 unparsed line、furigana fragment、誤標詞性、無法表示雙聲調。

改採 **vision 為主**的抽取：派 sub-agent 直接「看」每頁 PDF 圖片抽出結構化單字，並用 pdfplumber 文字層當「防幻覺錨」交叉校對。以 Workflow 編排工具實作，每頁一個 sub-agent。

**Pilot 範圍：** 只做第 12 課（`12単語.pdf`，4 頁）。未解析、最雜（大量圖示 + 雙聲調），是最嚴苛的壓力測試。pilot 驗證通過後再推廣到其他課。

## 2. 已定決策

| 決策 | 選擇 |
|------|------|
| 範圍 | 先 1 課 pilot（第 12 課） |
| accent schema | `number[]` 陣列（支援雙聲調 `[4,2]`；單聲調 `[0]`；無則 `[]`） |
| 防幻覺 | Vision 主 + pdfplumber 文字層字元交叉校對 |
| 子代理看頁 | 原生 `Read pages:"N"`（零設定、已驗證畫質足夠） |
| 子代理模型 | Sonnet（非 Opus；CJK 小字辨識準度與成本的平衡點） |
| tags 來源 | 由 vision agent 判定（取代會誤標的 regex `_auto_tag`） |

## 3. 架構（4 階段）

### 前置（main agent，Bash，啟動 workflow 前）
1. 取頁數（pypdf）。
2. pdfplumber 逐頁抽原始文字 → 每頁建「字元錨集」（該頁出現過的所有字元 Set）。
3. 把 `{ pdfPath, lesson, pageAnchors: [{page, chars}] }` 當 `args` 傳入 workflow。

### Phase 1 — Extract（fan-out，一頁一 sub-agent，Sonnet，vision）
每個 agent 用 `Read` 直接看該頁 PDF，依嚴格 schema（StructuredOutput）輸出該頁所有詞條。
規則：
- 忽略裝飾性圖示（西裝/襪子/眼鏡等小圖）。
- 抓齊**所有**聲調圈（可能多個 → accent 陣列）。
- 保留方括號形（`［めがねを］かける`）與註解。
- section header（`文型N` / `会話` / `文法` 等）出現後向下沿用，直到下一個 header。
- 看不清的字標 `uncertain: true`，不要腦補。

### Phase 2 — Cross-check + Merge（script JS，決定性、零 token）
1. 按頁序串接所有 agent 的輸出。
2. 逐筆把 `word` + `reading` 中的每個漢字/假名比對該頁字元錨集；不在錨集者記入 `flaggedChars`、標 `needsReview`。
   - 註：pdfplumber 也可能漏字 → flag 為「待人工複核」，**不自動丟棄**。
3. 指派 `id = l{lesson}-{NNN}`，附 `lesson` 欄。
4. 回傳 `{ lesson, source, words, flags }`。

### 收尾（main agent）
- 把結果 Write 成 `src/data/vocab-lesson-12.json`（標準結構 `lesson/generatedAt/source/words`，`generatedAt` 用 2026-06-06）。
- 印出 flag 清單給使用者人工複核。

## 4. 抽取 schema（每頁 → entries 陣列）

```jsonc
{
  "entries": [
    {
      "word": "靴下",          // 含漢字/方括號形
      "reading": "くつした",    // 假名讀音；無則 ""
      "accent": [4, 2],         // 聲調圈 0-6，可多個；無則 []
      "meaning": "襪子",        // 中文意思（不含圖示）
      "section": "文型１",
      "tags": ["名詞"],         // 動詞/名詞/い形容詞/な形容詞/する動詞/慣用句
      "uncertain": false
    }
  ]
}
```

## 5. 風險與緩解

- **長頁漏行**：每頁約 ~22 筆，單 agent 可負荷；schema 要求逐行不省略。若實跑發現漏尾段，改同頁兩遍取聯集。
- **furigana/小字不清**：先用原生 Read；不足則升級 PyMuPDF 250 DPI 預渲染。
- **文字層誤報**：pdfplumber 漏字會造成假 flag → 人工複核吸收，不自動刪。
- **雙聲調誤併**：schema 明確要求把每個圈都列入 accent 陣列。

## 6. 成功標準

- 第 12 課產出 `vocab-lesson-12.json`，詞條數與 PDF 目視相符（不漏不重）。
- 雙聲調（`ズボン`/`靴下`/`アクセサリー`）正確存成多元素 accent 陣列。
- 裝飾圖示完全不污染 meaning 欄。
- flag 清單可控（少數需複核），且複核後無實質漢字錯誤。
- 詞性 tag 正確率明顯優於現有 regex（抽樣檢查 `手伝う`/`使う` 類）。
