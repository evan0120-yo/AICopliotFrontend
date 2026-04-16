# Internal AI Copilot Frontend BDD

## Scope

這份文件只描述目前 frontend 已落地的可觀察行為。

不寫：
- package 切法
- hook 實作細節
- 未落地 roadmap
- 測試工具選型

## Actors

- consult user
- admin user
- internal tester

## Scenario Group: Builder Discovery

```text
任一主要畫面載入
└─ Sidebar
   ├─ GET /api/builders
   ├─ loading -> skeleton
   ├─ error   -> error message
   └─ success -> builder cards
```

- Given app shell 已載入
  When builder list 成功返回
  Then sidebar 應顯示 builder cards

- Given builder list 仍在載入
  When sidebar render
  Then 應顯示 skeleton

- Given builder list 載入失敗
  When sidebar render
  Then 應顯示錯誤訊息

- Given mobile layout
  When 使用者點擊 hamburger
  Then sidebar 應透過 sheet 顯示

## Scenario Group: Builder Variant Resolution

```text
/:builderId
└─ resolve current builder
   ├─ builderCode = line-memo-crud
   │  -> line_task_extract
   ├─ builderId = 3
   │  -> astrology_profile
   ├─ builderCode = linkchat-astrology
   │  -> astrology_profile
   └─ else
      -> generic_consult
```

- Given 使用者進入 /:builderId
  When builder metadata 已可用
  Then 頁面應先 resolve variant 再 render screen

- Given current builder 的 builderCode 是 line-memo-crud
  When page render
  Then 應顯示 line task extraction screen

- Given current builder 的 builderId 是 3 或 builderCode 是 linkchat-astrology
  When page render
  Then 應顯示 astrology profile screen

- Given builder 不符合上述條件
  When page render
  Then 應顯示 generic consult screen

- Given builderId 無效或找不到對應 builder
  When page render
  Then 應顯示 invalid builder guard message

## Scenario Group: Generic Consult

```text
Generic consult
└─ text / files / outputFormat?
   └─ POST /api/consult
      ├─ success -> assistant bubble
      └─ error   -> pending user bubble 標成 error
```

- Given generic consult screen 已載入
  When current builder includeFile = true
  Then 應顯示 output format selector

- Given generic consult screen 已載入
  When current builder includeFile = false
  Then 不應顯示 output format selector

- Given 使用者輸入 text
  When submit form
  Then chat history 應先 append 一筆 pending user bubble
  And frontend 應呼叫 POST /api/consult

- Given generic consult submit 成功
  When backend 回傳 response
  Then 畫面應 append assistant bubble
  And assistant 內容應由 MarkdownBlock render

- Given generic consult submit 失敗
  When mutation 回傳 error
  Then 原 pending user bubble 應標成 error
  And 畫面應顯示 toast error

- Given 使用者沒有輸入 text
  When submit form
  Then user bubble 應顯示 未提供文字，使用 builder 預設內容。

- Given generic consult textarea 已聚焦
  When 使用者按 Enter
  Then form 應直接送出

- Given generic consult textarea 已聚焦
  When 使用者按 Shift+Enter
  Then textarea 應保留換行

- Given 使用者選取附件
  When 檔案超過數量、大小或副檔名限制
  Then form 應直接顯示 validation error
  And request 不應送出

## Scenario Group: Line Task Extraction

```text
Line task extract
└─ messageText + optional overrides
   └─ POST /api/line-task-consult
      ├─ success -> structured result card
      └─ error   -> submission card 標成 error
```

- Given line task extraction screen 已載入
  When 初始 render
  Then 應顯示 messageText 欄位
  And 應顯示 useCustomCurrentTime checkbox
  And appId 應為可選欄位
  And useCustomCurrentTime 預設應為未勾選

- Given useCustomCurrentTime 未勾選
  When submit
  Then request body 不應包含 referenceTime
  And request body 不應包含 timeZone

- Given useCustomCurrentTime 已勾選
  When render
  Then 畫面應顯示 referenceTime 與 timeZone 欄位

- Given line task form 已送出
  When frontend 呼叫 API
  Then request body 應包含 builderId
  And request body 應包含 messageText
  And request body 應包含 supportedTaskTypes=["calendar"]

- Given referenceTime 使用 datetime-local 輸入
  When submit
  Then frontend 送出的 referenceTime 應轉成 YYYY-MM-DD HH:mm:ss

- Given line task extraction submit 成功
  When backend 回傳 structured result
  Then 畫面應顯示 taskType
  And 畫面應顯示 operation
  And 畫面應顯示 summary
  And 畫面應顯示 startAt
  And 畫面應顯示 endAt
  And 畫面應顯示 location
  And 畫面應顯示 missingFields
  And 不應將結果畫成一般 markdown assistant bubble

- Given line task extraction submit 失敗
  When mutation 回傳 error
  Then 該次 submission card 應標成 error
  And 畫面應顯示 toast error

- Given line task textarea 已聚焦
  When 使用者按 Ctrl+Enter 或 Cmd+Enter
  Then form 應直接送出

## Scenario Group: Astrology Profile

```text
Astrology profile
├─ top config panel
├─ conversation area
└─ bottom composer
   └─ POST /api/profile-consult
```

- Given astrology profile screen 已載入
  When render
  Then 畫面不應再顯示 generic builder header
  And top config panel 應位於對話區上方
  And conversation area 應作為主要閱讀區
  And bottom composer 應固定在底部

- Given 每個星座 slot 預設為 single mode
  When render
  Then 應顯示單一 select
  And 應允許 unknown(default)
  And 右側應顯示 +混合

- Given 使用者切到 weighted mode
  When render
  Then 應顯示兩個 zodiac select
  And 應顯示兩個百分比欄位
  And 右側應顯示 -單一
  And 兩個 select 不應允許 unknown

- Given weighted mode 兩個 zodiac 相同
  When submit
  Then submit 不應通過
  And 畫面應顯示重複錯誤

- Given weighted mode 兩個百分比相加不等於 100
  When submit
  Then submit 不應通過
  And 畫面應顯示百分比錯誤

- Given single mode 的欄位值為 unknown(default)
  When submit
  Then 該 slot 不應出現在 payload

- Given astrology profile submit 成功
  When backend 回傳 ConsultBusinessResponse
  Then assistant 區塊應顯示 response
  And text composer 應回到預設分析句
  And 三個 slot state 應保留

- Given astrology profile submit 失敗
  When mutation 回傳 error
  Then pending user bubble 應標成 error
  And 畫面應顯示 toast error

- Given astrology composer 已聚焦
  When 使用者按 Ctrl+Enter 或 Cmd+Enter
  Then form 應直接送出

- Given astrology composer 已聚焦
  When 使用者按 Enter
  Then composer 應保留換行

- Given top config panel 為展開狀態
  When 使用者點擊收合
  Then top config panel 應收成 summary row
  And 既有 slot state 不應被清空

## Scenario Group: Builder Graph Editor

```text
/admin/builders/:builderId/graph
└─ GET graph
   ├─ responseToFormValues
   ├─ 編輯 builder / source / rag
   └─ PUT graph
```

- Given graph page 已載入
  When graph request 成功
  Then 畫面應顯示 builder info、sources、rags

- Given 使用者調整 source 順序
  When save
  Then frontend 應依畫面順序重建 source orderNo

- Given 使用者調整 rag 順序
  When save
  Then frontend 應依畫面順序重建 rag orderNo

- Given source 為 system block
  When source block render
  Then 該 block 應為唯讀
  And 不提供刪除、移動與一般編輯操作

- Given sourceType = fragment
  When prompts 為空
  Then form 不應因 prompts 為空而擋下

- Given sourceType != fragment 且 systemBlock = false
  When prompts 為空
  Then form 應顯示 prompts 必填

- Given backend graph response 含 moduleKey、sourceType、matchKey、tags、sourceIds
  When 載入後再儲存
  Then 這些欄位應保留並送回 backend

## Scenario Group: Template Library

```text
/admin/templates
└─ GET library
   ├─ create -> POST
   ├─ update -> PUT
   └─ delete -> DELETE
```

- Given template library page 已載入
  When request 成功
  Then templates 應依 orderNo、templateId 排序顯示

- Given 使用者建立 template
  When submit dialog
  Then frontend 應呼叫 POST /api/admin/templates

- Given 使用者更新 template
  When submit dialog
  Then frontend 應呼叫 PUT /api/admin/templates/{templateId}

- Given 使用者刪除 template
  When 使用者確認刪除
  Then frontend 應呼叫 DELETE /api/admin/templates/{templateId}

## Scenario Group: Current Verification Baseline

- Given 目前 repo 狀態
  When 檢視專案腳本與檔案
  Then 不應找到已接上的 automated frontend test runner
  And 目前驗證基線應為 tsc、build、lint 與 manual flow 驗證
