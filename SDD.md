# Internal AI Copilot Frontend SDD

## Scope

這份文件只描述 frontend root 級結構、資料流與責任邊界。

不寫：
- 驗收情境
- bug 清單
- roadmap

## Runtime Shape

```text
internal-ai-copilot-frontend
├─ src/app
│  ├─ page.tsx
│  ├─ [builderId]/page.tsx
│  └─ admin/*
├─ src/hooks
│  ├─ useBuilders
│  ├─ useConsult
│  ├─ useProfileConsult
│  ├─ useLineTaskConsult
│  ├─ useBuilderGraph
│  └─ useTemplates
├─ src/types
│  ├─ api.ts
│  └─ admin.ts
└─ src/components
   ├─ layout/sidebar.tsx
   ├─ features/markdown-block.tsx
   └─ features/builder-graph/*
```

## Module Responsibilities

### src/app

```text
src/app
├─ route entry
├─ screen composition
└─ local UI state
```

責任：
- 決定目前 route 對應哪個 screen
- 組 page-level UI state
- 維持 builder-driven variant 分流

不負責：
- API transport 細節
- DTO unwrap
- query invalidation 規則

### src/hooks

```text
src/hooks
├─ request shaping
├─ API call
├─ response unwrap
└─ query invalidation
```

責任：
- 對 backend endpoint
- 組 request body / FormData
- 拿掉 API envelope

不負責：
- layout
- route 分流
- 複雜畫面狀態

### src/types

```text
src/types
├─ api.ts
│  └─ consult / profile / line task / builder DTO
└─ admin.ts
   └─ graph / template DTO 與 form values
```

責任：
- frontend 與 backend contract 的型別基線

### src/components

```text
src/components
├─ layout
│  └─ app shell, sidebar
├─ ui
│  └─ shared primitives
└─ features
   ├─ markdown-block
   └─ builder-graph
```

責任：
- feature UI
- visual composition
- 局部交互

## Main Data Flows

### A. Builder Discovery

```text
Sidebar
└─ useGetBuilders
   └─ GET /api/builders
      └─ BuilderSummary[]
```

邊界：
- builder list 是整個前端的共用導航基線
- consult 與 admin 都依賴同一份 builder list

### B. Builder Variant Resolution

```text
src/app/[builderId]/page.tsx
└─ useGetBuilders
   └─ resolveBuilderScreenVariant
      ├─ line-memo-crud       -> LineTaskExtractScreen
      ├─ linkchat-astrology   -> AstrologyProfileScreen
      └─ fallback             -> GenericConsultScreen
```

邊界：
- 目前 variant 仍由 frontend 自己判斷
- backend 尚未提供正式 uiVariant metadata

### C. Generic Consult

```text
GenericConsultScreen
└─ react-hook-form + zod
   └─ useConsult
      └─ POST /api/consult
         └─ MarkdownBlock render
```

邊界：
- 檔案限制先在前端擋
- assistant response 仍走 markdown render

### D. Astrology Profile

```text
AstrologyProfileScreen
├─ local slot state
├─ buildAstrologyPayload
└─ useProfileConsult
   └─ POST /api/profile-consult
```

目前 envelope：

```text
useProfileConsult
├─ appId        = linkchat
├─ subjectId    = test-user-001
└─ analysisType = astrology
```

邊界：
- 這三個值目前固定寫死在 hook
- frontend 只負責送 payload 與 text

### E. Line Task Extraction

```text
LineTaskExtractScreen
├─ react-hook-form + zod
├─ normalizeLineTaskReferenceTime
└─ useLineTaskConsult
   └─ POST /api/line-task-consult
```

目前 request shaping：

```text
useLineTaskConsult
├─ appId?            optional
├─ builderId         required
├─ messageText       required
├─ supportedTaskTypes=["calendar"]
├─ referenceTime?    override only
└─ timeZone?         override only
```

邊界：
- supportedTaskTypes 目前固定由 hook 補 `["calendar"]`
- 不由畫面讓使用者自由選 task type

### F. Builder Graph + Templates

```text
Graph editor
├─ useBuilderGraph
├─ responseToFormValues
├─ formValuesToRequest
└─ save back to /api/admin/builders/:builderId/graph

Template library
└─ useTemplates
   ├─ list
   ├─ create
   ├─ update
   └─ delete
```

邊界：
- graph editor 保留 backend metadata round-trip
- templates CRUD 集中在 useTemplates

## Dependency Direction

```text
route/page
└─ hooks
   └─ lib/api
      └─ backend

route/page
└─ components/features
   └─ components/ui

types
└─ 被 hooks / page / components 共用
```

規則：
- page 不直接組 axios request
- hooks 不承擔 layout 決策
- DTO 調整先改 types，再改 hooks 與 screen

## Current Constraints

```text
current constraints
├─ variant 仍是 frontend hardcoded mapping
├─ astrology envelope 仍有固定值
├─ graph metadata 以保留為主，不是完整可編輯 UI
└─ 尚未接上 automated frontend test runner
```
