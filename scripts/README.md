# 單字資料抽取

單字 JSON（`src/data/vocab-lesson-N.json`）由 **vision 抽取流程**產生，取代了舊的純文字解析。
核心理念：把「看圖判斷」外包給 agent —— `agent(prompt, {schema})` 就是一個吃 prompt、吐結構化結果的函式，workflow 用 `parallel` 把每頁併發處理。

## 新增一課

1. 把 `N単語.pdf` 放到專案根目錄。
2. 在 `.claude/workflows/vocab-extract.js` 頂端編輯 `TARGET`（pdfPath + lesson 兩行），請 Claude Code 跑它：

   ```
   Workflow({ scriptPath: '<repo>/.claude/workflows/vocab-extract.js' })
   ```

   （新 session 也可用 `Workflow({ name: 'vocab-extract' })` —— 具名註冊表在 session 啟動時掃描；
   注意目前 runtime 的 `args` 通道不可靠，所以用頂端的 `TARGET` 區塊傳參，而非 args。）

   它會：
   - **Prep**：用 `gen_anchors.py`（pdfplumber）算出每頁的「字元錨集」。
   - **Extract**：每頁派一個 Sonnet 子代理「看圖」抽出結構化詞條（嚴格 schema）。
   - **Merge**：合併、配 `lN-NNN` id，並用錨集對 word/reading/meaning 做字元交叉校對，把可疑行（含子代理自報 `uncertain`）flag 出來。

3. **人工複檢**：Claude 對照 PDF 核對 flag 清單與可疑處（字元校對抓不到的「字在頁上但抄錯」要靠這關），必要時修正。
4. 寫入 `src/data/vocab-lesson-N.json`（schema 見 `docs/prd.md`；`accent` 為陣列、section 數字用全形）。
5. 跑 `python scripts/test_vocab_data.py` 驗證資料完整性（記得把新課加進 `LESSONS`）。

## 檔案

| 檔案 | 作用 |
|------|------|
| `../.claude/workflows/vocab-extract.js` | 具名 workflow（可重用、參數化） |
| `gen_anchors.py` | 產生每頁字元錨集（pdfplumber，供交叉校對） |
| `test_vocab_data.py` | 資料完整性測試（schema / golden / 字數 / section） |

設計與決策紀錄：`docs/superpowers/specs/2026-06-06-vision-vocab-extraction-design.md`
