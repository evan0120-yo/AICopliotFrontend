# Internal AI Copilot Frontend — SDD Contracts

## Backend API Contracts

### GET /api/builders

```text
response: BuilderSummary[]
fields per item
├─ builderId     string
├─ builderCode   string
├─ name          string
└─ includeFile   bool    (controls output format selector visibility)
```

### POST /api/consult

```text
request
├─ builderId      string   required
├─ userText       string   optional
├─ outputFormat   string   optional
└─ attachments    FormData optional

response: ConsultBusinessResponse
├─ text           string
└─ filePayload?   base64 blob (conditional)
```

### POST /api/profile-consult

```text
request
├─ appId          string  fixed: "linkchat"
├─ builderId      string
├─ subjectId      string  fixed: "test-user-001"
├─ analysisType   string  fixed: "astrology"
├─ subjectProfile object  (zodiac slots, built client-side)
└─ userText       string

response: ConsultBusinessResponse
```

### POST /api/line-task-consult

```text
request
├─ builderId          string     required
├─ messageText        string     required
├─ supportedTaskTypes []string   always ["calendar"]
├─ appId?             string     optional
├─ referenceTime?     string     YYYY-MM-DD HH:mm:ss (only if useCustomCurrentTime)
└─ timeZone?          string     (only if useCustomCurrentTime)

response: LineTaskResult
├─ taskType
├─ operation
├─ summary
├─ startAt / endAt
├─ location
├─ missingFields
├─ eventId
├─ queryStartAt / queryEndAt
```

### Admin Graph API

```text
GET  /api/admin/builders/:builderId/graph
PUT  /api/admin/builders/:builderId/graph

graph form values
├─ builder info fields
├─ sources[]
│  ├─ sourceType, systemBlock, moduleKey, matchKey, tags
│  ├─ prompts[]
│  ├─ orderNo (rebuilt from UI position on save)
│  └─ sourceRags[]
│     ├─ orderNo (rebuilt from UI position on save)
│     └─ rag fields
```

### Admin Template API

```text
GET    /api/admin/templates
POST   /api/admin/templates
PUT    /api/admin/templates/:templateId
DELETE /api/admin/templates/:templateId

template fields
├─ templateId
├─ name
├─ content
└─ orderNo
```

## Config

```text
NEXT_PUBLIC_API_BASE_URL   backend base URL
```
