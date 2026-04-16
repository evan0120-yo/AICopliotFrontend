# Internal AI Copilot Frontend TDD

## Scope

這份文件定義 frontend 的測試策略與最小驗證順序。

它回答的是：
- 改哪種功能，要先補哪層測試
- 現在有哪些測試真的存在
- 目前沒有自動化測試時，最小閉環怎麼補

## Current Baseline

```text
current frontend baseline
├─ 有
│  ├─ npm run build
│  ├─ npm run lint
│  └─ npm exec tsc -- --noEmit
└─ 沒有
   └─ 已接上的 automated test runner
```

所以目前 frontend 的實際驗證順序是：

```text
先改 code
└─ 跑 tsc
   └─ 跑 build
      └─ 視需要跑 lint
         └─ 手動驗證主要 flow
```

## Testing Order

### 1. Contract First

```text
backend contract changed
└─ 先檢查
   ├─ src/types/api.ts
   ├─ src/types/admin.ts
   └─ 對應 hook request/response shape
```

這層先保住：
- 欄位有沒有漂
- optional / required 有沒有變
- enum / union 有沒有失真

### 2. Screen Logic Second

```text
screen-level logic
├─ variant resolve
├─ payload normalize
├─ slot validation
└─ form submission branching
```

這層最值得先補成可測純函式的邏輯有：
- `resolveBuilderScreenVariant`
- `normalizeLineTaskReferenceTime`
- `buildAstrologyPayload`
- `buildAstrologySlotErrors`

原則：
- 可抽純函式的邏輯，優先抽出再測
- 不要把所有驗證都留給手動點畫面

### 3. Manual Flow Third

目前沒有 test runner，所以主要流程至少手動驗：

```text
manual regression
├─ Sidebar builder discovery
├─ Generic consult submit
├─ Astrology profile submit
├─ Line task extraction submit
├─ Graph load/save
└─ Template CRUD
```

## Change-Type Matrix

### A. 只改 DTO / Hook

最小驗證：

```text
DTO / hook change
├─ tsc
├─ build
└─ 針對該 flow 手動打一遍 request
```

必查：
- request body shape
- response unwrap
- 畫面讀取欄位是否同步

### B. 改 Builder Variant

最小驗證：

```text
variant change
├─ tsc
├─ build
└─ 手動驗三種 screen
   ├─ generic_consult
   ├─ astrology_profile
   └─ line_task_extract
```

### C. 改 Astrology Profile

最小驗證：

```text
astrology change
├─ slot validation
├─ payload shape
├─ submit success
└─ submit error
```

必查：
- unknown 欄位是否真的 omit
- weighted mode 是否仍要求總和 100
- submit success 後是否只 reset text、不 reset slots

### D. 改 Line Task Extraction

最小驗證：

```text
line task change
├─ referenceTime normalize
├─ supportedTaskTypes 是否仍正確送出
├─ custom current time 開關
└─ structured result render
```

必查：
- 未勾 debug override 時不送 `referenceTime/timeZone`
- hook 是否仍補 `supportedTaskTypes=["calendar"]`

### E. 改 Admin Graph / Templates

最小驗證：

```text
admin change
├─ graph load
├─ graph save
├─ source / rag orderNo
├─ template CRUD
└─ metadata round-trip
```

## When Automated Tests Land

這不是 current truth，但作為前端 TDD 方向，下一個最合理的落點是：

```text
future first automation targets
├─ pure helper tests
├─ hook request-shaping tests
└─ high-value screen interaction tests
```

優先順序：
1. 純函式
2. hook contract
3. 關鍵 screen interaction

不要一開始就把所有驗證壓成巨大的 E2E。

## Documentation Sync Rule

當測試基線有變化時，要同步：
- BDD.md
- SDD.md
- TDD.md
- CODE_REVIEW.md
- DEVELOPMENT.md
