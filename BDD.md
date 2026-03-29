# Frontend BDD Spec

## Purpose

這份文件定義 frontend module 目前應滿足的行為規格。
內容只以現有 code 為基準；沒有被 code 支撐的設計，不應寫在這裡。

尚未落地、但已先定義好的畫面規劃，應放在 `Planned Scenario Group`，不得和 current scenario 混寫。

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

- Given 使用者位於 generic consult multiline input
  When 按下 `Enter`
  Then form 應直接送出
  And `Shift+Enter` 應保留換行

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

## Scenario Group: Builder-Driven Screen Variant

```text
/:builderId
    │
    ├─ 先載入 builder list
    ├─ resolve current builder
    ├─ resolve UI variant
    ├─ generic_consult    -> GenericConsultScreen
    └─ astrology_profile  -> AstrologyProfileScreen
```

- Given 使用者進入 `/:builderId`
  When builder metadata 載入成功
  Then 頁面應先 resolve 當前 builder 對應的 screen variant

- Given 當前 builder identity 為 `builderId=3` 或 `builderCode=linkchat-astrology`
  When page resolve variant
  Then 應進入 `astrology_profile`

- Given 當前 builder 被判定為 generic consult
  When page render
  Then 應顯示現有 chat form

- Given 當前 builder 被判定為 astrology profile
  When page render
  Then 不應顯示 generic file upload / output format form
  And 應顯示 astrology profile form

## Scenario Group: Astrology Profile Screen

```text
AstrologyProfileScreen
    │
    ├─ sun
    ├─ moon
    ├─ rising
    ├─ text
    └─ POST /api/profile-consult
```

- Given astrology profile screen 已載入
  When render
  Then 不應額外顯示 builder title / description header
  And top config panel 應位於右側內容區最上方
  And config panel 內應固定包含 `sun`、`moon`、`rising`
  And config panel header 應顯示收合 / 展開入口
  And 中間 conversation area 只顯示對話內容
  And 最下方應固定顯示 multiline text composer
  And multiline text composer 預設值應為 `請分析這個人的核心性格與外在社交表現。`

- Given 某一列為 single mode
  When render
  Then 應只顯示一個 select
  And 該 select 應允許 `unknown(default)`
  And 右側應顯示 `+混合`

- Given 某一列點擊 `+混合`
  When 切到 weighted mode
  Then 應顯示兩個 zodiac select
  And 應顯示兩個數字框
  And 右側應顯示 `-單一`
  And 兩個 select 都不應有 `unknown(default)`
  And 兩個星座與百分比應先帶入可送出的預設值

- Given 某一列為 weighted mode
  When 第一個百分比輸入 `50`
  Then 第二個百分比應可自動互補為 `50`

- Given 某一列為 weighted mode
  When 兩個數字相加不等於 `100`
  Then 畫面應直接顯示等價錯誤提示
  And submit 不應通過

- Given 某一列為 weighted mode
  When 兩個 zodiac 相同
  Then 畫面應直接顯示重複錯誤
  And submit 不應通過

- Given 某一列點擊 `-單一`
  When 回到 single mode
  Then 該列應重設為 `unknown(default)`
  And 不應保留 weighted mode 的百分比欄位

- Given `sun=魔羯` single、`moon=雙魚` single、`rising=unknown`
  When submit
  Then frontend 應送出：
  ```json
  {
    "payload": {
      "sun_sign": ["capricorn"],
      "moon_sign": ["pisces"]
    }
  }
  ```
  And 不應送出 `rising_sign`

- Given `sun=魔羯50 / 水瓶50`
  When submit
  Then frontend 應送出：
  ```json
  {
    "payload": {
      "sun_sign": [
        { "key": "capricorn", "weightPercent": 50 },
        { "key": "aquarius", "weightPercent": 50 }
      ]
    }
  }
  ```

- Given astrology profile screen submit 成功
  When backend 回傳 `ConsultBusinessResponse`
  Then assistant 區塊應顯示 response 內容
  And 失敗時應顯示對應 toast / inline error
  And multiline text composer 應回到預設分析句

- Given 使用者位於 astrology profile 的 multiline text input
  When 按下 `Ctrl+Enter` 或 `Cmd+Enter`
  Then astrology profile form 應直接送出
  And 單純 `Enter` 應保留換行

- Given desktop layout
  When astrology config panel render
  Then 太陽 / 月亮 / 上升應優先以高密度多欄排列
  And 不應預設以整頁大型單列表單佔用主要閱讀區高度

- Given mobile layout
  When astrology config panel render
  Then 可退回單欄排列
  And 仍應維持 top config panel -> conversation area -> bottom composer 的結構

- Given astrology profile screen 已載入
  When 使用者捲動右側主內容
  Then 主要捲動應只作用於 conversation area
  And top config panel 應維持在聊天區上方
  And bottom composer 應固定在底部

## Scenario Group: Astrology Config Collapse

- Given astrology profile screen 已載入且 config panel 為展開狀態
  When 使用者點擊收合
  Then top config panel 應收成 summary row
  And 不應清空 sun / moon / rising 的既有值
  And conversation area 應因此取得更多可視高度

- Given astrology profile screen 的 config panel 為收合狀態
  When 使用者點擊展開
  Then 應回到完整 config controls
  And 原本 slot state 應完整保留

## Scenario Group: Profile Consult Preview Consumption

- Given backend `/api/profile-consult` 使用 `preview_prompt_body_only`
  When astrology profile screen 收到 `ConsultBusinessResponse`
  Then assistant area 應只顯示 `response`
  And 畫面不需要再從完整 preview 手動找出主體 prompt 段落

- Given backend `/api/profile-consult` 使用 `preview_full`
  When astrology profile screen 收到 `ConsultBusinessResponse`
  Then 該內容在語意上屬於完整 prompt preview
  And frontend 不應自行解析 `[INSTRUCTIONS]` 或 `[USER_MESSAGE]` 來模擬裁切 body

- Given astrology profile screen 收到 `ConsultBusinessResponse`
  When `response` 為空字串但 `statusAns` 有值
  Then assistant area 不應直接顯示 `statusAns` 原文
  And 應顯示前端固定 fallback 文案

## Scenario Group: Backend-Controlled Preview Mode For Internal Test UI

- Given internal React astrology test UI 採 backend-controlled preview mode
  When astrology profile screen render
  Then config panel header 不應再顯示 response mode selector

- Given internal React astrology test UI 採 backend-controlled preview mode
  When submit `/api/profile-consult`
  Then frontend request 不應再送出 `mode`
  And backend 應自行依 server-side default mode 決定 response 內容

- Given internal React astrology test UI 採 backend-controlled preview mode
  When assistant area 收到 `ConsultBusinessResponse`
  Then frontend 應只顯示 `response`
  And 不應自行推斷目前是 `preview_full`、`preview_prompt_body_only` 或 `live`

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
