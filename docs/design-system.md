# Design System — 単語帳

## 設計哲學

**Minimalism — 。** 每個元素都有功能，沒有裝飾性物件。大量留白，細邊線，serif 字型作為視覺錨點。

---

## 色彩 Tokens

```css
:root {
  /* Status — Forest Green（狀態顯示）*/
  --g800: #1a3a2a;
  --g700: #235132;
  --g100: #e6f0e9;
  --g50:  #f1f7f3;

  /* Status — Vermilion Red（狀態顯示）*/
  --r800: #6e1313;
  --r700: #8f1f1f;
  --r100: #f5e8e8;
  --r50:  #faf3f3;

  /* Primary — Warm Gray（主色調，承擔所有 UI 動作）*/
  --blk:  #141412;   /* primary button bg / heading */
  --gr8:  #2c2a28;   /* primary button hover */
  --gr6:  #4a4845;   /* secondary text */
  --gr4:  #7d7b76;   /* muted / placeholder */
  --gr2:  #c5c3be;   /* border default */
  --gr1:  #e4e2dd;   /* divider / surface border */
  --gr0:  #f2f0eb;   /* alternate surface（card back）*/
  --wht:  #f8f7f3;   /* page bg / card front */
}
```

### 使用規則

- **Green / Red** → 僅限狀態顯示：進度點、認識/不熟 badge、答題結果底色
- **所有 UI 動作**（button、focus ring、progress bar、selected state）→ 一律黑灰
- 頁面骨架全灰階，顏色只在「對/錯」這個語義瞬間出現

---

## 字型

```css
/* Google Fonts */
font-family: 'Noto Serif JP', serif;     /* display: kanji 大字 */
font-family: 'Noto Sans JP', sans-serif;  /* body: 假名、中文、UI */
```

| 角色 | 字族 | 大小 | 字重 | 顏色 |
|------|------|------|------|------|
| Kanji（閃卡主字）| Noto Serif JP | 38px | 600 | --blk |
| Reading（假名） | Noto Sans JP | 18px | 400 | --gr6 |
| Meaning（中文） | Noto Sans JP | 15px | 500 | --blk |
| Section Label | Noto Sans JP | 11px uppercase | 500 | --gr4 |
| Body / UI | Noto Sans JP | 14px | 400 | --gr6 |
| Caption | Noto Sans JP | 12px | 400 | --gr4 |

---

## 間距 & 圓角

```css
--radius-sm: 4px;    /* badge */
--radius-md: 8px;    /* button, input */
--radius-lg: 12px;   /* card */

/* 間距基準：8px grid */
/* 常用：8 / 12 / 16 / 20 / 24 / 32 / 48px */
```

---

## 元件規格

### Badge（文型標籤 / 狀態）

```css
padding: 3px 10px;
border-radius: var(--radius-sm);
font-size: 11px;
font-weight: 500;
letter-spacing: .04em;

/* 文型: bg --gr1, color --gr6 */
/* 認識: bg --g100, color --g700 */
/* 不熟: bg --r100, color --r700 */
/* 未見: border 0.5px --gr2, color --gr6 */
```

### Button

```css
height: 44px;
padding: 0 18px;
border-radius: var(--radius-md);
font-size: 14px;
font-weight: 500;
border: none;

/* Primary:  bg --blk, color --wht */
/* Primary hover: bg --gr8 */
/* Ghost:    border 0.5px --gr2, color --gr6, bg transparent */
/* Outline:  border 1.5px --blk, color --blk, bg transparent */
/* ✕ 不熟（答題後）: bg --r800, color --wht  ← 僅此處用紅 */
/* ✓ 認識（答題後）: bg --g800, color --wht  ← 僅此處用綠 */
```

### 閃卡（Flashcard）

```css
/* Front: bg --wht, border 0.5px --gr1, radius-lg, min-height 180px */
/* Back:  bg --gr0（alt surface）*/
/* Kanji: Noto Serif JP 38px, 置中 */
/* 翻轉動畫: CSS 3D transform rotateY(180deg), transition 0.35s ease */
```

### Word List Row

```css
padding: 12px 16px;
border-bottom: 0.5px solid var(--gr1);

/* 進度點: width/height 8px, border-radius 50% */
/*   known → --g700 | unknown → --r700 | unseen → --gr2 */
```

### Quiz Option

```css
padding: 14px 16px;
border-radius: var(--radius-md);
border: 0.5px solid var(--gr2);
margin-bottom: 8px;

/* correct: border --g700, bg --g50, color --g700 */
/* wrong:   border --r700, bg --r50, color --r700 */
```

### Progress Bar

```css
/* track: height 5px, bg --gr1, border-radius 99px */
/* fill:  bg --blk, border-radius 99px */
```

### Input

```css
height: 44px;
border: 0.5px solid var(--gr2);
border-radius: var(--radius-md);
padding: 0 14px;
font-size: 14px;
background: var(--wht);

/* focus: border --blk, box-shadow 0 0 0 3px --gr1 */
```

---

## RWD — Mobile First

```css
/* 基準：手機 375px width */
/* 唯一 breakpoint：md = 768px */

/* 閃卡 */
.flashcard { min-height: calc(100svh - 200px); }   /* 手機全高 */
@media (min-width: 768px) {
  .flashcard { min-height: 280px; max-width: 480px; margin: 0 auto; }
}

/* Quiz 選項：手機單欄，平板可兩欄（選配）*/
/* Word List：手機隱藏 reading 欄（too cramped），平板顯示 */
```

---

## 觸控優化

- 所有可點擊元素 `min-height: 44px`（Apple HIG 標準）
- 閃卡翻面支援 swipe（TouchEvent）
- 答題按鈕底部固定，拇指可達
