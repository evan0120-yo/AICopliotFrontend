# Internal AI Copilot Frontend Tech Supplement

這份文件是 CODE_REVIEW.md 的技術補充（原 BLOCK 3）。
面向需要深入了解元件結構、hook 細節、常數定義的讀者。

> 快速導覽請看 CODE_REVIEW.md 的 BLOCK 1 / BLOCK 2。

---

## A. App shell / builder discovery

主要檔案：
- src/components/layout/sidebar.tsx
- src/hooks/useBuilders.ts
- src/types/api.ts

技術事實：

```text
Sidebar
└─ useGetBuilders
   └─ api.get('/builders')
      └─ ApiResponse<BuilderSummary[]>
```

## B. Variant resolution

主要檔案：
- src/app/[builderId]/page.tsx

目前常數：

```text
ASTROLOGY_BUILDER_ID   = 3
ASTROLOGY_BUILDER_CODE = linkchat-astrology
LINE_TASK_BUILDER_CODE = line-memo-crud
```

目前判斷順序：

```text
resolveBuilderScreenVariant
├─ builderCode = line-memo-crud
│  -> line_task_extract
├─ builderId = 3
│  -> astrology_profile
├─ builderCode = linkchat-astrology
│  -> astrology_profile
└─ else
   -> generic_consult
```

## C. Generic consult

主要檔案：
- src/app/[builderId]/page.tsx
- src/hooks/useConsult.ts

request 形狀：

```text
FormData
├─ builderId
├─ text?
├─ outputFormat?
└─ files*
```

前端固定檔案限制：

```text
max files      = 10
single file    = 20MB
total size     = 50MB
allowed ext    = pdf/doc/docx/jpg/jpeg/png/webp/gif/bmp
```

## D. Astrology profile

主要檔案：
- src/app/[builderId]/page.tsx
- src/hooks/useProfileConsult.ts
- src/types/api.ts

payload shaping：

```text
single + non-unknown
└─ ["canonical_key"]

weighted
└─ [{key, weightPercent}, {key, weightPercent}]

unknown
└─ omit
```

hook 固定 envelope：

```text
appId        = linkchat
subjectId    = test-user-001
analysisType = astrology
```

submit 成功後 current state：
- text reset 回預設分析句
- slots 保留
- chat history append assistant message

## E. Line task extraction

主要檔案：
- src/app/[builderId]/page.tsx
- src/hooks/useLineTaskConsult.ts
- src/types/api.ts

hook request shaping：

```text
requestBody
├─ appId?               trimmed optional
├─ builderId
├─ messageText
├─ supportedTaskTypes   ["calendar"]
├─ referenceTime?       only when non-empty
└─ timeZone?            only when non-empty
```

referenceTime normalize：

```text
datetime-local
└─ YYYY-MM-DD HH:mm:ss
```

response 目前直接顯示：
- taskType
- operation
- summary
- startAt
- endAt
- location
- missingFields

## F. Admin graph / templates

主要檔案：
- src/app/admin/builders/[builderId]/graph/page.tsx
- src/components/features/builder-graph/builder-graph-editor.tsx
- src/hooks/useBuilderGraph.ts
- src/hooks/useTemplates.ts
- src/types/admin.ts

current truth：

```text
graph editor
├─ load graph -> form values
├─ save graph -> request normalize
├─ source / rag orderNo 依畫面順序重建
└─ metadata 保留 round-trip

templates
├─ list
├─ create
├─ update
└─ delete
```

目前 `new builder` 頁仍只是草稿入口：
- 使用同一個 editor
- 沒有 create builder API

## G. 測試基線

主要檔案：
- package.json

目前 script：

```text
dev
build
start
lint
```

目前已接上第一批前端測試檔：
- src/features/builder-chat/logic.test.ts

目前 current verification 是：

```text
npm run test -- --run
npm exec tsc -- --noEmit
npm run build
npm run lint
manual flow
```

---

**文件版本**：v1.0
**最後更新**：2026-04-17
**作者**：Claude Sonnet 4.6
