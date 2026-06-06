# 単語帳 — 日文單字練習

輕量的日文單字練習 Web App。把單字表 PDF 抽成結構化 JSON，提供閃卡、選擇題、默寫三種練習模式，並用 `localStorage` 追蹤學習進度。目前涵蓋第 7–12 課，共 **413 個單字**。

介面為繁體中文，內容為日文（漢字 + 假名 + 聲調 + 中文意思）。

## 功能

- **閃卡（Flashcard）** — 日↔中翻面、聲調顯示、評分「認識／不熟」
- **選擇題（Quiz）** — 四選一、可開 15 秒倒數、結束顯示正確率與答錯清單
- **默寫（Typing）** — 看中文輸入漢字或讀音，含全半形／長音等模糊比對
- **單字列表** — 依課／文型分組、關鍵字搜尋（日文與中文）、依熟悉度篩選
- **練習設定** — 進入任一練習前可選課別（複選）與範圍（全部／認識／不熟／未見）
- **進度追蹤** — 每課獨立存於 `localStorage`，首頁顯示總進度

## 技術

| 層 | 選擇 |
|----|------|
| 前端 | React 19 + Vite 6 |
| 樣式 | Tailwind CSS v4（`@theme` token 對映設計系統） |
| 單字資料 | 靜態 JSON，build-time import |
| 學習進度 | `localStorage`（無後端、無帳號） |
| 套件管理 | pnpm |

## 開始

```bash
pnpm install
pnpm dev        # 開發伺服器（http://localhost:5173）
pnpm build      # 產生 production bundle 到 dist/
pnpm preview    # 預覽 build 結果
```

## 專案結構

```
src/
├── data/            # 各課單字 JSON（vocab-lesson-7..12）+ lessons.js
├── components/      # HomeScreen / FlashcardMode / QuizMode / TypingMode
│                    # VocabListScreen / PracticeSetupModal / ui.jsx
├── hooks/           # useProgress.jsx（進度 Context + localStorage）
├── lib/             # text.js（聲調格式化、模糊比對等）
├── App.jsx          # 畫面切換 + 練習設定 modal
└── main.jsx
docs/                # prd.md、design-system.md、設計 mockup
scripts/             # 單字抽取工具鏈（見下）
.claude/             # vocab-extract workflow + add-vocab-lesson skill
```

## 單字資料抽取

單字 JSON 由 **vision 抽取流程**產生（取代舊的純文字解析）：每頁派一個子代理「看圖」抽出結構化詞條，再用 pdfplumber 的字元集合做交叉校對防幻覺，最後人工複檢。流程細節見 [`scripts/README.md`](scripts/README.md)。

新增一課：把 `N単語.pdf` 放到專案根目錄，跑 `.claude/workflows/vocab-extract.js`，複檢後寫入 `src/data/vocab-lesson-N.json`，再跑 schema gate：

```bash
python scripts/test_vocab_data.py     # 驗證資料完整性
```

> 原始課程 PDF 預設不納入版控（見 `.gitignore`）；`src/data/` 的 JSON 才是資料來源。

## 文件

- 產品需求：[`docs/prd.md`](docs/prd.md)
- 設計系統：[`docs/design-system.md`](docs/design-system.md)
