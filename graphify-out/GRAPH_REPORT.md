# Graph Report - resilient-volta  (2026-11-14)

## Corpus Check
- 102 files · ~69,812 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 445 nodes · 1791 edges · 28 communities (20 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4bac19f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- governance/page.tsx
- package.json
- createClient
- @google/genai
- createAdminClient
- Button
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
- next
- parse-file/route.ts
- allowScripts
- scripts
- tailwind.config.ts
- cn
- status/route.ts

## God Nodes (most connected - your core abstractions)
1. `Button` - 71 edges
2. `cn()` - 61 edges
3. `react` - 46 edges
4. `createClient()` - 43 edges
5. `lucide-react` - 38 edges
6. `Input` - 38 edges
7. `next` - 33 edges
8. `Card` - 33 edges
9. `CardContent` - 33 edges
10. `CardHeader` - 31 edges

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

## Communities (28 total, 8 thin omitted)

### Community 0 - "governance/page.tsx"
Cohesion: 0.17
Nodes (37): lucide-react, react, EventsPage(), CompanyRow, GovernancePage(), UsersManagementSectionProps, CostFormDialog(), ConsolidateDialog() (+29 more)

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): name, private, version, autoprefixer, clsx, eslint, eslint-config-next, html2canvas (+7 more)

### Community 2 - "createClient"
Cohesion: 0.17
Nodes (34): recharts, LoginPage(), MfaChallengePage(), PendingPage(), RegisterPage(), ReportPage(), TrashPage(), DashboardData (+26 more)

### Community 3 - "@google/genai"
Cohesion: 0.18
Nodes (5): @google/genai, POST(), runtime, POST(), runtime

### Community 4 - "createAdminClient"
Cohesion: 0.24
Nodes (15): GET(), isAuthorizedSuperAdmin(), PATCH(), POST(), DELETE(), dynamic, GET(), getAuthFlags() (+7 more)

### Community 5 - "Button"
Cohesion: 0.08
Nodes (38): jspdf, react-dom, AnalyticsPage(), EventDetailPage(), NewEventPage(), AiSuggestionsGridProps, ConsolidateDialogProps, DistributeInsumoDialogProps (+30 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.13
Nodes (22): @supabase/supabase-js, dynamic, GET(), runtime, POST(), runtime, DEMO_MAX_COSTS, DEMO_MAX_EVENTS (+14 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, @google/genai, html2canvas, jspdf, lucide-react, next (+11 more)

### Community 9 - "ai-suggestions-grid.tsx"
Cohesion: 0.15
Nodes (39): class-variance-authority, @tanstack/react-table, CostsPage(), UsersManagementSection(), getColumns(), CostFormDialogProps, CostsTable(), CostsTableProps (+31 more)

### Community 18 - "companies/route.ts"
Cohesion: 0.15
Nodes (15): zod, BankInfoSchema, CreateCompanySchema, dynamic, generateInviteCode(), POST(), runtime, slugify() (+7 more)

### Community 19 - "client.ts"
Cohesion: 0.36
Nodes (6): UserRow, PendingUsersTableProps, AuthenticatedContext, Database, OrganizationBankInfo, Profile

### Community 20 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/pdf-parse (+3 more)

### Community 21 - "next"
Cohesion: 0.31
Nodes (7): next, @supabase/ssr, GET(), updateSession(), createClient(), config, middleware()

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

### Community 26 - "cn"
Cohesion: 0.16
Nodes (22): DashboardLayout(), Header(), HeaderProps, adminLinks, navLinks, Sidebar(), SidebarProps, DropdownMenu() (+14 more)

### Community 27 - "status/route.ts"
Cohesion: 0.28
Nodes (7): POST(), runtime, dynamic, GET(), runtime, getDemoQuotaStats(), resetDemoSession()

## Knowledge Gaps
- **11 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/node`, `@types/pdf-parse`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 152 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `governance/page.tsx`, `package.json`, `createClient`, `@google/genai`, `createAdminClient`, `Button`, `demo-seed.ts`, `app/layout.tsx`, `companies/route.ts`, `client.ts`, `parse-file/route.ts`, `cn`, `status/route.ts`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/node` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `react` connect `governance/page.tsx` to `package.json`, `createClient`, `Button`, `ai-suggestions-grid.tsx`, `cn`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.0815686274509804 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `demo-seed.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13230769230769232 - nodes in this community are weakly interconnected._