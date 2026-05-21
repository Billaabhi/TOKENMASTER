# CLAUDE EFFICIENCY OS — Implementation Blueprint

## 1) Architecture Diagram

```mermaid
flowchart TD
    U[User] --> FE[Next.js App]
    FE --> API[Express API Gateway]
    API --> IIE[Intent Intelligence Engine]
    API --> SGR[Skill Generator]
    API --> PCE[Prompt Compression Engine]
    API --> TIC[Token Intelligence Center]
    API --> WML[Workflow Memory Layer]
    API --> CC[Claude Coach]
    API --> CCCC[Claude Code Coach]

    IIE --> PG[(PostgreSQL)]
    SGR --> PG
    PCE --> PG
    TIC --> PG
    WML --> PG
    CC --> PG
    CCCC --> PG

    API --> REDIS[(Redis Cache)]
    API --> WS[WebSocket Gateway]
    WS --> FE

    TIC --> CH[(ClickHouse Analytics)]
    API --> CH

    API --> LLM[Claude Chat / Claude Code / Cowork]

    subgraph Observability
      EVT[Event Bus (domain events)] --> TIC
      EVT --> CH
    end

    API --> EVT
```

## 2) Folder Structure

```text
claude-efficiency-os/
├── apps/
│   ├── web/                                 # Next.js + TS + Tailwind + shadcn
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── skill-builder/
│   │   │   ├── prompt-optimizer/
│   │   │   ├── token-center/
│   │   │   ├── workflow-vault/
│   │   │   ├── claude-coach/
│   │   │   ├── claude-code-coach/
│   │   │   └── analytics/
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   └── api/                                 # Express + WS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── intent-intelligence/
│   │   │   │   ├── skill-generator/
│   │   │   │   ├── token-intelligence/
│   │   │   │   ├── prompt-compression/
│   │   │   │   ├── workflow-memory/
│   │   │   │   ├── claude-coach/
│   │   │   │   └── claude-code-coach/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── events/
│       │   ├── db/
│       │   └── ws/
│       └── tests/
├── packages/
│   ├── shared-types/
│   ├── prompt-registry-sdk/
│   └── analytics-sdk/
├── skills/
│   ├── dashboard-architect/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   ├── examples/
│   │   └── scripts/
│   ├── auth-modifier/
│   └── api-debugger/
├── infra/
│   ├── docker/
│   ├── k8s/
│   ├── clickhouse/
│   ├── postgres/
│   └── redis/
├── docs/
│   ├── adr/
│   ├── api/
│   └── runbooks/
└── seed/
    ├── postgres/
    └── clickhouse/
```

## 3) DB Schema (PostgreSQL)

```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- skills
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  identity TEXT NOT NULL,
  mission TEXT NOT NULL,
  workflow_md TEXT NOT NULL,
  framework_tags TEXT[] NOT NULL DEFAULT '{}',
  prompt_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_modes JSONB NOT NULL DEFAULT '[]'::jsonb,
  optimizations JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug, version)
);

-- flows
CREATE TABLE flows (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- FLOW_001
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps JSONB NOT NULL,
  linked_skill_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

-- prompt_templates
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- PROMPT_001
  title TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

-- workflow_objects
CREATE TABLE workflow_objects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_code TEXT NOT NULL, -- ARCH_001 / FLOW_001 / SKILL_001
  object_type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  embedding VECTOR(1536),
  usage_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, object_code)
);

-- token_logs
CREATE TABLE token_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID,
  request_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  estimated_cost_usd NUMERIC(10,6) NOT NULL,
  repeated_context_tokens INT NOT NULL DEFAULT 0,
  compression_applied BOOLEAN NOT NULL DEFAULT FALSE,
  waste_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id)
);

-- compression_registry
CREATE TABLE compression_registry (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compressed_code TEXT NOT NULL, -- ARCH_001 etc.
  source_hash TEXT NOT NULL,
  source_text TEXT NOT NULL,
  compressed_payload JSONB NOT NULL,
  token_saved INT NOT NULL DEFAULT 0,
  reuse_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, compressed_code),
  UNIQUE(user_id, source_hash)
);

-- sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- claude_chat | claude_code | cowork
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  summary TEXT,
  efficiency_score NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- analytics snapshot cache
CREATE TABLE analytics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_key DATE NOT NULL,
  token_saved INT NOT NULL DEFAULT 0,
  reuse_count INT NOT NULL DEFAULT 0,
  repeated_prompt_count INT NOT NULL DEFAULT 0,
  efficiency_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date_key)
);
```

## 4) API Routes

### Intent + Execution
- `POST /v1/intents/detect`
- `POST /v1/intents/expand`
- `POST /v1/executions/plan`
- `POST /v1/executions/run`

### Skills
- `POST /v1/skills/generate`
- `GET /v1/skills`
- `GET /v1/skills/:id`
- `PATCH /v1/skills/:id`
- `POST /v1/skills/:id/publish`

### Prompt Compression
- `POST /v1/compression/analyze`
- `POST /v1/compression/commit`
- `GET /v1/compression/registry`
- `POST /v1/compression/rewrite`

### Workflow Memory
- `POST /v1/workflow-objects`
- `GET /v1/workflow-objects`
- `GET /v1/workflow-objects/:code`
- `POST /v1/workflow-objects/:code/reuse`

### Token Intelligence
- `POST /v1/token-logs`
- `GET /v1/token-center/summary`
- `GET /v1/token-center/spikes`
- `GET /v1/token-center/waste-score`

### Coaching
- `POST /v1/coach/recommendations`
- `POST /v1/code-coach/review-prompt`
- `POST /v1/code-coach/incremental-plan`

### Analytics
- `GET /v1/analytics/overview`
- `GET /v1/analytics/skills`
- `GET /v1/analytics/reuse`
- `GET /v1/analytics/prompts/repeated`

### Realtime
- `WS /v1/ws/live-coach`
- `WS /v1/ws/token-stream`

## 5) Event Models

```ts
type BaseEvent = {
  eventId: string;
  userId: string;
  sessionId?: string;
  ts: string; // ISO
};

type IntentDetected = BaseEvent & {
  type: "intent.detected";
  payload: {
    rawPrompt: string;
    task: string;
    category: "engineering" | "product" | "analysis";
    stack: string[];
    complexity: "low" | "medium" | "high";
    confidence: number;
  };
};

type SkillGenerated = BaseEvent & {
  type: "skill.generated";
  payload: { skillId: string; slug: string; sourceIntentId: string };
};

type CompressionApplied = BaseEvent & {
  type: "compression.applied";
  payload: {
    sourceHash: string;
    compressedCode: string;
    tokenBefore: number;
    tokenAfter: number;
    tokenSaved: number;
  };
};

type TokenSpikeDetected = BaseEvent & {
  type: "token.spike.detected";
  payload: {
    requestId: string;
    spikeRatio: number;
    suspectedCause: "repeated_context" | "prompt_loop" | "overspecification";
  };
};
```

## 6) Skill Templates

```md
# SKILL: {{skill_title}}

## Identity
You are {{identity}}.

## Mission
{{mission}}

## Input Contract
- task:
- stack:
- constraints:
- output format:

## Workflow
1. Parse intent into task object.
2. Retrieve reusable objects (FLOW_*, ARCH_*, PROMPT_*).
3. Propose minimal-diff execution plan.
4. Emit implementation-ready output only.

## Frameworks
- {{framework_1}}
- {{framework_2}}

## Prompt Patterns
- Pattern A: {{pattern_a}}
- Pattern B: {{pattern_b}}

## Failure Modes
- Over-broad rewrite requests.
- Missing acceptance criteria.
- Hidden environment constraints.

## Optimization Rules
- Reuse object codes instead of long context.
- Prefer incremental edits over full rewrites.
- Always produce compact structured outputs.

## Examples
### Input
{{example_input}}

### Output
{{example_output}}
```

## 7) Token Engine Logic

```ts
export function computeTokenWasteScore(input: {
  inputTokens: number;
  outputTokens: number;
  repeatedContextTokens: number;
  retries: number;
  overflowEvents: number;
  compressionApplied: boolean;
}) {
  const total = input.inputTokens + input.outputTokens;
  const repeatRate = input.repeatedContextTokens / Math.max(1, input.inputTokens);
  const retryPenalty = Math.min(20, input.retries * 4);
  const overflowPenalty = Math.min(25, input.overflowEvents * 8);
  const compressionBonus = input.compressionApplied ? 10 : 0;

  let score = 0;
  score += Math.min(40, repeatRate * 100 * 0.4);
  score += retryPenalty;
  score += overflowPenalty;
  score += total > 12000 ? 15 : total > 6000 ? 8 : 2;
  score -= compressionBonus;

  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}
```

Alert thresholds:
- `0-24`: healthy
- `25-49`: moderate waste
- `50-74`: high waste
- `75-100`: critical

## 8) Compression Engine Logic

```ts
export function compressPrompt(input: {
  rawPrompt: string;
  userId: string;
  objectTypeHint?: "ARCH" | "FLOW" | "PROMPT" | "SKILL";
}) {
  const normalized = normalize(input.rawPrompt);
  const sourceHash = sha256(normalized);

  const existing = registry.findByHash(input.userId, sourceHash);
  if (existing) return { mode: "reuse", code: existing.compressedCode };

  const summary = extractAtomicSpecs(normalized);
  const objectType = input.objectTypeHint ?? inferObjectType(summary);
  const code = registry.nextCode(input.userId, objectType); // e.g. ARCH_001

  const payload = {
    goals: summary.goals,
    constraints: summary.constraints,
    stack: summary.stack,
    acceptance: summary.acceptance,
    dependencies: summary.dependencies,
  };

  registry.save({
    userId: input.userId,
    compressedCode: code,
    sourceHash,
    sourceText: input.rawPrompt,
    compressedPayload: payload,
    tokenSaved: estimateSavedTokens(input.rawPrompt, payload),
  });

  return { mode: "created", code, payload };
}
```

Registry rules:
- deterministic hashing for dedupe
- user-scoped code namespaces
- immutable history with up-versioning (`ARCH_001@v2`)

## 9) UI Wireframes (textual)

### Dashboard
- KPI row: token saved, efficiency score, repeated prompts, reuse count
- trend graph: token usage vs saved
- right rail: live Claude Coach suggestions

### Skill Builder
- left: detected intent + inferred task object
- center: generated SKILL.md editor
- right: preview + test run

### Prompt Optimizer
- input area (raw prompt)
- diff panel (before token count vs compressed object)
- registry match/reuse suggestions

### Token Center
- session table + waste score heatmap
- spike timeline + root cause tags
- cost estimator by model/channel

### Workflow Vault
- searchable cards: FLOW_*, ARCH_*, PROMPT_*, SKILL_*
- object usage analytics + quick insert actions

### Claude Coach
- recommendation feed with severity and one-click actions

### Claude Code Coach
- “bad prompt” to “good incremental prompt” converter
- diff strategy checklist

### Analytics
- token reduction %
- top repeated prompts
- skill adoption funnel
- time saved estimate

## 10) MVP Plan (6 weeks)

- Week 1: core schema + auth + session ingestion
- Week 2: intent detection + workflow object CRUD
- Week 3: compression registry + token logging
- Week 4: skill generator + SKILL.md export
- Week 5: dashboard + token center + live coach WS
- Week 6: hardening, QA, seed rollout, pilot users

Success metrics:
- 30% token reduction median by week 2 usage
- 40%+ workflow object reuse rate
- <2s P95 recommendation latency

## 11) Production Roadmap

- Phase 1: single-user workspace (MVP)
- Phase 2: team workspaces + shared skill libraries
- Phase 3: auto-refactor coach for Claude Code repositories
- Phase 4: policy engine + enterprise governance
- Phase 5: marketplace for validated SKILL packs

## 12) Implementation Checklist

- [ ] Initialize monorepo and CI
- [ ] Provision Postgres/Redis/ClickHouse via Docker
- [ ] Implement auth + user/session APIs
- [ ] Implement intent detection service
- [ ] Implement workflow object registry
- [ ] Implement compression service + dedupe
- [ ] Implement token ingestion + waste score
- [ ] Build Skill Generator and SKILL.md renderer
- [ ] Build Dashboard and Token Center UI
- [ ] Build Coach and Code Coach recommendation APIs
- [ ] Add WS streams for live events
- [ ] Seed demo data and baseline analytics
- [ ] Add E2E tests and load tests

## 13) Seed Data

```sql
INSERT INTO users (id,email,name,plan)
VALUES ('11111111-1111-1111-1111-111111111111','demo@ceos.ai','Demo User','pro');

INSERT INTO workflow_objects (id,user_id,object_code,object_type,title,payload,usage_count)
VALUES
('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','FLOW_001','FLOW','Feature Delivery Flow','{"steps":["intent","plan","diff","verify"]}',12),
('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','ARCH_001','ARCH','NextJS Modular Architecture','{"stack":["NextJS","Express","Redis"]}',8),
('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','PROMPT_001','PROMPT','Incremental edit prompt','{"pattern":"modify X, keep Y"}',24);

INSERT INTO token_logs (id,user_id,request_id,model,input_tokens,output_tokens,total_tokens,estimated_cost_usd,repeated_context_tokens,compression_applied,waste_score)
VALUES
('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','req_001','claude-sonnet',3400,900,4300,0.032100,1200,true,28.50),
('66666666-6666-6666-6666-666666666666','11111111-1111-1111-1111-111111111111','req_002','claude-sonnet',6200,1400,7600,0.056200,3000,false,67.90);
```

## 14) Risks

- Intent misclassification causes wrong skill retrieval.
- Over-compression drops critical constraints.
- Token pricing drift invalidates cost estimates.
- User trust risk if coach feedback is noisy.
- Realtime stream backpressure under high event volume.
- Privacy concerns for stored prompts and workflow artifacts.

Mitigations:
- confidence thresholds + fallback human confirmation
- reversible compression with source-link traceability
- nightly pricing sync + historical cost versioning
- recommendation precision scoring
- queue-based WS fanout with rate limits
- encryption-at-rest + scoped retention policies

## 15) Engineering Decisions (ADR-style summary)

1. **Object-code memory model over prompt replay**: choose `FLOW_* / ARCH_* / SKILL_*` primitives to reduce repeated context.
2. **Event-driven analytics**: domain events feed ClickHouse asynchronously; operational writes stay in Postgres.
3. **Hybrid retrieval**: deterministic code lookup first, vector similarity second.
4. **Incremental edit-first coaching**: Code Coach outputs minimal diff prompts, not rewrite prompts.
5. **Compression as reversible transform**: every compressed object maps back to source hash + source text.
6. **Real-time feedback loop**: WebSocket coach for immediate behavior correction.

---

## Example Structured Task Object Output

```json
{
  "task": "dashboard",
  "category": "engineering",
  "stack": ["NextJS"],
  "taskType": "feature-build",
  "complexity": "high",
  "constraints": ["incremental edits", "reuse FLOW_001 where possible"]
}
```
