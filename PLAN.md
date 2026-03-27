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

- consult 前台先維持穩定支援 `/consult`
- admin graph editor 必須能穩定 round-trip backend graph metadata
- profile-analysis 相關能力若尚未接上，必須明確標示為 gap

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
- builder graph editor
- template library
- metadata round-trip
  - `moduleKey`
  - `sourceType`
  - `matchKey`
  - `tags`
  - `sourceIds`

### Not Current

- frontend `profile-consult`
- weighted-entry frontend payload 編輯
- canonical key profile form
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
  -> only /consult
  -> no /profile-consult

frontend admin
  -> metadata preserved
  -> metadata editing incomplete

new builder
  -> draft page only

tests
  -> no automated test files
```
