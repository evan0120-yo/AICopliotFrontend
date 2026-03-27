# Internal AI Copilot — Frontend Code Review

---

# ═══════════════════════════════════════════════
# BLOCK 1: AI 對這個產品的想像
# ═══════════════════════════════════════════════

這段是 AI 讀完前端 code 後，對產品的「腦補」。
用途：先確認 AI 有沒有搞懂這個前端到底在做什麼；如果這段歪了，後面文件就不可信。

## 它是什麼

一個**內部 AI 諮詢平台的 Web front-end**。

前端現在承接兩條主線：

- **consult 線**：讓使用者從左側選一個 builder，輸入文字、上傳附件、送出一次性 consult，然後看 AI 回應
- **admin 線**：讓管理員編輯 builder graph、source/rag 結構，以及 template library

它不是多輪對話產品。畫面看起來像 chat，但實際上每次送出仍是單次請求；前端只是把單次請求回應串成聊天氣泡。

## 它的使用者是誰

- **一般內部使用者**：用 `/:builderId` 做 consult
- **管理員**：用 `/admin/builders/:builderId/graph` 維護 builder graph，用 `/admin/templates` 維護範本

## 它依賴什麼 backend

前端不直接打外部 domain，而是統一打 `/api/*`，再由 Next rewrite 轉發到 Go backend。

```text
Browser
  -> /api/*
  -> next.config.ts rewrites
  -> {BACKEND_ORIGIN}/api/*
```

backend origin 的來源：

- `INTERNAL_AI_COPILOT_BACKEND_ORIGIN`
- `REWARDBRIDGE_BACKEND_ORIGIN`
- 預設 `http://localhost:8082`

## 它不是什麼

- 不是前後端混在一起的 monolith UI，真正業務規則都在 Go backend
- 不是完整 profile-analysis 前端，目前還沒有對應 `profile-consult` 頁面
- 不是 builder 建立平台，因為目前沒有 create builder API；`/admin/builders/new/graph` 只是草稿頁

---

# ═══════════════════════════════════════════════
# BLOCK 2: 讀者模式
# ═══════════════════════════════════════════════

這段用「說人話」的方式描述每一條主要 flow。
目標：讀這段就能知道現在前端在做什麼、哪些事情已經接上、哪些還沒接。

---

## A. 首頁與左側導覽

**`/` + `Sidebar`**

首頁本身很薄，只是顯示 welcome 畫面。真正會去撈資料的是左側 `Sidebar`。

`Sidebar` 一進來就呼叫：

- `useGetBuilders()`
- `GET /api/builders`

拿到 builder 清單後，把每個 builder 顯示成一張可點的導覽卡。每張卡有兩個出口：

- 點主體：進 `/:builderId`
- 點齒輪：進 `/admin/builders/:builderId/graph`

另外 sidebar 也提供：

- `/admin/templates`
- `/admin/builders/new/graph`

```text
首頁 / 任一 layout 載入
      │
      ▼
 Sidebar 呼叫 GET /api/builders
      │
      ├── 成功 → 顯示 builder cards
      ├── 失敗 → 顯示錯誤文案
      └── 載入中 → 顯示 skeleton
```

> 行動版不會直接顯示 sidebar，而是用 `Sheet` 包起來，靠 hamburger 展開。

---

## B. 使用者 consult 頁

**`/:builderId`**

這頁是使用者的主要入口。畫面上看起來像 chat，但背後流程其實很單純：

1. 先用 builder list 找到目前 builder 名片
2. 使用者輸入文字、附檔案
3. 前端組 `FormData`
4. 打 `POST /api/consult`
5. 把回應顯示成 assistant bubble

### 送出的資料

目前前端只支援一般 consult contract：

- `builderId`
- `text`
- `outputFormat`
- `files`

還**沒有**接上：

- `appId`
- `subjectProfile`
- `analysisPayloads`
- weighted-entry profile payload
- `POST /api/profile-consult`

```text
使用者輸入內容
      │
      ▼
react-hook-form 驗證
      │
      ├── 檔案超量 / 超大小 / 副檔名不合法 → 前端直接擋
      │
      └── 通過
           │
           ▼
       useConsult()
           │
           ▼
       POST /api/consult
           │
           ├── success → append assistant bubble
           └── error   → 原 user bubble 標成 error
```

### 這頁有哪些前端規則

- 如果 builder `includeFile=true`，才顯示 output format selector
- 如果使用者沒輸入 text，user bubble 會顯示「未提供文字，使用 builder 預設內容。」
- `MarkdownBlock` 會把 assistant response 當 markdown render
- 如果 backend 回傳 `file`，畫面上會多一塊下載附件的卡片

### 目前沒做的事

這頁現在還不是 profile-analysis 頁，所以你不能期待它處理：

- canonical key
- weighted entries
- `responseDetail`
- prompt preview 專用 UI

這些能力目前都還停在 backend。

---

## C. Builder Graph Editor

**`/admin/builders/:builderId/graph`**

這頁是目前前端最重的地方。它不是單純表單，而是：

- 先載 builder graph
- 轉成本地 form state
- 把 builder / source / rag 依畫面卡片方式編輯
- 再整包存回 backend

### 主流程

```text
進入 graph page
      │
      ▼
useBuilderGraph()
  -> GET /api/admin/builders/:builderId/graph
      │
      ▼
responseToFormValues()
      │
      ▼
react-hook-form + useFieldArray
      │
      ▼
BuilderInfoSection / SourceBlock / RagItem
      │
      ▼
formValuesToRequest()
      │
      ▼
useSaveBuilderGraph()
  -> PUT /api/admin/builders/:builderId/graph
```

### 現在畫面上真的能改什麼

#### Builder card

可直接改：

- `groupLabel`
- `name`
- `description`
- `active`
- `includeFile`

進階設定裡可改：

- `builderCode`
- `filePrefix`
- `defaultOutputFormat`

#### Source / RAG

- source 順序就是畫面順序
- rag 順序也是畫面順序
- `systemBlock` 會進只讀模式，不可刪、不可移、不可一般編輯
- 一般 source 的 `prompts` 必填
- `fragment` source 可接受空 `prompts`

### metadata 現在是什麼狀態

這一頁已經能把 backend metadata **保留下來**：

- `moduleKey`
- `sourceType`
- `matchKey`
- `tags`
- `sourceIds`

但要講清楚，現在是：

```text
有 round-trip
  != 有完整編輯 UI
```

目前只有 `tags` 會明確顯示成 `#tag` pills。

其餘欄位雖然會：

- load 進 form state
- save 時再送回 backend

但畫面上還沒有完整的 metadata 編輯器。

這也是前端目前一個很明顯的未完成區。

---

## D. Template 系統

Template 現在分兩個入口：

1. **全域 template library**
   - `/admin/templates`
2. **builder graph 裡對 source 做 template 操作**
   - 從範本新增 source
   - 另存成範本
   - 更新原範本
   - 另存成新範本

### Template library 頁

這頁會：

- `GET /api/admin/templates`
- 顯示 template grid
- 提供 create / update / delete dialog

```text
進入 /admin/templates
      │
      ▼
useTemplateLibrary()
  -> GET /api/admin/templates
      │
      ├── create -> POST /api/admin/templates
      ├── update -> PUT /api/admin/templates/:templateId
      └── delete -> DELETE /api/admin/templates/:templateId
```

### Graph editor 內的 template 關係

graph editor 裡，一個 source 可以是範本副本。

被套用後，source 會帶著這些 template metadata：

- `templateId`
- `templateKey`
- `templateName`
- `templateDescription`
- `templateGroupKey`

它的意思不是 source 被鎖死，而是：

```text
template 套進 source
   -> source 成為可編輯副本
   -> 管理員仍可在畫面上調整 source 內容
   -> 若要回寫範本，必須明確按「更新原範本」
```

這個設計是合理的，因為它避免 template 直接變成不可碰的黑盒。

---

## E. 新 Builder 頁

**`/admin/builders/new/graph`**

這頁乍看像能建立 builder，但實際上不是。

它只是把同一個 `BuilderGraphEditor` 切成 `isCreateMode`，讓你可以先排 builder 草稿和 source/rag 結構。

現在按儲存時，不會真的打 create API，而是直接 toast：

- 後端尚未提供建立新 AI Builder 的 API

所以這頁目前的產品定位很明確：

**它是草稿練習場，不是正式建立入口。**

---

# ═══════════════════════════════════════════════
# BLOCK 3: 現在 code 的真相與限制
# ═══════════════════════════════════════════════

## 目前已經完整接上的

- builder list
- 一般 consult chat
- file upload consult
- markdown / file download 顯示
- builder graph load/save
- template library CRUD
- graph metadata round-trip

## 目前還沒接上的

- frontend `profile-consult`
- weighted-entry UI
- canonical key profile form
- create builder API
- graph metadata 完整編輯 UI
- frontend automated tests

## 風險點

### 1. Contract drift

後端最近變動很快，尤其是：

- graph metadata
- profile consult contract
- preview mode / response schema

但前端目前沒有 automated tests，所以只要 DTO 或 hook 漏改，前端就很容易跟 backend 脫節。

### 2. Metadata 有保留，但不可見

現在 `moduleKey / sourceType / matchKey / sourceIds` 很多時候只是在 form state 裡被保留，畫面上不一定看得到。

這代表：

- backend 資料不會被前端 save 洗掉
- 但也代表管理員不容易直接從畫面排查 metadata 問題

### 3. Admin 能力比 consult 能力成熟很多

這個前端目前其實比較像：

- admin editor 很完整
- consult 前台還停在比較早期的 `/consult` 型態

所以如果接下來產品重心是 LinkChat / profile-analysis，前端最大的缺口會在 consult 入口，不會在 admin editor。

---

# ═══════════════════════════════════════════════
# BLOCK 4: 我對這份前端的判斷
# ═══════════════════════════════════════════════

目前這個前端不是亂的，反而結構算清楚：

- API 收在 hooks
- DTO 集中在 `types`
- graph editor 有自己的 feature components
- template library 沒有跟 consult 頁硬混

真正的問題不是 code 亂，而是：

1. 文件原本幾乎沒有
2. backend 演進比 frontend 快
3. frontend 現在還沒有 profile-consult 這條新主線

所以目前最重要的不是重構前端架構，而是：

- 先把前端文件真相補齊
- 接著視產品優先級決定要不要做
  - profile-consult UI
  - weighted-entry form
  - metadata 編輯器

一句話結論：

**這個前端目前是可用的 consult + admin editor UI，但它還不是 LinkChat/profile-analysis 的完整前端。**
