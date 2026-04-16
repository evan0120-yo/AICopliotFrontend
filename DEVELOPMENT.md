# Internal AI Copilot Frontend Development Guide

## Scope

這份文件定義 frontend 的開發流程與文件同步規則。

這個 repo 現在的定位是：

```text
internal frontend
├─ builder-driven testing console
└─ admin builder / template tools
```

## Document Suite

frontend root 文件分工如下：

```text
PLAN.md
└─ 高層範圍、產品用途、長線方向

BDD.md
└─ 目前已落地的可觀察行為

SDD.md
└─ root 級結構、資料流、責任邊界

TDD.md
└─ 測試策略、測試順序、當前驗證基線

CODE_REVIEW.md
└─ 根據 code 寫出的 current implementation truth
```

## Primary Development Flow

```text
Step 1: Confirm Behavior
└─ 先看 BDD.md
   └─ 這次要改哪個 actor、哪條 flow、哪個 acceptance

Step 2: Confirm Structure
└─ 再看 SDD.md
   └─ 這次該改 page、hook、type 還是 feature component

Step 3: Confirm Contract
└─ 對 code
   ├─ src/types/api.ts
   ├─ src/types/admin.ts
   └─ src/hooks/*

Step 4: Implement Minimum UI
└─ 再改 src/app/* 與 src/components/*

Step 5: Verify
└─ 依 TDD.md 跑最小驗證
   ├─ npm exec tsc -- --noEmit
   ├─ npm run build
   ├─ npm run lint
   └─ manual flow

Step 6: Sync Docs
└─ 行為或結構有變，就同步回寫文件
```

## Directory Rules

### src/app/*

只放：
- route entry
- page composition
- page-level local state

不要放：
- axios 細節
- 共用 DTO 轉換

### src/hooks/*

只放：
- request shaping
- API call
- unwrap response
- query invalidation

不要放：
- layout
- route variant 決策

### src/types/*

只放 contract。

規則：
- backend contract 一變，先改這裡
- 再改 hooks
- 最後改 screen

### src/components/*

只放 UI 與局部交互。

## Current Architecture Rules

```text
/:builderId
├─ generic_consult
│  └─ POST /api/consult
├─ astrology_profile
│  └─ POST /api/profile-consult
└─ line_task_extract
   └─ POST /api/line-task-consult
```

補充規則：
- `line-memo-crud` 不可退回 generic consult form。
- line task request 目前固定帶 `supportedTaskTypes=["calendar"]`。
- astrology profile 目前仍走固定 envelope。
- builder variant 目前優先依 builder identity 判斷，不是 backend `uiVariant`。

## Verification Baseline

目前 frontend 沒有接上 automated test runner。

所以日常驗證順序固定是：

```text
1. npm exec tsc -- --noEmit
2. npm run build
3. npm run lint
4. 手動驗主要 flow
```

主要手動 flow：
- sidebar builder discovery
- generic consult
- astrology profile
- line task extraction
- graph load/save
- template CRUD

## Sync Rules

### Backend contract changed

至少同步：

```text
backend contract changed
├─ src/types/*
├─ src/hooks/*
├─ 對應 page / component
├─ BDD.md
├─ SDD.md
├─ TDD.md
└─ CODE_REVIEW.md
```

### Builder variant changed

至少檢查：
- src/app/[builderId]/page.tsx
- src/hooks/useConsult.ts
- src/hooks/useProfileConsult.ts
- src/hooks/useLineTaskConsult.ts

### Admin graph contract changed

至少檢查：
- src/types/admin.ts
- src/hooks/useBuilderGraph.ts
- src/components/features/builder-graph/*

## Commands

```text
npm install
npm run dev
npm run build
npm run lint
npm exec tsc -- --noEmit
```
