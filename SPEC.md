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

frontend 目前只正式支援兩條線：

- 一般 consult chat
- admin graph / template 管理

frontend 目前**不在 scope** 內的能力：

- `profile-consult` UI
- weighted-entry profile payload editor
- create builder API

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

- `useProfileConsult()`
- `subjectProfile`
- `analysisPayloads`
- canonical key / weighted-entry profile submit
- 對 `responseDetail` 的消費

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
  -> only /consult
  -> no /profile-consult UI

frontend admin
  -> metadata preserved
  -> metadata editing incomplete

new builder
  -> draft page only

tests
  -> no automated frontend tests
```
