# Internal AI Copilot Frontend Development Guide

## Primary Development Flow

```text
Step 1: Define Behavior First
先確認要改的是哪條 flow
  -> sidebar / builder discovery
  -> consult chat
  -> builder graph editor
  -> template library

          │
          ▼

Step 2: Confirm Contract Truth
先對 type / hook / endpoint
  -> src/types/api.ts
  -> src/types/admin.ts
  -> src/hooks/*
  -> next.config.ts

          │
          ▼

Step 3: Implement The Minimum UI
再改 page / component / form state
  -> src/app/*
  -> src/components/*

          │
          ▼

Step 4: Verify Frontend Loop
  -> npm exec tsc -- --noEmit
  -> npm run build
  -> npm run lint（視需要）
  -> 手動 flow 驗證

          │
          ▼

Step 5: Sync Docs After Change
行為變更要同步：
  -> PLAN.md
  -> SPEC.md
  -> BDD.md
  -> CODE_REVIEW.md
```

## Principle

- 先對 current code，再改文件
- 先對 API / DTO，再改 UI
- planned 行為不能寫進 current BDD
- frontend 文件框架跟 backend 一致，但粒度依前端現況維持單份 `SPEC.md` / `BDD.md`

## Project Commands

```text
npm install
npm run dev
npm run build
npm run lint
npm exec tsc -- --noEmit
```

## Environment

frontend 透過 Next rewrite 把 `/api/*` 轉發到 backend。

優先順序：

```text
INTERNAL_AI_COPILOT_BACKEND_ORIGIN
  -> REWARDBRIDGE_BACKEND_ORIGIN
     -> http://localhost:8082
```

如果前端資料看起來不對，先確認：

1. rewrite 實際指到哪個 backend
2. backend 是否已重啟到最新 code
3. backend seed / emulator 是否是最新資料

## Directory Responsibilities

### `src/app/*`

只放 route entry、page composition、主要使用者 flow。
不要把 API 細節或 DTO 轉換散落在 page 裡。

### `src/hooks/*`

只負責：

- 呼叫 API
- unwrap response
- query key / invalidation

不要把畫面規則與排版邏輯塞進 hooks。

### `src/types/api.ts`

放一般 consult / builder list DTO。

### `src/types/admin.ts`

放 graph / template DTO 與 form values。

### `src/components/features/*`

放 feature-specific UI。

### `src/components/layout/*`

放整體 layout 與 sidebar。

## Current Architecture Rules

## Consult Screens

```text
current runtime
/:builderId
├─ generic_consult
│  └─ useConsult() -> /api/consult
├─ astrology_profile
│  └─ useProfileConsult() -> /api/profile-consult
└─ line_task_extract
   └─ useLineTaskConsult() -> /api/line-task-consult
```

規則：
- Internal frontend 應視為 backend 測試入口，而不是只有 generic chat。
- `line-memo-crud` 不可套用 generic chat form。
- `line_task_extract` 應以 `builderCode` 作為主要 variant 判斷鍵，不應長期依賴固定 `builderId`。
- `line_task_extract` request 最少需帶：
  - `builderId`
  - `messageText`
  - `referenceTime`
  - `timeZone`
- `line_task_extract` response 應對齊：
  - `operation`
  - `summary`
  - `startAt`
  - `endAt`
  - `location`
  - `missingFields`

- `MarkdownBlock` 仍負責 generic/profile assistant content render 與 file download

## Builder Graph

- `BuilderGraphEditor` 是 graph editor orchestration root
- source / rag 順序由畫面順序決定
- save 前統一經過 `formValuesToRequest()`
- load 後統一經過 `responseToFormValues()`

## Template Library

- template CRUD 集中在 `useTemplates.ts`
- graph editor 內只做 template 套用 / 另存 / 更新原範本

## Sync Rules

當 backend contract 變動時，前端至少要同步：

```text
backend contract
  -> src/types/*
  -> src/hooks/*
  -> page / component
  -> SPEC.md
  -> BDD.md
  -> CODE_REVIEW.md
```

### If Builder Graph Contract Changes

至少檢查：

- `src/types/admin.ts`
- `responseToFormValues()`
- `formValuesToRequest()`
- `BuilderGraphEditor`
- `SourceBlock`
- `BuilderInfoSection`

### If Consult Contract Changes

至少檢查：

- `src/types/api.ts`
- `useConsult.ts`
- `useProfileConsult.ts`
- `useLineTaskConsult.ts`
- `src/app/[builderId]/page.tsx`
- `MarkdownBlock`

## Validation Rules

目前前端主要 validation 在 zod schema：

### Files

```text
最多 10 個
單檔 <= 20MB
總大小 <= 50MB
副檔名白名單限制
```

### Graph Source

```text
一般 source
  -> prompts 必填

fragment source
  -> prompts 可空

system block
  -> 不可經由一般 UI 編輯
```

## Verification Baseline

目前前端 repo 沒有 automated tests，所以前端閉環以這些為主：

```text
1. 型別檢查
   -> npm exec tsc -- --noEmit

2. 編譯檢查
   -> npm run build

3. 視需要做 lint
   -> npm run lint

4. 手動 flow 檢查
   -> sidebar
   -> consult submit
   -> graph load/save
   -> template CRUD
```

## Documentation Rules

frontend 現在固定維持這 5 份文件：

- `PLAN.md`
- `DEVELOPMENT.md`
- `SPEC.md`
- `BDD.md`
- `CODE_REVIEW.md`

目前刻意採：

```text
整個 frontend 共用一份 SPEC
整個 frontend 共用一份 BDD
```

先觀察這種粒度夠不夠，再決定後面要不要拆成 consult / admin。

## Current Limits

- `profile-consult` 尚未接到 frontend
- weighted-entry payload 尚未有專用 UI
- graph metadata 不是完整可編輯 UI
- `/admin/builders/new/graph` 仍是草稿模式
- 沒有 automated frontend tests
