# Graph Report - resilient-volta  (2026-11-14)

## Corpus Check
- 104 files · ~79,840 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 476 nodes · 1933 edges · 27 communities (19 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f79d105`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- governance/page.tsx
- package.json
- createClient
- @google/genai
- createAdminClient
- costs/page.tsx
- demo-seed.ts
- compilerOptions
- dependencies
- ai-suggestions-grid.tsx
- app/layout.tsx
- .eslintrc.json
- next.config.mjs
- autonomous_execution.md
- vercel.json
- companies/route.ts
- client.ts
- devDependencies
- parse-file/route.ts
- allowScripts
- scripts
- tailwind.config.ts
- Button
- status/route.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 75 edges
2. `cn()` - 63 edges
3. `react` - 49 edges
4. `createClient()` - 47 edges
5. `lucide-react` - 42 edges
6. `Input` - 40 edges
7. `Card` - 35 edges
8. `CardContent` - 35 edges
9. `next` - 33 edges
10. `formatCLP()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `getAuthenticatedContext()`  [EXTRACTED]
  src/app/api/ai/draft-assistant/route.ts → src/lib/supabase/admin.ts
- `POST()` --calls--> `getAuthenticatedContext()`  [EXTRACTED]
  src/app/api/ai/financial-advisor/route.ts → src/lib/supabase/admin.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `MfaChallengePage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/button.tsx
- `MfaChallengePage()` --calls--> `Input`  [EXTRACTED]
  src/app/(auth)/mfa-challenge/page.tsx → src/components/ui/input.tsx

## Import Cycles
- None detected.

## Communities (27 total, 8 thin omitted)

### Community 0 - "governance/page.tsx"
Cohesion: 0.15
Nodes (44): lucide-react, react, NewEventPage(), CompanyRow, GovernancePage(), UsersManagementSectionProps, calcularBruto5050(), calcularLiquido5050() (+36 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (16): name, private, version, autoprefixer, clsx, eslint, eslint-config-next, html2canvas (+8 more)

### Community 2 - "createClient"
Cohesion: 0.11
Nodes (50): jspdf, recharts, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), AnalyticsPage(), ReportPage() (+42 more)

### Community 3 - "@google/genai"
Cohesion: 0.15
Nodes (9): @google/genai, next, POST(), runtime, POST(), runtime, updateSession(), config (+1 more)

### Community 4 - "createAdminClient"
Cohesion: 0.22
Nodes (16): GET(), isAuthorizedSuperAdmin(), PATCH(), POST(), DELETE(), dynamic, GET(), getAuthFlags() (+8 more)

### Community 5 - "costs/page.tsx"
Cohesion: 0.12
Nodes (32): @tanstack/react-table, CostsPage(), getColumns(), RESOURCE_BADGE_STYLES, ResourceIcon(), CostFormDialog(), CostFormDialogProps, RESOURCE_OPTIONS (+24 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.15
Nodes (19): @supabase/supabase-js, dynamic, GET(), runtime, POST(), runtime, DEMO_MAX_COSTS, DEMO_MAX_EVENTS (+11 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, @google/genai, html2canvas, jspdf, lucide-react, next (+11 more)

### Community 9 - "ai-suggestions-grid.tsx"
Cohesion: 0.21
Nodes (24): UsersManagementSection(), AiSuggestionsGrid(), AiSuggestionsGridProps, emptySuggestion, GridAction, ConsolidateDialogProps, DistributeInsumoDialogProps, EventItemsTable() (+16 more)

### Community 18 - "companies/route.ts"
Cohesion: 0.14
Nodes (15): zod, BankInfoSchema, CreateCompanySchema, dynamic, EXTRA_STARTER_COSTS, generateInviteCode(), POST(), runtime (+7 more)

### Community 19 - "client.ts"
Cohesion: 0.24
Nodes (9): @supabase/ssr, GET(), UserRow, PendingUsersTableProps, AuthenticatedContext, createClient(), Database, OrganizationBankInfo (+1 more)

### Community 20 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/pdf-parse (+3 more)

### Community 22 - "parse-file/route.ts"
Cohesion: 0.29
Nodes (7): pdf-parse, xlsx, ALLOWED_EXTENSIONS, ALLOWED_TYPES, POST(), runtime, verifyAuth()

### Community 23 - "allowScripts"
Cohesion: 0.33
Nodes (6): allowScripts, core-js, @google/genai, protobufjs, unrs-resolver, wnrs-resolver

### Community 24 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 25 - "tailwind.config.ts"
Cohesion: 0.50
Nodes (3): tailwindcss, tailwindcss-animate, config

### Community 26 - "Button"
Cohesion: 0.08
Nodes (49): class-variance-authority, EventDetailPage(), DashboardLayout(), FileUpload(), FileUploadProps, FloatingDraftAssistant(), Message, FloatingFinancialAdvisor() (+41 more)

### Community 27 - "status/route.ts"
Cohesion: 0.29
Nodes (8): POST(), runtime, dynamic, GET(), runtime, ensureDemoEnvironment(), getDemoQuotaStats(), resetDemoSession()

## Knowledge Gaps
- **11 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/node`, `@types/pdf-parse`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 169 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `@google/genai` to `governance/page.tsx`, `package.json`, `createClient`, `createAdminClient`, `costs/page.tsx`, `demo-seed.ts`, `app/layout.tsx`, `companies/route.ts`, `client.ts`, `parse-file/route.ts`, `Button`, `status/route.ts`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/node` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `governance/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14611338398597312 - nodes in this community are weakly interconnected._
- **Why does `react` connect `governance/page.tsx` to `package.json`, `createClient`, `costs/page.tsx`, `ai-suggestions-grid.tsx`, `Button`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.11055611055611056 - nodes in this community are weakly interconnected._