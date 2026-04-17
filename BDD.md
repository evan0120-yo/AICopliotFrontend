# Internal AI Copilot Frontend BDD

## Behavior World

```text
behavior world
├─ entry
│  ├─ /               → redirect to first builder
│  ├─ /:builderId     → builder page (variant resolved)
│  └─ /admin/*        → graph editor / template library
├─ interpretation
│  └─ builder-driven variant resolution
│     ├─ line-memo-crud       → line task extract screen
│     ├─ linkchat-astrology   → astrology profile screen
│     └─ fallback             → generic consult screen
├─ operation space
│  ├─ consult (generic / profile / line task)
│  └─ admin (graph CRUD / template CRUD)
└─ output space
   ├─ chat bubble (markdown rendered)
   ├─ structured result card (line task)
   └─ error state on bubble / submission card
```

## Hard Behavior Rules

```text
variant resolution contract
├─ builder metadata must load before screen renders
├─ invalid builderId → invalid builder guard message
└─ variant is determined client-side by builderCode / builderId

consult submit contract
├─ pending user bubble appended before API call
├─ API success → append assistant bubble
├─ API error → mark pending bubble as error + show toast
└─ empty userText → bubble shows default text message, still submits

attachment validation contract
├─ count / size / ext checked client-side before submit
└─ validation failure → show error, must not send request

keyboard contract
├─ generic consult: Enter → submit; Shift+Enter → newline
├─ line task: Ctrl+Enter / Cmd+Enter → submit; Enter → newline
└─ astrology: Ctrl+Enter / Cmd+Enter → submit; Enter → newline

astrology profile contract
├─ single mode: allows unknown(default); unknown slot excluded from payload
├─ weighted mode: requires two different zodiacs + percentages sum to 100
├─ weighted mode validation failure → block submit, show field error
├─ slot state preserved on submit success and panel collapse
└─ text composer resets to default sentence after success

line task contract
├─ useCustomCurrentTime unchecked → referenceTime and timeZone omitted from request
├─ useCustomCurrentTime checked  → referenceTime and timeZone fields shown
├─ referenceTime format sent as YYYY-MM-DD HH:mm:ss
├─ supportedTaskTypes always ["calendar"] (hook-supplied, not user-selectable)
└─ result displayed as structured card, not markdown bubble

graph editor contract
├─ systemBlock source → read-only, no delete / move / edit
├─ fragment sourceType with empty prompts → valid (no block)
├─ non-fragment non-systemBlock with empty prompts → blocked, prompts required
└─ backend metadata (moduleKey / sourceType / matchKey / tags / sourceIds) round-tripped on save
```

## Edge Scenarios

### Scenario: weighted mode same zodiac blocks submit

Given astrology profile in weighted mode  
When both zodiac selects have the same value  
Then submit must not proceed  
And form must show duplicate zodiac error

> Weighted mode requires two distinct zodiacs; same value is not caught by type alone.

### Scenario: weighted mode percentages not summing to 100 blocks submit

Given astrology profile in weighted mode  
When the two percentage fields do not add up to 100  
Then submit must not proceed  
And form must show percentage sum error

> The 100% invariant is a domain rule, not derivable from field types.

### Scenario: inactive user can still see previously loaded builder list

Given builder list was loaded successfully  
When a builder becomes inactive server-side  
Then sidebar continues showing the stale list until next load

> Frontend has no active invalidation for builder list; this is a known first-version constraint.
