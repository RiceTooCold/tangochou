---
name: add-vocab-lesson
description: 把日文單字表 PDF（N単語.pdf）抽成結構化 JSON 並加進 src/data/ 的完整流程。當使用者要新增或抽取某一課單字時使用 —— 觸發語如「抽第13課」「把 13単語.pdf 做成 JSON」「add lesson 13 vocab」「重抽第 N 課」。涵蓋四步：跑 vocab-extract workflow（多代理看圖抽取）、對照 PDF 人工複檢 flags、寫入 vocab-lesson-N.json、跑 schema gate 測試。是 .claude/workflows/vocab-extract.js 這個 workflow 的外層劇本。
---

# 新增/抽取一課單字

把 `N単語.pdf` 變成 `src/data/vocab-lesson-N.json`。資料 schema 見 `docs/prd.md`（`accent` 為陣列 0–9、section 數字全形）。

**這是 workflow 之上的劇本：workflow 只做抽取並回傳 `{ words, flags }`；複檢與寫檔由主對話（你）完成 —— workflow 沒有檔案系統權限，資料不經過你這關不會落地。以下四步缺一不可。**

## 步驟 1 — 跑抽取 workflow

確認 `N単語.pdf` 在 repo 根目錄。編輯 `.claude/workflows/vocab-extract.js` 頂端的 `TARGET`（`pdfPath` 絕對路徑 + `lesson` 號碼兩行），然後：

```
Workflow({ scriptPath: '<repo>/.claude/workflows/vocab-extract.js' })
```

（新 session 也可用 `/vocab-extract`；此 runtime 的工具 `args` 參數實測傳不進去，故用 `TARGET`。）

它會 prep（haiku 跑 gen_anchors.py）→ 每頁 Sonnet 看圖抽取 → 合併 + word/reading/meaning 對文字層交叉校對，回傳 `{ lesson, source, count, words, flags }`。

## 步驟 2 — 人工複檢（必做，不可略過）

對**每一個 flag**、以及全表掃過一遍：用 `Read` 開對應 PDF 頁（`pages: "P"`）逐行對照圖片。交叉校對只比對「字是否在頁上」，抓不到下列「字在頁上但抄錯」的型態，必須靠這關：

- **大小寫假名**：`ェ/エ`、`ッ/ツ`、`ャ/ヤ`（vision 常看錯，如 順化市 應 `フエ` 非 `フェ`）。
- **相似假名誤讀**：`あ/わ/お` 等（如 `笑う` 應 `わらう`，被看成 `あらう`）。
- **意思抄到鄰行**：meaning 與該詞對不上（如 ホテル 被抄成「進入」、乗り換える 被抄成「想起」）—— 逐筆確認 meaning 配 word。
- **原檔 typo**：教材本身偶有錯（讀音/意思），修成正確的日文/中文，並在回報中註明是原檔錯誤。
- **聲調**：實際有 `⑦⑧`（不是只有 0–6）；同詞多個圈 → accent 放多元素陣列。

## 步驟 3 — 寫檔

把複檢後的資料寫成 `src/data/vocab-lesson-N.json`：

```json
{ "lesson": N, "generatedAt": "<今天 ISO 日期>", "source": "N単語.pdf", "words": [ ... ] }
```

每筆 `{ id: "lN-NNN", word, reading, accent: number[], meaning, section, lesson, tags: string[] }`。section 全形（workflow 已正規化）。**若該課已有檔案（重抽），先跟現有 JSON 逐詞 diff 給使用者看，再覆寫。**

## 步驟 4 — Schema gate（必過才算完成）

把 `N` 加進 `scripts/test_vocab_data.py` 的 `LESSONS` 與 `EXPECTED_COUNTS`（必要時補一兩個 golden），然後：

```
python scripts/test_vocab_data.py
```

**必須印出 `✅ All checks passed` 才算完成。** 失敗就修資料/測試再跑，不可在紅燈狀態收尾。
