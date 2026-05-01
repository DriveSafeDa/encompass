# Encompass — Product Specification v1.0

**"Ask your company anything — and it answers, with receipts."**

Written by Eli (Engineering Lead) — May 1, 2026
For Solace (Chief Stew) to review, refine, and build.

---

## 1. Product Vision & Positioning

**Encompass** is an enterprise knowledge AI platform that gives every desktop employee a conversational interface — text and voice — into the full depth of their company's institutional knowledge. Documents, policies, contracts, reports, meeting notes, tribal knowledge: Encompass ingests it all, reasons across it, and answers questions with source citations and an audit trail.

**Target buyer:** Mid-market and enterprise companies (50-5,000 employees) where institutional knowledge is scattered across SharePoint, Google Drive, Slack, email, and people's heads. Initial verticals: healthcare, legal, financial services, property management — any industry where compliance, policy lookup, and document cross-referencing eat hours per week.

**Why us:** Every piece of this product already works in production across Shane's projects:
- **LightRAG** — knowledge ingestion + hybrid vector/graph retrieval (running in Docker)
- **Co-Presenter** — voice-first conversational AI with persistent memory (9 real users, 150 messages)
- **Compass** — agent reasoning with ReAct loop, 22+ tools, intent classification (production in Director)
- **ATLAS** — immutable governance gates, audit trails, watchdog (production trading system)

This is assembly, not invention.

### Competitive Position

| Feature | Glean | Copilot | Guru | Notion AI | **Encompass** |
|---|---|---|---|---|---|
| Voice I/O | No | No | No | No | **Yes** |
| Agent reasoning | Limited | Yes | No | No | **Yes (ReAct)** |
| Per-user memory | No | No | No | No | **Yes** |
| Source citations | Yes | Partial | Yes | Partial | **Yes (section-level)** |
| Audit trail | Yes | Partial | No | No | **Yes (immutable)** |
| Graph + vector retrieval | No | No | No | No | **Yes (LightRAG)** |
| Custom persona | No | No | No | No | **Yes** |
| Pricing | $10-15/user | Bundled | $10/user | $10/user | **$8-12/user** |

### Core Differentiators

1. **Voice-first.** Nobody else in enterprise knowledge AI lets you talk to it. Encompass is a conversational presence, not a search box. This matters for field workers, executives in transit, and accessibility.

2. **Agent reasoning, not just retrieval.** RAG products retrieve and paste. Encompass reasons: "Your Q3 revenue was $X (from Q3 report, p.12), which is 15% higher than Q2 (from Q2 report, p.8) and 3% below the target set in the annual plan (from strategic plan, p.4)." Cross-document reasoning via the ReAct loop.

3. **Memory.** Encompass remembers that you're in Finance, that you prefer bullet points, that you asked about the PTO policy last week for your team's offsite. It builds a working relationship. Competitors reset every session.

4. **Governance from day one.** Immutable audit log, role-based document access enforced in code (not prompts), token budgets with graceful degradation. Built for regulated industries from the start. This is the ATLAS DNA.

5. **Hybrid retrieval (vector + knowledge graph).** LightRAG's entity extraction builds a knowledge graph on top of vector embeddings. This means Encompass can answer relationship questions ("Who approved the vendor contract with Acme?") that pure vector search misses.

6. **Built from production-proven components.** Every subsystem has been running in production. The risk is integration, not invention.

---

## 2. Architecture

```
                    +---------------------------+
                    |     Browser Client        |
                    |  Next.js 16 (React 19)    |
                    |  Voice: Web Speech API    |
                    |  Audio: Web Audio API     |
                    +----------+----------------+
                               |
                    +----------v----------------+
                    |     Next.js API Layer      |
                    |  /api/chat   (agent loop)  |
                    |  /api/tts    (voice out)   |
                    |  /api/ingest (upload)      |
                    |  /api/admin  (dashboard)   |
                    |  /api/v1/*   (public API)  |
                    +--+------+------+----------+
                       |      |      |
          +------------+  +---+---+  +------------+
          |               |       |               |
+---------v---+  +--------v--+  +-v-----------+  +v-----------+
| Auth Layer  |  | Agent     |  | Knowledge   |  | Audit      |
| Clerk Orgs  |  | Engine    |  | Engine      |  | Engine     |
| RBAC/SSO    |  | ReAct     |  | LightRAG    |  | Immutable  |
| Tenant ISO  |  | Classifier|  | per-tenant  |  | append-log |
+-------------+  | Tools     |  | Embeddings  |  | compliance |
                 +-----------+  +------+------+  +------------+
                                       |
                              +--------v--------+
                              | Ingestion       |
                              | Pipeline        |
                              | PDF/DOCX/CSV    |
                              | Slack/Email     |
                              | Watch mode      |
                              | Hash dedup      |
                              +-----------------+

Database: PostgreSQL (Railway)
File Storage: Cloudflare R2
Job Queue: BullMQ + Redis
Deployment: Vercel (frontend) + Railway (DB + services)
```

### Key Architectural Decisions

1. **Shared LightRAG with tenant isolation** — Single LightRAG cluster with tenant-prefixed document IDs and filtered queries. At scale (50+ tenants), migrate to per-tenant instances. Rationale: operational simplicity for MVP.

2. **Next.js API routes for the agent loop** — Matches Director/Compass pattern. Ingestion runs as a standalone Node.js worker (BullMQ) since it's long-running and CPU-bound.

3. **PostgreSQL for everything relational** — Users, tenants, audit logs, chat history, memory, document metadata. LightRAG handles vector/graph. No separate vector DB needed.

---

## 3. Tech Stack

| Layer | Technology | Proven In |
|---|---|---|
| Frontend | Next.js 16, React 19, Tailwind 4 | Co-Presenter |
| Auth | Clerk (orgs + RBAC) | Director |
| Database | PostgreSQL (Railway), Prisma 6 | All projects |
| Knowledge | LightRAG (Docker), Ollama nomic-embed-text (768-dim) | party/lightrag |
| LLM | Claude Sonnet (reasoning), Haiku (classify/extract) | Compass + Co-Presenter |
| Voice In | Web Speech API (continuous, interim results) | Co-Presenter |
| Voice Out | ElevenLabs eleven_flash_v2_5 -> Google TTS -> Browser (3-tier fallback) | Co-Presenter |
| File Storage | Cloudflare R2 | Director/SCS |
| Job Queue | BullMQ + Redis | New (for ingestion) |
| Search | Brave Search API (optional, admin-toggleable) | Compass + Co-Presenter |
| Deployment | Vercel (web) + Railway (DB/services/Docker) | All projects |

---

## 4. Data Model (Prisma Schema)

### Multi-Tenancy

```prisma
model Organization {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  domain        String?                        // for SSO domain matching
  logoUrl       String?
  personaFile   String?                        // markdown persona (like shane.md)
  voiceConfig   Json?                          // { voiceId, provider, enabled }
  plan          String   @default("starter")   // starter | professional | enterprise
  tokenBudget   Int      @default(1000000)     // monthly token cap
  tokensUsed    Int      @default(0)
  billingEmail  String?
  ssoProvider   String?                        // "saml" | "oidc" | null
  ssoConfig     Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  members       OrgMember[]
  documents     Document[]
  docFolders    DocFolder[]
  accessPolicies AccessPolicy[]
  apiKeys       ApiKey[]
  auditLogs     AuditLog[]
  chatSessions  ChatSession[]
  ingestionJobs IngestionJob[]

  @@index([slug])
  @@index([domain])
}

model OrgMember {
  id            String   @id @default(cuid())
  orgId         String
  clerkUserId   String
  role          String                         // owner | admin | member | viewer
  displayName   String?
  email         String?
  department    String?                        // for access policy matching
  title         String?
  status        String   @default("active")    // active | invited | disabled
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  memories      MemoryNode[]
  chatSessions  ChatSession[]

  @@unique([orgId, clerkUserId])
  @@index([clerkUserId])
}
```

### Document Management

```prisma
model DocFolder {
  id            String   @id @default(cuid())
  orgId         String
  name          String
  parentId      String?                        // nested folders
  accessLevel   String   @default("all")       // all | department | role | custom
  accessRoles   String[]                       // which roles can see docs here
  accessDepts   String[]                       // which departments can see docs here
  createdAt     DateTime @default(now())

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  parent        DocFolder?   @relation("FolderNesting", fields: [parentId], references: [id])
  children      DocFolder[]  @relation("FolderNesting")
  documents     Document[]

  @@index([orgId])
}

model Document {
  id            String   @id @default(cuid())
  orgId         String
  folderId      String?
  title         String
  filename      String
  mimeType      String
  fileSize      Int
  r2Key         String                         // Cloudflare R2 object key
  contentHash   String                         // SHA-256 for dedup
  status        String   @default("pending")   // pending | processing | indexed | failed | archived
  pageCount     Int?
  category      String?                        // auto-classified: policy, contract, report, meeting, etc.
  tags          String[]
  metadata      Json?                          // extracted: author, dates, department
  lightragDocId String?                        // ID in LightRAG for deletion/update
  uploadedBy    String?                        // clerk user ID
  lastIndexedAt DateTime?
  expiresAt     DateTime?                      // for contracts with expiry dates
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  folder        DocFolder?   @relation(fields: [folderId], references: [id])
  sections      DocumentSection[]
  citations     Citation[]

  @@unique([orgId, contentHash])
  @@index([orgId, status])
  @@index([orgId, category])
  @@index([folderId])
}

model DocumentSection {
  id            String   @id @default(cuid())
  documentId    String
  sectionIndex  Int
  heading       String?
  content       String
  pageNumber    Int?
  lightragDocId String?                        // per-section LightRAG ID for granular citation
  createdAt     DateTime @default(now())

  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  citations     Citation[]

  @@index([documentId])
}

model AccessPolicy {
  id            String   @id @default(cuid())
  orgId         String
  name          String                         // "HR Only", "Executive Suite", "All Hands"
  description   String?
  rules         Json                           // { roles: [...], departments: [...], userIds: [...] }
  folderIds     String[]                       // which folders this policy applies to
  createdAt     DateTime @default(now())

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
}
```

### Conversation & Memory

```prisma
model ChatSession {
  id            String   @id @default(cuid())
  orgId         String
  memberId      String
  title         String?                        // auto-generated from first message
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  member        OrgMember    @relation(fields: [memberId], references: [id], onDelete: Cascade)
  messages      ChatMessage[]
  citations     Citation[]

  @@index([orgId, memberId])
}

model ChatMessage {
  id            String   @id @default(cuid())
  sessionId     String
  role          String                         // user | assistant | system
  content       String
  spokenText    String?                        // cleaned for TTS (no markdown/URLs)
  toolCalls     Json?                          // tool invocations this turn
  tokenCount    Int?
  latencyMs     Int?
  createdAt     DateTime @default(now())

  session       ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  citations     Citation[]

  @@index([sessionId])
  @@index([createdAt])
}

model Citation {
  id             String   @id @default(cuid())
  messageId      String
  sessionId      String
  documentId     String
  sectionId      String?
  snippet        String                        // the quoted passage
  pageNumber     Int?
  relevanceScore Float?
  createdAt      DateTime @default(now())

  message        ChatMessage      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  session        ChatSession      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  document       Document         @relation(fields: [documentId], references: [id], onDelete: Cascade)
  section        DocumentSection? @relation(fields: [sectionId], references: [id])

  @@index([messageId])
  @@index([documentId])
}

model MemoryNode {
  id            String   @id @default(cuid())
  memberId      String
  category      String                         // preferences | role | shortcuts | relationships | projects
  key           String
  content       String
  confidence    Float    @default(0.8)
  mentions      Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  member        OrgMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([memberId, key])
  @@index([memberId])
}
```

### Ingestion, Audit & API

```prisma
model IngestionJob {
  id            String    @id @default(cuid())
  orgId         String
  type          String                         // upload | scheduled | connector
  source        String?                        // google_drive | sharepoint | slack | manual
  status        String    @default("queued")   // queued | processing | completed | failed
  totalFiles    Int       @default(0)
  processed     Int       @default(0)
  failed        Int       @default(0)
  skipped       Int       @default(0)          // hash-matched, unchanged
  errorLog      Json?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime  @default(now())

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, status])
}

model AuditLog {
  id            String   @id @default(cuid())
  orgId         String
  clerkUserId   String?
  action        String                         // query | response | doc_upload | doc_delete | login | export | admin_action
  detail        Json                           // { query, response_summary, doc_id, tool_calls, etc. }
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // IMMUTABLE — no updatedAt, no update operations. Append-only. (ATLAS pattern)
  @@index([orgId, createdAt])
  @@index([orgId, action])
  @@index([clerkUserId])
}

model ApiKey {
  id            String    @id @default(cuid())
  orgId         String
  name          String                         // "Slack Bot", "Teams Integration"
  keyHash       String    @unique              // SHA-256 of actual key
  keyPrefix     String                         // first 8 chars: "enc_a3b4..."
  permissions   String[]                       // query | ingest | admin
  rateLimit     Int       @default(100)        // requests per minute
  lastUsedAt    DateTime?
  expiresAt     DateTime?
  createdAt     DateTime  @default(now())

  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([keyHash])
}
```

---

## 5. Ingestion Pipeline

Adapted from `party/lightrag/ingestion/ingest.py` — hash-based dedup, section splitting, tiered priority.

### Pipeline Stages

```
Upload/Connector -> File Validation -> Text Extraction -> Section Splitting
    -> Classification -> Access Tagging -> LightRAG Ingestion -> Status Update
```

**Stage 1: File Intake**
- Manual upload via admin dashboard (drag-and-drop, bulk)
- API upload via `POST /api/v1/ingest` with API key
- Connector sync: Google Drive, SharePoint, Slack exports (Phase 2)
- Files stored in R2: `{orgId}/{docId}/{filename}`

**Stage 2: Text Extraction**
- PDF: `pdf-parse` (proven in Director's parse_pdf tool)
- DOCX: `mammoth`
- XLSX/CSV: `xlsx` library, sheets to structured text
- Email (.eml/.msg): `mailparser`
- Markdown/TXT: direct read
- Meeting transcripts: plain text with speaker labels preserved

**Stage 3: Section Splitting**
Port `party/lightrag/ingestion/splitter.py` to TypeScript:
- Split on heading hierarchy (H1/H2/H3 boundaries)
- Page boundaries for PDFs
- Max chunk: 4,000 chars with 200-char overlap
- Preserve metadata: heading text, page number, document title

**Stage 4: Auto-Classification**
Haiku call per document (not per section — cost control):
```
Classify this document: { title, first 500 chars }
Categories: policy, procedure, contract, report, meeting_notes,
            training, handbook, financial, legal, correspondence
Also extract: { author, date_range, department, expiry_date }
```

**Stage 5: Access Tagging**
- Inherit folder-level access policy
- Override per-document if specified
- Default: "all" (visible to everyone in org)

**Stage 6: LightRAG Ingestion**
- Each section as separate document (matching splitter.py pattern)
- Document ID format: `{orgId}:{docId}:section-{index}`
- Tenant isolation via ID prefix filtering at query time
- Hash-based dedup: skip sections whose content hash matches existing

**Stage 7: Scheduled Re-ingestion**
- Cron job (configurable: daily/weekly per org)
- Re-hash all documents, only re-ingest changed sections
- Connector sources: poll for modifications since last sync

### Ingestion Worker
Standalone Node.js process with BullMQ + Redis:
- Concurrency: 3 documents per org at a time
- Progress reporting via DB status updates (polled by admin UI)
- Retry with exponential backoff on LightRAG timeouts
- Matches the 5-min timeout pattern from lightrag/proxy/server.js

---

## 6. Agent Architecture

Adapted from `director/src/lib/compass/` — the most battle-tested agent in Shane's fleet.

### Intent Classifier

Port from `compass/classifier.ts`. Haiku classifies every message into tiers:

| Tier | Max Iterations | Use Case |
|---|---|---|
| `quick` | 0 (skip loop) | Greetings, simple facts from context/memory |
| `lookup` | 3 | Single-doc retrieval, policy questions |
| `research` | 7 | Cross-doc reasoning, multi-source answers |
| `report` | 5 | Generate structured reports/comparisons |
| `action` | 3 | Execute integration (Phase 2) |

### Tool Set (10 for MVP)

1. **query_knowledge** — LightRAG hybrid query (vector + graph). Access-filtered per user role/dept. Returns source chunks with document metadata.
2. **search_documents** — Full-text search on doc metadata (title, tags, category, dates). For "find all contracts expiring this year."
3. **read_section** — Retrieve specific document section by ID. For deep-dive after initial retrieval.
4. **cross_reference** — Multi-query + synthesize. For "compare our 2024 and 2025 PTO policies."
5. **generate_report** — HTML report from multiple sources. Side-channel pattern from Compass (HTML bypasses Claude, rendered directly in UI).
6. **summarize_document** — Summarize entire doc or doc set.
7. **search_web** — Brave Search for external context (admin-toggleable per org).
8. **calculate** — Safe math eval for financial/metric questions.
9. **list_documents** — Browse docs by folder/category/date.
10. **check_access** — Verify user can see a doc before citing. Gate in CODE, not prompt. (ATLAS principle)

### 6-Part System Prompt

Replicates `compass/prompt.ts` pattern:

```
PART 1: IDENTITY
  "You are [PersonaName], the AI knowledge assistant for [OrgName]."
  Loaded from org's persona markdown file (like shane.md in Co-Presenter).

PART 2: DOMAIN KNOWLEDGE
  Company context, industry, terminology, org structure.
  Auto-generated from ingested docs tagged as "handbook" or "onboarding."

PART 3: USER CONTEXT
  Name, role, department, recent questions, memory nodes (max 50).
  Access level summary: what document categories this user can see.

PART 4: BEHAVIORAL RULES
  1. Always cite sources: [Doc: title, p.X]
  2. If access-restricted: "I found relevant info but you don't have access. Contact your admin."
  3. Never fabricate information. If uncertain, say so.
  4. Keep responses concise (2-4 sentences) unless asked for detail.
  5. For complex questions, explain reasoning path.
  6. Remember user preferences and reference them naturally.

PART 5: TOOL USAGE RULES
  Standard flow: query_knowledge -> cross_reference (if multi-doc) -> cite sources
  Reports: query_knowledge -> generate_report (side-channel HTML)
  Can't find it: list_documents -> suggest related categories

PART 6: OUTPUT FORMAT
  Chat: 2-4 sentences with inline citations [Doc: name, p.X]
  Reports: Side-channel HTML (bypass Claude output, render directly)
  Voice: Clean text stripped of citations/markdown for TTS
```

### ReAct Loop

Direct port from `compass/loop.ts`:
- Think -> Act -> Observe cycle
- 240s deadline with time-budget checks before each iteration
- Tool-leak stripping (XML/JSON artifacts)
- Truncation recovery (nudge Claude to call tools when confused)
- Side-channel HTML capture for reports
- Batched tool_results in same user turn (strict alternation)

**Critical addition:** Access check before every citation. Tool results filtered by user's role/department BEFORE being shown to Claude. Gates in CODE, not config. (ATLAS principle)

### Memory System

Merged from two proven implementations:
- **Co-Presenter** (`lib/memory.ts`): Regex fast-path + Claude JSON extraction
- **Compass** (`compass/memory.ts`): Haiku extraction with dedup, 50 nodes max

Pattern:
- Per-user memory within org scope (50 nodes max)
- Extraction happens post-response (non-blocking — never blocks user response)
- Categories: preferences, role, shortcuts, relationships, projects
- Upsert logic: create or increment mentions, bump confidence on re-mention
- Memory context injected into Part 3 of system prompt as "WHAT I REMEMBER ABOUT YOU"

---

## 7. Voice Pipeline

Directly from Co-Presenter's production pipeline.

### Input (Speech-to-Text)
- `useSpeechRecognition` hook from Co-Presenter
- Web Speech API: continuous mode, interim results
- Silence detection: 2.5s trigger (`SILENCE_TRIGGER_MS`)
- Buffer/flush pattern for collecting complete utterances

### Processing
- Transcribed speech sent to `/api/chat` (same path as text input)
- Response includes `content` (full markdown) and `spokenText` (cleaned for speech)
- `cleanForSpeech()`: strip markdown, URLs, tables, citation brackets

### Output (Text-to-Speech)
3-tier fallback chain from Co-Presenter:

1. **ElevenLabs** (primary): `eleven_flash_v2_5`, per-org configurable voice ID, stability 0.6, similarity_boost 0.8
2. **Google Translate TTS** (fallback): Free, chunks to ~180 chars, streams via Audio element
3. **Browser speechSynthesis** (last resort): Native OS voices, always available, zero cost

### Per-Org Voice Customization
- Admin selects ElevenLabs voice ID or uses preset
- Voice ID stored in Organization.voiceConfig
- Persona name + voice = the company's AI "character"

---

## 8. Multi-Tenancy & Access Control

### Tenant Isolation
- **Database:** Every table has orgId. All queries include `WHERE orgId = $1`.
- **LightRAG:** Document IDs prefixed `orgId:`. Queries filtered by prefix. No cross-tenant bleed.
- **File storage:** R2 keys namespaced: `{orgId}/{docId}/{filename}`.
- **API keys:** Scoped to org. Cannot query another org's knowledge.

### Authentication
- **Clerk** with organization-level multi-tenancy (proven in Director)
- `clerkMiddleware` protects all `/dashboard` and `/api` routes
- Clerk Organizations API for team management
- SSO/SAML via Clerk Enterprise (Phase 2)

### Role-Based Access Control

| Role | Capabilities |
|---|---|
| **Owner** | Full access, billing, delete org, manage SSO |
| **Admin** | Manage members, upload docs, set access policies, view all analytics |
| **Member** | Query AI, see docs matching access policy, personal chat history |
| **Viewer** | Query AI (read-only), no document management |

**Document access filtering:**
- Each folder has access level: `all` | `department:[list]` | `role:[list]` | `custom:[userIds]`
- Agent retrieves documents -> access checked before citations included in response
- If relevant doc exists but user lacks access: "I found relevant information in [title] but you don't have access. Contact your admin."
- Access check happens at TOOL level (`check_access`), NOT in the prompt
- This follows ATLAS's principle: gates in CODE, not config

---

## 9. Admin Dashboard

### Overview Tab
- Total queries (today/week/month), unique active users
- Token usage vs. budget (bar chart with threshold line)
- Most-asked topics (ranked list)
- Unanswered questions (queries where agent couldn't find info)

### Knowledge Management Tab
- Document list with status (indexed/processing/failed), size, category, last updated
- Folder tree with access policy badges
- Upload interface (drag-and-drop, bulk)
- Re-ingestion trigger (per-doc or full)
- Connector config (Google Drive, SharePoint — Phase 2)

### Users Tab
- Member list with role, department, last active, query count
- Invite/remove members
- Role assignment
- Per-user token usage

### Access Policies Tab
- Policy list with name, rules, folder assignments
- Policy editor: select roles/departments, assign to folders
- Preview: "Who can see this folder?" with member list

### Analytics Tab
- Query volume over time (line chart)
- Top documents cited (what knowledge is most valuable)
- Knowledge gaps: queries that returned no results or low-confidence answers
- Response latency distribution
- Department usage breakdown

### Audit Tab
- Searchable, filterable log of every query and response
- Export to CSV/JSON for compliance
- Filters: date range, user, action type, document referenced
- Immutable — append-only, matching ATLAS pattern

### Settings Tab
- Org name, logo, domain
- AI persona (markdown editor)
- Voice settings (ElevenLabs voice ID, enable/disable)
- Token budget and alerts
- API key management (create/revoke/view usage)
- SSO configuration (Phase 2)

---

## 10. Public API

REST, authenticated via `X-API-Key` header (from LightRAG proxy pattern).

### Endpoints

```
POST   /api/v1/query              Ask a question, get answer + citations
POST   /api/v1/query/stream       SSE streaming response
POST   /api/v1/ingest             Upload document (multipart/form-data)
GET    /api/v1/ingest/:jobId      Check ingestion job status
GET    /api/v1/documents          List/search documents
DELETE /api/v1/documents/:id      Remove document + LightRAG cleanup
GET    /api/v1/audit              Query audit log (date/user/action filters)
GET    /api/v1/usage              Token/query stats for billing
```

### Rate Limiting
- Per API key: configurable (default 100 req/min)
- Per user in web app: 30 queries/min, 60 TTS/5min
- Token budget enforcement:
  - 90% of monthly budget -> switch to Haiku (cheaper, still functional)
  - 100% -> graceful degradation message: "Your organization's monthly AI budget has been reached. Contact your admin."

### Webhook Support (Phase 2)
```
POST {customer_webhook_url}
Events: document.indexed, query.unanswered, budget.threshold, member.joined
```

---

## 11. Deployment Architecture

| Component | Service | Why |
|---|---|---|
| Frontend + API | Vercel | Shane's existing platform, instant deploys |
| Database | Railway PostgreSQL | Already used for Director + Co-Presenter |
| LightRAG + Ollama | Railway Docker | Docker Compose, matching existing setup |
| Ingestion Worker | Railway (separate service) | Long-running jobs, separate from web process |
| File Storage | Cloudflare R2 | Already used, S3-compatible, cheap |
| Redis | Railway Redis | Job queue for BullMQ |
| DNS/CDN | Cloudflare | Already in use |

### Environment Variables
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
ANTHROPIC_API_KEY=sk-ant-...
LIGHTRAG_URL=https://lightrag-encompass.railway.internal
LIGHTRAG_API_KEY=...
ELEVENLABS_API_KEY=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=encompass-docs
R2_ENDPOINT=https://...r2.cloudflarestorage.com
BRAVE_API_KEY=...  (optional)
```

### Scaling Path
- **0-10 orgs:** Single LightRAG, tenant-prefix isolation
- **10-50 orgs:** Larger Ollama instance (or switch to OpenAI ada-002 embeddings)
- **50+ orgs:** Per-tenant LightRAG containers via Railway templates
- **Enterprise:** Dedicated infrastructure option (customer's own cloud)

---

## 12. MVP File Structure

```
C:\Projects\encompass\
  src/
    app/
      page.tsx                          # Landing page
      layout.tsx                        # ClerkProvider + layout
      dashboard/
        page.tsx                        # Chat interface (main product)
        admin/
          page.tsx                      # Admin overview
          documents/page.tsx            # Doc management
          analytics/page.tsx            # Usage stats
          audit/page.tsx                # Audit viewer
          settings/page.tsx             # Org settings
      api/
        chat/route.ts                   # Agent endpoint (from compass loop + co-presenter coach)
        tts/route.ts                    # ElevenLabs TTS (from co-presenter)
        ingest/route.ts                 # Doc upload
        ingest/[jobId]/route.ts         # Job status
        admin/
          documents/route.ts
          analytics/route.ts
          audit/route.ts
          settings/route.ts
        v1/
          query/route.ts                # Public API: query
          ingest/route.ts               # Public API: upload
          documents/route.ts            # Public API: list/delete
          audit/route.ts                # Public API: audit log
          usage/route.ts                # Public API: stats
    lib/
      agent/
        loop.ts                         # ReAct loop (port from compass/loop.ts)
        classifier.ts                   # Intent classifier (port from compass/classifier.ts)
        tools.ts                        # 10 tool implementations
        tool-defs.ts                    # Tool schemas (port from compass/tool-defs.ts)
        prompt.ts                       # 6-part prompt builder (port from compass/prompt.ts)
        executor.ts                     # Tool dispatcher (port from compass/executor.ts)
        memory.ts                       # Per-user memory (merge compass + co-presenter)
      ingestion/
        pipeline.ts                     # Orchestrator
        extractors.ts                   # PDF/DOCX/CSV/email extraction
        splitter.ts                     # Section splitting (port from lightrag/splitter.py)
        classifier.ts                   # Auto-categorization via Haiku
      auth/
        helpers.ts                      # RBAC (port from director/auth-helpers.ts)
        access.ts                       # Document access filtering (gates in code)
      db.ts                             # Prisma client singleton
      lightrag.ts                       # LightRAG API client (query, insert, delete)
      audit.ts                          # Audit logging helper (ATLAS pattern)
      tts.ts                            # TTS helpers (3-tier fallback)
    hooks/
      useSpeechRecognition.ts           # Port from co-presenter
      useElevenLabsTTS.ts               # Port from co-presenter
    components/
      ChatInterface.tsx                 # Main chat UI
      VoiceControls.tsx                 # Mic + speaker controls
      CitationCard.tsx                  # Source reference display
      DocumentUploader.tsx              # Drag-and-drop upload
      AdminLayout.tsx                   # Admin nav + sidebar
  prisma/
    schema.prisma                       # Full schema from Section 4
  docker-compose.yml                    # LightRAG + Ollama (from party/lightrag)
  worker/
    ingestion.ts                        # BullMQ consumer (standalone process)
  ENCOMPASS-SPEC.md                     # This file
  package.json
  tsconfig.json
  next.config.ts
  tailwind.config.ts
```

---

## 13. Source Files to Port

These are the exact files to adapt. Every pattern is production-proven.

| Source File | Destination | What It Does |
|---|---|---|
| `director/src/lib/compass/loop.ts` (368 lines) | `encompass/src/lib/agent/loop.ts` | ReAct agent loop |
| `director/src/lib/compass/prompt.ts` (251 lines) | `encompass/src/lib/agent/prompt.ts` | 6-part system prompt builder |
| `director/src/lib/compass/classifier.ts` (101 lines) | `encompass/src/lib/agent/classifier.ts` | Intent tier router |
| `director/src/lib/compass/tool-defs.ts` (670 lines) | `encompass/src/lib/agent/tool-defs.ts` | Tool schemas (rewrite for Encompass tools) |
| `director/src/lib/compass/executor.ts` (748 lines) | `encompass/src/lib/agent/executor.ts` | Tool dispatcher |
| `co-presenter/src/app/api/coach/route.ts` | `encompass/src/app/api/chat/route.ts` | Voice+memory conversation endpoint |
| `co-presenter/src/hooks/useSpeechRecognition.ts` | `encompass/src/hooks/` | Voice input hook |
| `co-presenter/src/hooks/useElevenLabsTTS.ts` | `encompass/src/hooks/` | Voice output hook |
| `co-presenter/src/lib/memory.ts` | `encompass/src/lib/agent/memory.ts` | Memory extraction (regex + Claude) |
| `party/lightrag/ingestion/ingest.py` | `encompass/src/lib/ingestion/pipeline.ts` | Hash-dedup ingestion (Python -> TS) |
| `party/lightrag/ingestion/splitter.py` | `encompass/src/lib/ingestion/splitter.ts` | Section splitting (Python -> TS) |
| `party/lightrag/docker-compose.yml` | `encompass/docker-compose.yml` | LightRAG + Ollama services |
| `director/src/lib/auth-helpers.ts` | `encompass/src/lib/auth/helpers.ts` | RBAC with Clerk orgs |
| `atlas/apps/web/src/lib/safety/audit-log.ts` (245 lines) | `encompass/src/lib/audit.ts` | Immutable append-only audit |

---

## 14. Phase Roadmap

### Phase 1: MVP (Weeks 1-8)
- **Wk 1-2:** Scaffold Next.js 16, Prisma schema, Clerk auth, basic layout
- **Wk 2-3:** Port Compass agent loop, classifier, prompt builder
- **Wk 3-4:** Build ingestion pipeline (upload, extract, split, LightRAG insert)
- **Wk 4-5:** Chat UI with citations, voice input/output
- **Wk 5-6:** Admin dashboard (documents, basic analytics, audit viewer)
- **Wk 6-7:** Per-user memory, access control (admin vs. member)
- **Wk 7-8:** Deploy, test with 1-2 pilot orgs, bug fixes

**MVP ships with:**
- Single-org setup (multi-tenant schema ready but single org for launch)
- Document upload (PDF, DOCX, TXT, MD) with LightRAG ingestion
- Chat interface (text + voice) with source citations
- 3 core tools: query_knowledge, search_documents, summarize_document
- Per-user memory
- Audit log (every query/response)
- Admin: doc management, basic stats
- Clerk auth (email/password, Google OAuth)
- Vercel + Railway deploy

**MVP explicitly defers:**
- SSO/SAML, connectors, public API, advanced RBAC, custom voice cloning, webhooks, scheduled re-ingestion

### Phase 2: v1.0 — Multi-Tenant Enterprise (Weeks 9-16)
- Full multi-tenant onboarding flow + Stripe billing
- SSO/SAML via Clerk Enterprise
- Department-level access policies
- Google Drive + SharePoint connectors
- Scheduled re-ingestion (cron-based change detection)
- Public API + API key management
- Slack/Teams bot (via API)
- Custom persona editor (markdown, in-admin)
- Token budget enforcement with graceful degradation
- All 10 tools live

### Phase 3: v2.0 — Intelligence Layer (Weeks 17-24)
- Knowledge gap detection ("these questions are asked frequently but can't be answered")
- Proactive notifications ("3 contracts expire this month")
- Custom tool authoring (admin defines org-specific tools)
- Webhook support
- Scheduled report generation + email delivery
- Per-org voice cloning (ElevenLabs Professional)
- Email ingestion connector
- Cross-org analytics (platform operator dashboard for Shane)
- Mobile-responsive optimization

---

## 15. Verification Plan

How to know each piece works:

1. **Ingestion:** Upload a 50-page PDF -> verify sections appear in LightRAG -> query returns relevant chunks with document metadata
2. **Chat:** Ask "What is the PTO policy?" -> agent queries knowledge -> returns answer with `[Doc: Employee Handbook, p.12]` citation
3. **Cross-reference:** Ask "Compare Q3 and Q4 revenue" -> agent calls query_knowledge twice -> synthesizes with dual citations
4. **Voice:** Speak a question -> transcription -> agent response -> TTS playback (test all 3 tiers)
5. **Access control:** Create HR-only folder -> upload doc -> verify member role cannot see it, admin can
6. **Audit:** Query the system -> verify audit log entry with query + response + citations + tool calls
7. **Memory:** Tell the system your name -> verify MemoryNode created -> next session greets by name
8. **Budget:** Set low token budget -> verify Haiku fallback at 90%, graceful message at 100%
9. **Tenant isolation:** Create two orgs -> upload different docs -> verify org A cannot see org B's knowledge
10. **API:** Generate API key -> `curl POST /api/v1/query` -> verify response with citations

---

*This spec represents the convergence of four production systems into one enterprise product. Every pattern referenced has been battle-tested with real users. Solace — take this and make it beautiful.*

*— Eli, Engineering Lead*
