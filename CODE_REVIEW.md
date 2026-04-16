# Internal AI Copilot Frontend Code Review

---

# BLOCK 1: AI 對產品的想像

這個 frontend 現在不是單純 chat 頁，而是 Internal AI Copilot 的測試操作殼。

它同時承接兩種事情：
- builder-driven consult 測試
- admin graph / template 維護

如果只從首頁看，會以為它是聊天介面；但讀完 code 後更像是：

```text
一個 internal testing console
├─ generic consult
├─ astrology profile consult
├─ line task extraction
└─ admin graph / templates
```

它的主要使用者現在不是一般終端客戶，而是：
- internal tester
- prompt / builder 維護者
- admin 操作者

從 code 看得出的刻意選擇：
- `/:builderId` 已經改成 builder-driven screen，而不是永遠同一種 form。
- Line task extraction 不重用 generic `/api/consult`，而是自己的 request shape。
- astrology profile 也不是 generic form 上多幾個欄位，而是獨立 screen。
- admin graph 與 template library 已經比 consult 端更接近工具型 UI。

它目前不是：
- 不是真正 metadata-driven UI 平台。
- 不是完整多輪聊天產品。
- 不是已經有自動化前端測試保護的成熟 console。

---

# BLOCK 2: 讀者模式

## A. 整個前端怎麼被 builder list 帶動

這個專案最像產品骨架的地方不是 chat input，而是 sidebar builder list。

```text
任一頁面
└─ Sidebar
   └─ GET /api/builders
      ├─ loading -> skeleton
      ├─ error   -> 錯誤訊息
      └─ success -> builder cards
```

這份 builder list 同時服務：
- consult route
- admin graph route
- template library navigation

> 注意:
> 這表示 frontend 的中心其實是 builder，不是 chat session。

## B. `/:builderId` 現在會先分 screen，再談送哪種 request

當使用者進入 `/:builderId`，頁面不會直接顯示單一固定表單。
它會先看目前 builder 是誰，再決定要渲染哪種 screen。

```text
進入 /:builderId
└─ useGetBuilders
   └─ 找 current builder
      └─ resolveBuilderScreenVariant
         ├─ line-memo-crud      -> LineTaskExtractScreen
         ├─ linkchat-astrology  -> AstrologyProfileScreen
         └─ fallback            -> GenericConsultScreen
```

這裡目前還是 frontend 自己硬編碼判斷：
- `builderCode = line-memo-crud`
- `builderId = 3`
- `builderCode = linkchat-astrology`

> 注意:
> backend 目前沒有正式回 `uiVariant`。現在的 variant truth 還在 frontend。

## C. Generic consult 仍是最穩定的共用路徑

generic screen 仍維持最傳統的模式：
- text
- optional files
- optional output format
- `/api/consult`

```text
GenericConsultScreen
└─ react-hook-form + zod
   └─ useConsult
      └─ POST /api/consult
         ├─ success -> assistant bubble
         └─ error   -> 原 user bubble 標成 error
```

使用者體感上就是：
- Enter 直接送
- Shift+Enter 換行
- 檔案不合法就先在前端擋
- assistant 回應統一交給 `MarkdownBlock`

> 注意:
> 這條線雖然是 generic，但現在已經不是整個產品的唯一主路。

## D. Astrology profile 已經是獨立 screen，不再是假裝 generic chat

astrology screen 的畫面結構很清楚：

```text
AstrologyProfileScreen
├─ top config panel
├─ conversation area
└─ bottom composer
```

它現在的重點不是把表單塞滿整個頁面，而是把責任拆開：
- 上面調 profile
- 中間看對話
- 下面送需求

每個 slot 都支援：

```text
single mode
└─ 一個 select

weighted mode
├─ 兩個 zodiac select
└─ 兩個 weightPercent
```

而且很多規則已經先在前端擋：
- 兩個星座不能重複
- 百分比總和必須 100
- `unknown` 不會送進 payload

送出時，frontend 其實不是把所有 envelope 都交給畫面決定。
`useProfileConsult` 會自己補固定值：
- `appId = linkchat`
- `subjectId = test-user-001`
- `analysisType = astrology`

```text
AstrologyProfileScreen
└─ buildAstrologyPayload
   └─ useProfileConsult
      └─ POST /api/profile-consult
```

> 注意:
> 這條線現在是 internal 測試入口，不是對外可配置版。
> appId / subjectId / analysisType 都還是 hook 內固定值。

## E. Line task extraction 也是獨立 screen，而且 contract 很刻意

line task extraction 現在不是 generic chat 冒充的。
它有自己的 form、自己的快捷鍵、自己的 structured result 呈現。

```text
LineTaskExtractScreen
├─ messageText
├─ optional appId
├─ useCustomCurrentTime
├─ referenceTime?
├─ timeZone?
└─ useLineTaskConsult
   └─ POST /api/line-task-consult
```

這條線最重要的 current truth 有兩個：

1. `supportedTaskTypes` 現在由 hook 固定補 `["calendar"]`
2. `referenceTime` 只有在 debug override 模式才送

畫面上也沒有把 response 畫成一般聊天氣泡，而是直接畫 structured result。

> 注意:
> 這條線現在是 testing console 的 extraction 入口，不是正式 LineBot transport。

## F. Admin graph / templates 現在是另一條成熟度更高的工具線

admin 端的核心是 graph editor 與 template library。

```text
Graph editor
└─ GET graph
   └─ responseToFormValues
      └─ 編輯後 PUT graph

Template library
└─ list / create / update / delete
```

graph editor 的核心目標不是把所有 backend metadata 都做成完整 UI，
而是先確保：
- load 得進來
- save 不洗掉資料
- source / rag 順序能 round-trip

template library 則已經是比較完整的 CRUD。

> 注意:
> graph metadata 目前仍偏向「保留並 round-trip」，不是 fully editable UI。

## G. 現在最大的限制

```text
current limits
├─ variant 仍是 frontend hardcoded
├─ astrology consult envelope 有固定值
├─ graph metadata editing 不完整
└─ 沒有 automated frontend tests
```

這四件事是目前最容易讓人誤判成熟度的地方。

---

# BLOCK 3: 技術補充

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

目前 repo 內沒有已接上的前端測試檔。
所以 current verification 仍是：

```text
npm exec tsc -- --noEmit
npm run build
npm run lint
manual flow
```
