# Frontend BDD Spec

## Purpose

這份文件定義 frontend module 目前應滿足的行為規格。
內容只以現有 code 為基準；沒有被 code 支撐的設計，不應寫在這裡。

## Actors

- consult user：使用 builder chat 送出 consult
- admin user：編輯 graph / templates
- frontend app：負責畫面、表單、DTO 與 API hook 串接

## Scenario Group: Sidebar And Builder Discovery

```text
app shell
    │
    ▼
Sidebar
    │
    ├─ GET /api/builders
    ├─ loading -> skeleton
    ├─ error   -> error message
    └─ success -> builder cards
```

- Given app shell 已載入
  When `useGetBuilders()` 成功
  Then sidebar 應顯示 builder cards

- Given builders 正在載入
  When sidebar render
  Then 應顯示 skeleton

- Given builders 載入失敗
  When sidebar render
  Then 應顯示錯誤訊息

- Given 使用 mobile layout
  When 使用者點擊 hamburger
  Then sidebar 應透過 `Sheet` 顯示

## Scenario Group: Consult Chat

```text
/:builderId
    │
    ├─ 載入 builder 名片
    ├─ 使用者輸入 text / files
    ├─ POST /api/consult
    ├─ success -> assistant bubble
    └─ error   -> user bubble 標成 error
```

- Given `/:builderId` page 已開啟
  When builders 清單載入成功
  Then header 應顯示當前 builder 的 `groupLabel`、`name`、`description`

- Given URL 中的 `builderId` 無效
  When chat page render
  Then 應顯示 invalid builder guard message

- Given 使用者輸入 text
  When submit form
  Then chat history 應先 append 一筆 pending user bubble
  And `useConsult()` 應送出 `POST /api/consult`
  And success 後應 append assistant bubble

- Given 使用者沒有輸入 text
  When submit form
  Then user bubble 應顯示 `未提供文字，使用 builder 預設內容。`

- Given 當前 builder `includeFile = true`
  When chat page render
  Then 應顯示 output format selector

- Given 當前 builder `includeFile = false`
  When chat page render
  Then 不應顯示 output format selector

- Given consult request 失敗
  When mutation 回傳 error
  Then 原 pending user bubble 應被標成 error
  And 應顯示 toast error

- Given backend response 含 `response` 與 `file`
  When assistant bubble render
  Then 應由 `MarkdownBlock` 顯示 markdown
  And 應提供附件下載按鈕

- Given 使用者選取附件
  When 檔案超過數量 / 大小 / 副檔名限制
  Then form 應直接顯示 validation error

## Scenario Group: Builder Graph Editor

```text
/admin/builders/:builderId/graph
    │
    ├─ GET graph
    ├─ responseToFormValues()
    ├─ react-hook-form
    ├─ 編輯 builder / source / rag
    └─ PUT graph
```

- Given graph page 已開啟
  When `useBuilderGraph()` 成功
  Then 系統應將 response 轉成 form state
  And 顯示 builder info、sources、rags

- Given graph editor 已載入多個 source
  When 使用者調整 source 順序
  Then save 時應依畫面順序重建 `orderNo`

- Given source 內有多個 rag
  When 使用者調整 rag 順序
  Then save 時 rag `orderNo` 應依畫面順序送出

- Given source `systemBlock = false` 且 `sourceType != fragment`
  When `prompts` 為空
  Then form 應顯示 `Prompts 為必填`

- Given source `systemBlock = false` 且 `sourceType = fragment`
  When `prompts` 為空
  Then form 不應因為 prompts 為空而擋下

- Given source `systemBlock = true`
  When source block render
  Then 該 block 應為唯讀
  And 不提供刪除、移動與一般編輯操作

- Given backend graph response 含 `moduleKey`、`sourceType`、`matchKey`、`tags`、`sourceIds`
  When graph editor 載入後再儲存
  Then 這些欄位應透過 form state 保留並送回 backend

- Given source 有 `tags`
  When source block render
  Then 應顯示 `#tag` pills

## Scenario Group: New Builder Draft Page

```text
/admin/builders/new/graph
    │
    ├─ 使用 BuilderGraphEditor create mode
    └─ 儲存時只提示，不呼叫 create API
```

- Given 使用者進入 `/admin/builders/new/graph`
  When 點擊儲存
  Then 不應呼叫 create builder API
  And 應顯示「後端尚未提供建立 API」提示

## Scenario Group: Template Integration

```text
source
    ├─ 從範本新增
    ├─ 另存成範本
    ├─ 更新原範本
    └─ 另存新範本
```

- Given template picker 已開啟
  When 使用者選一個 template
  Then graph editor 應 append 一筆 source
  And 該 source 應帶入 template 的 prompts 與 rag

- Given source block 已有內容
  When 使用者選擇 `另存成範本`
  Then 應開啟 template form dialog
  And submit 後呼叫 `POST /api/admin/templates`

- Given source 綁定 `templateId`
  When 使用者選擇 `更新原範本`
  Then submit 後呼叫 `PUT /api/admin/templates/{templateId}`

- Given source 綁定既有範本
  When 使用者選擇 `另存新範本`
  Then template form 應去掉原 `templateId`
  And submit 後建立新 template

## Scenario Group: Template Library

```text
/admin/templates
    │
    ├─ GET library
    ├─ create
    ├─ update
    └─ delete
```

- Given template library 頁已開啟
  When `useTemplateLibrary()` 成功
  Then templates 應依 `orderNo`、`templateId` 排序顯示

- Given 使用者點擊新增 template
  When submit dialog
  Then 應呼叫 `POST /api/admin/templates`

- Given 使用者點擊編輯 template
  When submit dialog
  Then 應呼叫 `PUT /api/admin/templates/{templateId}`

- Given 使用者點擊刪除 template
  When 使用者確認刪除
  Then 應呼叫 `DELETE /api/admin/templates/{templateId}`

## Scenario Group: Current Testing Baseline

```text
frontend verification
    ├─ npm exec tsc -- --noEmit
    ├─ npm run build
    ├─ npm run lint
    └─ 手動 flow 驗證
```

- Given 目前專案狀態
  When 檢視 repo
  Then 不應找到 automated frontend test files
  And frontend 目前應以 type/build/lint + manual verification 為主
