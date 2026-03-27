# Frontend Code Review

---

# ═══════════════════════════════════════════════
# BLOCK 1: AI 對產品的想像
# ═══════════════════════════════════════════════

這個 frontend 現在比較像一個**內部 AI builder 平台的操作殼**，不是單一聊天頁。

它承接兩種不同層級的工作：

- 一般使用者的 consult / profile consult
- 管理員的 builder graph 與 template library 維護

如果只看使用者畫面，它看起來像一個 chat 產品；但實際上目前還是**單次請求累積成聊天氣泡**，不是完整多輪會話系統。

我現在對這個產品的理解是：

- 它要讓不同 builder 共用同一個前端入口
- 但不同 builder 可以逐步長出不同互動形式
- admin 端比 consult 端成熟，因為 graph / template 工具已經比前台更完整

它不是：

- 純 generic chat UI
- 完整的 profile-analysis 平台
- 已經 fully metadata-driven 的前端

目前 `/:builderId` 已經不是永遠固定同一種表單，而是開始進入 **builder-driven screen variant** 階段；但分流依據還是硬編碼的 builder identity，不是 backend 正式回傳的 `uiVariant`。

---

# ═══════════════════════════════════════════════
# BLOCK 2: 讀者模式
# ═══════════════════════════════════════════════

## A. App Shell 與 Builder Discovery

這個前端的共同入口是左側 `Sidebar`。不管你在哪一頁，真正驅動整個產品導航的，都是 builder 清單。

```text
任一頁面載入
    │
    ▼
Sidebar
    │
    ├── GET /api/builders
    ├── loading -> skeleton
    ├── error   -> 錯誤文案
    └── success -> builder cards
```

使用者能從這裡做 3 件事：

- 進入 `/:builderId`
- 進入 `/admin/builders/:builderId/graph`
- 進入 `/admin/templates` 或 `/admin/builders/new/graph`

> 注意:
> 這份 builder list 同時服務 consult 頁與 admin 入口，所以前端其實是以「builder 為中心」在跑，不是以 chat 為中心。

---

## B. `/:builderId` 不再只有一種畫面

現在 `/:builderId` 這條 route，會先 resolve 當前 builder，然後再決定要 render 哪種 screen。

```text
使用者進入 /:builderId
    │
    ▼
載入 builder list
    │
    ▼
找出 current builder
    │
    ▼
resolveBuilderScreenVariant()
    │
    ├── generic_consult
    │      -> GenericConsultScreen
    │
    └── astrology_profile
           -> AstrologyProfileScreen
```

目前的分流基準很直接：

- `builderId = 3`
- 或 `builderCode = linkchat-astrology`

只要符合其中一個，就進 astrology profile 畫面。

> 注意:
> 這是 current runtime truth，不是 backend metadata 驅動。
> 也就是說，前端目前**自己知道**誰是 astrology builder，還沒有等 backend 給正式 `uiVariant`。

---

## C. Generic Consult Screen

generic builder 仍走舊的 consult 流程。它的定位沒有變：輸入文字、可選檔案、必要時選 output format，然後打一筆 `/consult`。

```text
GenericConsultScreen
    │
    ├── text
    ├── files
    ├── outputFormat? (only when includeFile=true)
    └── POST /api/consult
```

### 送出時怎麼跑

```text
使用者輸入文字 / 選檔
    │
    ▼
react-hook-form + zod
    │
    ├── 檔案不合法 -> 前端直接擋下
    └── 通過
         │
         ▼
      useConsult()
         │
         ▼
      FormData
         │
         ▼
      POST /api/consult
         │
         ├── success -> assistant bubble
         └── error   -> 原 user bubble 標成 error
```

generic consult 的一些前端行為是固定的：

- `Enter` 直接送出
- `Shift+Enter` 換行
- `includeFile=true` 才顯示 output format selector
- 沒填 text 也能送，user bubble 會顯示「未提供文字，使用 builder 預設內容。」

assistant 回應則統一交給 `MarkdownBlock` render。

> 注意:
> generic consult 仍然是前端最穩定的一條線。
> 如果某個 builder 沒被切到 astrology profile，它就一定走這條。

---

## D. Astrology Profile Screen

這是目前 `/:builderId` 上最大的新增能力。它不是 generic chat 加幾個欄位，而是一個新的 screen 變體。

```text
AstrologyProfileScreen
    │
    ├── sun_sign
    ├── moon_sign
    ├── rising_sign
    ├── text
    └── POST /api/profile-consult
```

### 畫面怎麼長

固定三列：

- 太陽
- 月亮
- 上升

每列都支援兩種模式：

```text
single mode
  -> 一個 select
  -> 可選 不知道(default)
  -> 右側顯示 +混合

weighted mode
  -> 兩個 zodiac select
  -> 兩個百分比輸入框
  -> 不可選 unknown
  -> 不可選相同星座
  -> 右側顯示 -單一
```

### 權重規則

weighted mode 的規則不是 backend 才檢查，前端自己就先擋：

- 兩個星座不可重複
- 百分比必須是 `0~100`
- 兩格總和必須 `100`
- 改第一格時，第二格會自動互補

例如：

```text
魔羯 50 / 水瓶 50
```

會被組成：

```json
[
  { "key": "capricorn", "weightPercent": 50 },
  { "key": "aquarius", "weightPercent": 50 }
]
```

### unknown 怎麼處理

single mode 的 `不知道` 不會送成 `"unknown"` 到 backend。

它的意思是：

```text
該 slot 直接不送
```

所以如果只知道太陽魔羯、月亮雙魚，不知道上升，送出的 payload 就只會有：

- `sun_sign`
- `moon_sign`

不會帶 `rising_sign`。

### 送出時怎麼跑

```text
使用者調整太陽 / 月亮 / 上升
    │
    ├── 某列有錯
    │      -> toast: 請先修正星座設定
    │
    └── 全部合法
         │
         ▼
      buildAstrologyPayload()
         │
         ▼
      useProfileConsult()
         │
         ▼
      POST /api/profile-consult
```

這條線目前有幾個刻意寫死的地方：

- `appId = linkchat`
- `subjectId = test-user-001`
- `analysisType = astrology`

畫面上只有：

- 三個 slot
- 一個 text

其他 envelope 由 hook 固定補上。

### 送出快捷鍵

這條線和 generic consult 不一樣：

- `Ctrl+Enter` / `Cmd+Enter` 送出
- 單純 `Enter` 保留換行

這是合理設計，因為 astrology profile 的最下方 input 是比較明顯的 multiline 補充區，不適合跟 generic chat 共用 `Enter` 直接送出的手感。

> 注意:
> 送出成功後只會清掉 `text`，三個星座欄位會保留。
> 這代表目前 UX 偏向「微調後重送」，不是「每次送完重置整個 profile」。

---

## E. Builder Graph Editor

admin 端的主力仍然是 graph editor。這頁的本質不是單一表單，而是把 builder / source / rag 全部映射到同一個 form tree 內。

```text
進入 graph page
    │
    ▼
GET /api/admin/builders/:builderId/graph
    │
    ▼
responseToFormValues()
    │
    ▼
react-hook-form
    │
    ├── BuilderInfoSection
    ├── SourceBlock[]
    └── RagItem[]
         │
         ▼
PUT /api/admin/builders/:builderId/graph
```

這頁現在已經能做到兩件重要的事：

1. 按畫面順序重建 `orderNo`
2. round-trip 保留 backend metadata

目前會被保留的 metadata 包括：

- `moduleKey`
- `sourceType`
- `matchKey`
- `tags`
- `sourceIds`

但這裡要分清楚：

```text
有 round-trip
!=
有完整編輯 UI
```

現在只有 `tags` 明確顯示成 `#tag` pills。  
其餘 metadata 主要是保存在 form state 裡，不會因為前端 save 一次就被洗掉，但管理員也還不能完整從畫面上直接編輯它們。

> 注意:
> `fragment` source 可允許空 `prompts`，這是現在 graph editor 針對 composable source graph 的重要例外。

---

## F. Template Library 與 New Builder 草稿頁

### Template Library

`/admin/templates` 目前是完整可用的 CRUD 頁面：

```text
GET /api/admin/templates
    ├── create -> POST
    ├── update -> PUT
    └── delete -> DELETE
```

列表顯示會先按：

- `orderNo`
- 再按 `templateId`

排序。

template dialog 送出時，會把 `rag` 陣列重新整理成 backend 需要的 request shape，並固定補 `retrievalMode = full_context`。

### New Builder 草稿頁

`/admin/builders/new/graph` 現在仍然只是草稿頁。它做的是：

- render 同一個 `BuilderGraphEditor`
- 開 `isCreateMode`

但按儲存時不會真的建立 builder。畫面只會提示：

- 後端尚未提供建立 API

所以這頁現在的定位很單純：

**可以先排 builder 草稿，但還不能正式建立。**

---

# ═══════════════════════════════════════════════
# BLOCK 3: 技術補充
# ═══════════════════════════════════════════════

## A. App Shell 與 Builder Discovery

### 主要 entry

- [`src/app/page.tsx`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/app/page.tsx)
- [`src/components/layout/sidebar.tsx`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/components/layout/sidebar.tsx)
- [`src/hooks/useBuilders.ts`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/hooks/useBuilders.ts)

### API chain

```text
Sidebar
  -> useGetBuilders()
  -> api.get('/builders')
  -> ApiResponse<BuilderSummary[]>
```

### BuilderSummary 目前重要欄位

- `builderId`
- `builderCode`
- `groupLabel`
- `name`
- `description`
- `includeFile`
- `defaultOutputFormat?`

---

## B. `/:builderId` screen variant

### 主要 entry

- [`src/app/[builderId]/page.tsx`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/app/[builderId]/page.tsx)

### 目前 runtime resolve

```ts
const ASTROLOGY_BUILDER_ID = 3;
const ASTROLOGY_BUILDER_CODE = 'linkchat-astrology';
```

```text
resolveBuilderScreenVariant(builderId, currentBuilder)
  ├── builderId === 3
  │      -> astrology_profile
  ├── currentBuilder?.builderCode === 'linkchat-astrology'
  │      -> astrology_profile
  └── else
         -> generic_consult
```

### 已知限制

前端現在不是看 backend `interactionMode / uiVariant`。  
所以如果未來 builder identity 改掉，前端也要一起改這個 mapping。

---

## C. Generic Consult Screen

### 主要 call chain

```text
GenericConsultScreen
  -> react-hook-form + zodResolver(formSchema)
  -> useConsult()
  -> api.post('/consult', FormData)
```

### `useConsult`

- [`src/hooks/useConsult.ts`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/hooks/useConsult.ts)

會送出的 `FormData` 欄位：

- `builderId`
- `text?`
- `outputFormat?`
- `files*`

### 檔案規則

在 [`src/app/[builderId]/page.tsx`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/app/[builderId]/page.tsx) 內固定：

- 最多 `10` 個檔案
- 單檔 `20MB`
- 總大小 `50MB`
- 白名單副檔名：
  - `pdf`
  - `doc`
  - `docx`
  - `jpg`
  - `jpeg`
  - `png`
  - `webp`
  - `gif`
  - `bmp`

### 鍵盤規則

generic consult 的 textarea：

- `Enter` submit
- `Shift+Enter` newline

---

## D. Astrology Profile Screen

### 主要 call chain

```text
AstrologyProfileScreen
  -> local slot state
  -> buildAstrologySlotErrors()
  -> buildAstrologyPayload()
  -> useProfileConsult()
  -> api.post('/profile-consult', JSON)
```

### 重要型別

在 [`src/types/api.ts`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/types/api.ts)：

- `ZodiacKey`
- `WeightedZodiacEntry`
- `ProfileConsultRequestData`

其中 `WeightedZodiacEntry` 現在是：

```ts
{
  key: ZodiacKey;
  weightPercent: number;
}
```

不是 optional。

### hook 實作

- [`src/hooks/useProfileConsult.ts`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/hooks/useProfileConsult.ts)

目前固定值：

- `appId = linkchat`
- `subjectId = test-user-001`
- `analysisType = astrology`

動態值：

- `builderId`
- `payload`
- `text`

### payload 規則

`buildAstrologyPayload()` 目前會產生：

- single + non-unknown -> `string[]`
- weighted -> `WeightedZodiacEntry[]`
- unknown -> omit

也就是：

```text
unknown 不會出現在 request body 裡
```

### 鍵盤規則

astrology textarea：

- `Ctrl+Enter` / `Cmd+Enter` submit
- plain `Enter` newline

### 成功後狀態

submit success 後：

- `text` 會清空
- `slots` 保留
- chat history append assistant message

這是 deliberate UX，不是 reset-all。

---

## E. Builder Graph Editor

### 主要 entry

- [`src/app/admin/builders/[builderId]/graph/page.tsx`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/app/admin/builders/[builderId]/graph/page.tsx)
- [`src/components/features/builder-graph/builder-graph-editor.tsx`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/components/features/builder-graph/builder-graph-editor.tsx)
- [`src/hooks/useBuilderGraph.ts`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/hooks/useBuilderGraph.ts)

### graph API chain

```text
useBuilderGraph(builderId)
  -> GET /api/admin/builders/:builderId/graph

useSaveBuilderGraph(builderId)
  -> PUT /api/admin/builders/:builderId/graph
  -> invalidate ['builderGraph', builderId]
```

### template list in graph

```text
useBuilderTemplates(builderId)
  -> GET /api/admin/builders/:builderId/templates
```

### 目前 graph editor 的 current truth

- `systemBlock=true` source 會只讀
- 非 `fragment` source 的 `prompts` 必填
- `fragment` source 可空
- save 時會按畫面順序重建 source / rag 的 `orderNo`
- `tags` 會在 source block 內顯示
- `moduleKey / sourceType / matchKey / sourceIds` 現在主要是保留並 round-trip，不是完整可編輯

---

## F. Template Library 與 New Builder 草稿頁

### Template Library hooks

- [`src/hooks/useTemplates.ts`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/hooks/useTemplates.ts)

目前有：

- `useTemplateLibrary`
- `useCreateTemplate`
- `useUpdateTemplate`
- `useDeleteTemplate`

query invalidation 會打：

- `['templateLibrary']`
- `['builderTemplates']`
- `['builderGraph']`（update / delete 時）

### New Builder page

- [`src/app/admin/builders/new/graph/page.tsx`](d:/WorkSpace/ProjectAI/InternalAICopliot/Frontend/internal-ai-copilot-frontend/src/app/admin/builders/new/graph/page.tsx)

目前只是：

```ts
<BuilderGraphEditor builderId={Number.NaN} builderIdParam="new" isCreateMode />
```

所以 create mode 的核心真相是：

- 用同一個 editor
- 沒有 create API
- 只能當草稿頁

---

## 現在最大的 gap

### 1. screen variant 仍不是 backend 驅動

現在已經有 variant 概念，但 resolve 還是靠：

- `builderId`
- `builderCode`

不是正式 metadata。

### 2. astrology profile envelope 還是固定值

現在 `appId / subjectId / analysisType` 都寫死。
它比較像 Internal 模擬入口，不是完整對外整合版。

### 3. graph metadata editing 還不完整

metadata 沒被洗掉，但也還沒 fully exposed。

### 4. 沒有 automated frontend tests

目前仍是：

- `tsc`
- `lint`
- `build`
- manual flow

這讓 frontend 很容易在 contract 快速演進時跟 backend 漂掉。
