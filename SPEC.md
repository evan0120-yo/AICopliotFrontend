# Frontend Spec

## Purpose

這份文件定義 frontend module 目前的責任、資料流與固定規則。
這是整個 frontend 共用的 `SPEC.md`，不做 module 拆分。

## Actors

- consult user：在 builder chat 頁送出 consult
- admin user：編輯 builder graph 與 template library
- frontend app：維護頁面狀態、form state、DTO 與 API hook
- Go backend：提供 builders / consult / graph / templates API

## Scope

frontend 目前只正式支援三條線：

- 一般 consult chat
- astrology profile consult
- admin graph / template 管理

frontend 目前**不在 scope** 內的能力：

- create builder API
- backend 驅動的 `interactionMode / uiVariant` metadata

## Routing Topology

```text
/
  -> 首頁與 sidebar 入口

/:builderId
  -> 單一 builder consult chat

/admin/builders/:builderId/graph
  -> builder graph editor

/admin/builders/new/graph
  -> 新 builder 草稿頁

/admin/templates
  -> template library
```

## Runtime Flow

```text
page
  -> hook
     -> src/lib/api.ts
        -> /api/*
        -> Next rewrite
        -> Go backend
```

## Global API Rules

### Axios Wrapper

`src/lib/api.ts`

- `baseURL = /api`
- `timeout = 600000`
- response interceptor 直接回 `response.data`
- 若 backend error payload 有 `error.message`，前端丟出該訊息
- 否則 fallback 為 `未知錯誤`

### Rewrite Rule

`next.config.ts`

```text
/api/:path*
  -> {BACKEND_ORIGIN}/api/:path*
```

環境變數優先順序：

```text
INTERNAL_AI_COPILOT_BACKEND_ORIGIN
  -> REWARDBRIDGE_BACKEND_ORIGIN
     -> http://localhost:8082
```

## Scenario Group: Sidebar And Builder Discovery

### Responsibility

- 載入 builder list
- 提供 consult 頁入口
- 提供 graph editor 與 template library 入口

### Data Source

- `useGetBuilders()`
- `GET /api/builders`

### UI Rules

```text
desktop
  -> 左側固定 sidebar

mobile
  -> hamburger
  -> Sheet 承接 sidebar
```

## Scenario Group: Consult Chat

### Entry

- `src/app/[builderId]/page.tsx`

### Request Contract

目前前端只送一般 consult contract：

```text
FormData
  builderId
  text?
  outputFormat?
  files*
```

### Hook

- `useConsult()`
- `POST /api/consult`

### File Validation

```text
最多 10 個檔案
單檔 <= 20MB
總大小 <= 50MB
副檔名白名單：
  pdf doc docx jpg jpeg png webp gif bmp
```

### Chat Rules

- submit 前先做 zod validation
- submit 後先 append pending user bubble
- success 後 append assistant bubble
- failure 時只把原 user bubble 標成 error
- multiline text input 以 `Enter` 送出
- `Shift+Enter` 保留換行

### Builder-Driven Rules

```text
builder.includeFile = true
  -> 顯示 output format selector

builder.includeFile = false
  -> 不顯示 output format selector
```

### Assistant Rendering

`MarkdownBlock`

- render markdown
- 支援 GFM table
- 支援 code highlight
- 若 response 含 `file`，提供下載按鈕

### Explicitly Not Supported

目前 chat 頁還沒有：

- 對 `responseDetail` 的消費

## Current Extension: Builder-Driven Screen Variant

### Responsibility

- 同一路由 `/:builderId` 先讀 builder metadata
- 再決定要 render generic consult screen 或 profile screen
- screen variant 不只影響畫面，也會影響 submit hook 與 request shape

### Baseline Structure

```text
BuilderEntryPage
  -> resolve current builder variant
  -> GenericConsultScreen
  -> AstrologyProfileScreen
```

### Variant Rules

```text
generic_consult
  -> useConsult()
  -> POST /api/consult

astrology_profile
  -> useProfileConsult()
  -> POST /api/profile-consult
```

目前使用 builder identity 做 variant resolve；
current baseline 為：

```text
builderId = 3
  -> astrology_profile

builderCode = linkchat-astrology
  -> astrology_profile
```

若 backend 日後補 `interactionMode` / `uiVariant`，frontend 應改由該欄位驅動。

## Current Extension: Astrology Profile Screen

### Responsibility

- 承接 astrology 專用 structured profile submit
- 將畫面欄位轉成 backend 已支援的 canonical key + weighted entry payload
- 不暴露 generic file upload / output format 行為

### Fixed Fields

```text
sun_sign
moon_sign
rising_sign
text
```

### Slot Modes

每個 slot 都支援兩種模式：

#### Single mode

- 一個 select
- 允許 `unknown(default)`
- 若為 `unknown`，submit 時不應送出該 slot

#### Weighted mode

- 兩個 zodiac select
- 兩個 weightPercent number input
- 兩個 select 都不允許 `unknown`
- 兩個 zodiac 不可重複
- `weightPercent` 必須是 `0~100`
- 總和必須 `=== 100`
- 第二格 weight 可由第一格自動互補

### Mode Toggle Rules

```text
single mode
  -> 顯示 +混合

weighted mode
  -> 顯示 -單一
```

- 由 single 切 weighted 時，應建立兩個預設不同 zodiac entries，百分比預設為 `50 / 50`
- 由 weighted 切 single 時，應重設該 slot 為 `unknown(default)`
- weighted mode 不應保留 unknown 值

### UI Contract

目前 astrology screen 採固定三段式：

```text
Header
  -> builder title / description

Top Config Panel
  -> sun / moon / rising
  -> desktop 優先多欄高密度排列
  -> weighted mode 只展開當前 slot 的第二組 select + weight

Conversation Area
  -> 只顯示 chat history / pending / empty state
  -> 為 astrology screen 唯一主要閱讀捲動區

Bottom Composer
  -> 固定 multiline text input
  -> 固定 submit button
```

各 slot 的最小畫面語意：

```text
標籤
  + single select / weighted dual select
  + weight inputs (weighted only)
  + toggle action
```

top config panel 應維持 compact 版面，不再採整頁大型單列表單作為主要輸入區。

### Submit Shortcut Rules

- multiline text input 以 `Ctrl+Enter` / `Cmd+Enter` 送出
- 單純 `Enter` 保留換行

### Payload Contract

固定 envelope：

```json
{
  "appId": "linkchat",
  "builderId": 3,
  "subjectProfile": {
    "subjectId": "test-user-001",
    "analysisPayloads": [
      {
        "analysisType": "astrology",
        "payload": {}
      }
    ]
  },
  "text": "..."
}
```

各 slot payload 規則：

- single + 非 unknown

```json
"sun_sign": ["capricorn"]
```

- weighted

```json
"sun_sign": [
  { "key": "capricorn", "weightPercent": 50 },
  { "key": "aquarius", "weightPercent": 50 }
]
```

- unknown(default)

```text
不送該 slot
```

### Select Option Rules

UI 可顯示中文名稱，但 submit 時必須轉成 canonical key：

```text
牡羊 -> aries
金牛 -> taurus
雙子 -> gemini
巨蟹 -> cancer
獅子 -> leo
處女 -> virgo
天秤 -> libra
天蠍 -> scorpio
射手 -> sagittarius
魔羯 -> capricorn
水瓶 -> aquarius
雙魚 -> pisces
```

## Scenario Group: Builder Graph Editor

### Entry

- `src/app/admin/builders/[builderId]/graph/page.tsx`

### Data Sources

- `GET /api/admin/builders/{builderId}/graph`
- `PUT /api/admin/builders/{builderId}/graph`
- `GET /api/admin/builders/{builderId}/templates`

### Orchestration Root

- `BuilderGraphEditor`

### Graph Flow

```text
GET graph
  -> BuilderGraphResponse
  -> responseToFormValues()
  -> react-hook-form
  -> builder/source/rag 編輯
  -> formValuesToRequest()
  -> PUT graph
```

### Builder Form Fields

```text
builderCode
groupKey
name
groupLabel
description
includeFile
defaultOutputFormat
filePrefix
active
```

### Source Form Fields

```text
sourceId?
systemBlock
templateId?
moduleKey?
sourceType?
matchKey?
tags?
sourceIds?
prompts
template metadata...
rag[]
```

### Validation Rules

```text
systemBlock = true
  -> 唯讀顯示

systemBlock = false 且 sourceType != fragment
  -> prompts 必填

systemBlock = false 且 sourceType = fragment
  -> prompts 可留空
```

### Ordering Rules

- source 順序 = 畫面順序 = save 時的 `orderNo`
- rag 順序 = 畫面順序 = save 時的 `orderNo`
- `Source #n` 只計算非 system block source

### Metadata Rules

frontend 現在會 round-trip 保留：

- `moduleKey`
- `sourceType`
- `matchKey`
- `tags`
- `sourceIds`

但目前 UI 層只明確露出：

- `tags`

也就是：

```text
metadata 已保留
  != metadata 已完整可編輯
```

## Scenario Group: New Builder Draft Page

### Entry

- `src/app/admin/builders/new/graph/page.tsx`

### Current Behavior

這頁沿用 `BuilderGraphEditor` 的 `isCreateMode`。

規則：

```text
可編輯 builder 草稿
可編輯 source / rag 草稿
可從範本新增 source
不可真正建立 builder
儲存只顯示後端尚未提供 API 的提示
```

## Scenario Group: Template Library

### Entry

- `src/app/admin/templates/page.tsx`

### Data Sources

- `GET /api/admin/templates`
- `POST /api/admin/templates`
- `PUT /api/admin/templates/{templateId}`
- `DELETE /api/admin/templates/{templateId}`

### UI Responsibilities

- 載入 template library
- 依 `orderNo` 再依 `templateId` 排序顯示
- 開啟 create / update dialog
- delete 前做確認

### Template Form Fields

```text
name
templateKey
groupKey
orderNo
description
prompts
active
rag[]
```

## Scenario Group: Template Integration Inside Graph Editor

### Supported Operations

- 從範本新增 source
- 另存成範本
- 更新原範本
- 另存新範本

### Metadata Preservation

被 template 套用後，source 會保留：

- `templateId`
- `templateKey`
- `templateName`
- `templateDescription`
- `templateGroupKey`

### Important Rule

```text
template 套入 source
  -> source 成為可編輯副本
  -> 不代表 source 被鎖死
  -> 若要回寫原範本，必須明確選「更新原範本」
```

## Hook Spec

### `useGetBuilders`

- query key: `['builders']`
- endpoint: `GET /api/builders`
- return: `BuilderSummary[]`

### `useConsult`

- mutation only
- endpoint: `POST /api/consult`
- payload: `FormData`
- return: `ConsultBusinessResponse`

### `useProfileConsult`

- mutation only
- endpoint: `POST /api/profile-consult`
- payload: JSON
- fixed envelope:
  - `appId=linkchat`
  - `subjectProfile.subjectId=test-user-001`
  - `analysisType=astrology`
- dynamic fields:
  - `builderId`
  - `sun_sign`
  - `moon_sign`
  - `rising_sign`
  - `text`
- return: `ConsultBusinessResponse`

### `useBuilderGraph`

- query key: `['builderGraph', builderId]`
- endpoint: `GET /api/admin/builders/{builderId}/graph`

### `useSaveBuilderGraph`

- endpoint: `PUT /api/admin/builders/{builderId}/graph`
- on success invalidate:
  - `['builderGraph', builderId]`

### `useBuilderTemplates`

- query key: `['builderTemplates', builderId]`
- endpoint: `GET /api/admin/builders/{builderId}/templates`

### `useTemplateLibrary`

- query key: `['templateLibrary']`
- endpoint: `GET /api/admin/templates`

### `useCreateTemplate`

- endpoint: `POST /api/admin/templates`
- on success invalidate:
  - `['templateLibrary']`
  - `['builderTemplates']`

### `useUpdateTemplate`

- endpoint: `PUT /api/admin/templates/{templateId}`
- on success invalidate:
  - `['templateLibrary']`
  - `['builderTemplates']`
  - `['builderGraph']`

### `useDeleteTemplate`

- endpoint: `DELETE /api/admin/templates/{templateId}`
- on success invalidate:
  - `['templateLibrary']`
  - `['builderTemplates']`
  - `['builderGraph']`

## Current Gaps

```text
frontend consult
  -> generic chat 與 astrology profile 已共存
  -> variant resolve 仍依 builder identity，不是 backend metadata

frontend admin
  -> metadata preserved
  -> metadata editing incomplete

new builder
  -> draft page only

tests
  -> no automated frontend tests
```
