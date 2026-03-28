# Internal AI Copilot Frontend Plan

## AI Delivery Rule

以下規則在 AI 參與 frontend 專案規劃與實作時必須優先遵守：

1. 先釐清目前頁面與 API contract 的真相，再寫文件或改 UI。
2. 如果 backend 已改而 frontend 尚未接上，文件必須明確標示 current / gap，不得把 planned 寫成 current。
3. 前端文件與後端文件框架要一致，但粒度可依前端複雜度調整。

## BDD-First Strict Rule

本前端專案採 `BDD-first`。

意思是：

- 先定義畫面行為與 user flow，再討論 UI 實作
- `PLAN / DEVELOPMENT / SPEC / BDD / CODE_REVIEW` 必須基於同一套 current behavior
- 如果 code、文件、實際畫面不一致，視為缺陷

## Overview

這個 frontend 是 Internal AI Copilot 的 Web 介面，主要承接兩條線：

- **consult**：使用者選 builder，送出文字與附件，取得 AI 回應
- **admin**：管理員維護 builder graph 與 template library

目前的最高原則：

- consult 前台維持 generic consult 與 profile consult 並存
- admin graph editor 必須能穩定 round-trip backend graph metadata
- builder-driven 畫面分流要保持 request shape 與實際 screen 一致

目前分流方向：

- `/[builderId]` 不再假設所有 builder 都共用同一種 chat 表單
- 前端應允許依 builder 種類切換不同 interaction mode / screen variant
- `LinkChat` 這類 astrology profile builder 應採專用 profile form，而不是 generic text/file consult form

## Delivery Flow

```text
需求進入
   │
   ▼
Step 1: 定義 flow
   ├─ 哪一頁
   ├─ 哪個 actor
   └─ 成功 / 失敗條件
   │
   ▼
Step 2: 文件定稿
   ├─ PLAN
   ├─ DEVELOPMENT
   ├─ SPEC
   └─ BDD
   │
   ▼
Step 3: 對照 API / DTO
   ├─ src/types/*
   ├─ src/hooks/*
   └─ next rewrite
   │
   ▼
Step 4: 最小 UI 實作
   ├─ page
   ├─ component
   └─ form state
   │
   ▼
Step 5: 閉環
   ├─ tsc
   ├─ build / lint
   └─ 文件同步
```

## Behavior Scope

### Primary actors

- consult user：透過 chat 頁送出 builder consult
- admin user：維護 builder graph 與 templates
- AI collaboration agent：先對 code 真相，再補文件或改 UI

### Primary behaviors

- 可列出所有可用 builders
- 可進入單一 builder chat 頁並送出 consult
- 可編輯 builder graph
- 可從 template library 建立、更新、刪除 template
- 可在 graph editor 中套用 template 到 source

## Key Scenarios

### Scenario group: list builders

```text
任一主畫面載入
      │
      ▼
 Sidebar 呼叫 GET /api/builders
      │
      ├── success -> 顯示 builder cards
      ├── loading -> 顯示 skeleton
      └── error   -> 顯示錯誤訊息
```

### Scenario group: consult

```text
使用者進入 /:builderId
      │
      ▼
builder 資訊載入
      │
      ▼
輸入 text / files / outputFormat
      │
      ▼
POST /api/consult
      │
      ├── success -> 顯示 assistant response
      └── error   -> user bubble 標成 error
```

### Scenario group: builder-driven screen variant

```text
使用者進入 /:builderId
      │
      ▼
先載入 builder metadata
      │
      ▼
依 builder 種類 resolve screen variant
      │
      ├── generic_consult
      │      -> 現有 chat form
      │
      └── astrology_profile
             -> 星座 profile form
```

### Scenario group: astrology profile form

```text
AstrologyProfileScreen
      │
      ├── 固定三列
      │      sun / moon / rising
      │
      ├── 每列預設 single mode
      │      ├── 一個 select
      │      └── 可選 unknown(default)
      │
      ├── 點 +混合
      │      ├── 切到 weighted mode
      │      ├── 兩個 zodiac select
      │      ├── 兩個百分比欄位
      │      ├── 兩個 select 不可 unknown
      │      └── 總和必須 100
      │
      ├── 點 -單一
      │      └── 回到 single mode
      │
      └── submit
             -> POST /api/profile-consult
```

### Scenario group: builder graph

```text
管理員進入 /admin/builders/:builderId/graph
      │
      ▼
GET graph
      │
      ▼
responseToFormValues()
      │
      ▼
builder/source/rag 編輯
      │
      ▼
formValuesToRequest()
      │
      ▼
PUT graph
```

### Scenario group: templates

```text
管理員進入 /admin/templates
      │
      ▼
GET template library
      │
      ├── create -> POST /api/admin/templates
      ├── update -> PUT /api/admin/templates/:templateId
      └── delete -> DELETE /api/admin/templates/:templateId
```

## Current Runtime Boundaries

### Current

- consult chat 頁
- file upload
- astrology profile screen
- `/profile-consult` frontend submit
- builder graph editor
- template library
- builder-driven metadata round-trip
- metadata round-trip
  - `moduleKey`
  - `sourceType`
  - `matchKey`
  - `tags`
  - `sourceIds`

### Not Current

- create builder API
- graph metadata 完整可視化編輯器

## Frontend Structure

```text
src/app
  /                           首頁
  /[builderId]                consult chat
  /admin/builders/[builderId]/graph
                              builder graph editor
  /admin/builders/new/graph   新 builder 草稿頁
  /admin/templates            template library

src/hooks
  useBuilders
  useConsult
  useProfileConsult
  useBuilderGraph
  useTemplates

src/types
  api.ts
  admin.ts

src/components
  layout/sidebar.tsx
  features/markdown-block.tsx
  features/builder-graph/*
```

## Current UI Variant Baseline

### Generic consult

保留目前行為：

- textarea
- optional files
- optional output format
- `POST /api/consult`

### Astrology profile

這條線目前承接 builder `LinkChat` 這種 profile-analysis use case。

目前在 frontend 內部的 builder identity baseline 為：

```text
builderId = 3
builderCode = linkchat-astrology
```

固定欄位：

- 太陽
- 月亮
- 上升
- 底部自由 text

輸入快捷鍵：

- generic consult multiline input：`Enter` 送出，`Shift+Enter` 換行
- astrology profile multiline input：`Ctrl+Enter` / `Cmd+Enter` 送出，單純 `Enter` 換行

每個星座欄位都支援兩種模式：

```text
single mode
  -> 一個 select
  -> 可選 unknown(default)

weighted mode
  -> 兩個 zodiac select
  -> 兩個 weightPercent 欄位
  -> 兩個 select 不可 unknown
  -> 兩個 zodiac 不可重複
  -> 兩格總和必須 = 100
```

UX baseline：

- single mode 右側顯示 `+混合`
- weighted mode 右側顯示 `-單一`
- weighted mode 第二格百分比可由第一格自動互補
- 若切回 single mode，該列重設為 `unknown(default)`

payload baseline：

```json
{
  "appId": "linkchat",
  "builderId": 3,
  "subjectProfile": {
    "subjectId": "test-user-001",
    "analysisPayloads": [
      {
        "analysisType": "astrology",
        "payload": {
          "sun_sign": ["capricorn"],
          "moon_sign": ["pisces"],
          "rising_sign": [
            { "key": "aquarius", "weightPercent": 50 },
            { "key": "capricorn", "weightPercent": 50 }
          ]
        }
      }
    ]
  },
  "text": "..."
}
```

規則：

- `unknown(default)` 不應送到 payload 內
- single mode 且非 unknown：送 `["canonical_key"]`
- weighted mode：送 `[{key, weightPercent}, {key, weightPercent}]`
- `appId / subjectId / analysisType` 在第一版固定寫死
- `builderId` 仍使用當前 route 的 builder id

目前版型：

```text
Header
  -> builder title / description

Top Config Panel
  -> 太陽 / 月亮 / 上升
  -> 不再單行單行往下堆
  -> desktop 盡量以緊湊多欄呈現

Conversation Area
  -> 單獨捲動
  -> 只負責看 user / assistant 訊息

Bottom Composer
  -> 固定 text input
  -> 固定 submit action
```

目前版型原則：

- astrology profile 不應再讓大型設定表單直接擠壓對話區高度
- 中間聊天區應和其他 builder 一樣維持主要閱讀區角色
- 星座設定放在上方，desktop 優先以高密度多欄配置減少垂直浪費
- top config panel 與 bottom composer 不承擔主要訊息捲動；右側主捲動應只作用於 conversation area

## Admin Strategy

graph editor 的核心原則：

```text
畫面順序
  = source / rag 順序

metadata
  = 要能 load/save 保留

template
  = 可套用、可另存、可更新原範本
```

這代表 admin UI 的第一優先是：

- 不洗掉 backend graph
- 不打亂 source / rag 順序
- 不誤傷 system block

## Current Gaps To Watch

```text
frontend consult
  -> generic consult 與 astrology profile 已共存
  -> astrology variant 仍以 builder identity 分流，尚未有 backend uiVariant 欄位

frontend admin
  -> metadata preserved
  -> metadata editing incomplete

new builder
  -> draft page only

tests
  -> no automated test files
```
