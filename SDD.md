# Internal AI Copilot Frontend SDD

## Target Topology

```text
┌────────────────────────────────────────┐
│  src/app (route / page)                │
│  screen composition · variant routing  │
└───────────────────┬────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
┌──────────────────┐  ┌──────────────────────┐
│  src/hooks       │  │  src/components       │
│  request shaping │  │  layout / features /  │
│  API call        │  │  ui primitives        │
│  response unwrap │  └──────────────────────┘
│  query cache     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Backend HTTP    │
│  /api/*          │
└──────────────────┘

src/types  ←  shared by app / hooks / components
```

Target: builder-driven consult UI + admin tooling. No session memory, no real-time push.

## Boundary Walls + Runtime Skeleton

### Boundary Walls

```text
must not cross
├─ page must not compose raw axios/fetch calls — use hooks
├─ hooks must not make layout or routing decisions
└─ types must not import from hooks or components

allowed direction
├─ app/page → hooks (data) + components (UI)
├─ hooks → lib/api → backend
├─ components → components/ui (primitives only)
└─ types → hooks, page, components (read-only contract)
```

### Runtime Skeleton

```text
/:builderId page load
└─ useGetBuilders
   └─ resolveBuilderScreenVariant
      ├─ line-memo-crud       → LineTaskExtractScreen
      ├─ linkchat-astrology   → AstrologyProfileScreen
      └─ fallback             → GenericConsultScreen

consult submit (any variant)
└─ react-hook-form + zod (client validation)
   └─ hook (useConsult / useProfileConsult / useLineTaskConsult)
      └─ POST /api/{endpoint}
         ├─ success → append result to chat / card list
         └─ error   → mark pending entry as error + toast

/admin/:builderId/graph
└─ useBuilderGraph
   ├─ GET graph → responseToFormValues
   ├─ edit in form
   └─ formValuesToRequest → PUT graph

/admin/templates
└─ useTemplates
   ├─ list
   ├─ create / update / delete
   └─ query invalidation on mutation
```

### Package Map

```text
src/app             → routes, page composition, variant routing
src/hooks           → useGetBuilders, useConsult, useProfileConsult,
                      useLineTaskConsult, useBuilderGraph, useTemplates
src/types/api.ts    → consult / profile / line task / builder DTOs
src/types/admin.ts  → graph / template DTOs and form value types
src/components/layout    → app shell, sidebar
src/components/features  → markdown-block, builder-graph editor
src/components/ui        → shared primitives
```
