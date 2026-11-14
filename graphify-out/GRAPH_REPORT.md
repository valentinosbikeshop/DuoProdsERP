# Graph Report - resilient-volta  (2026-11-13)

## Corpus Check
- 98 files · ~66,772 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .tsbuildinfo 1)

## Summary
- 433 nodes · 1688 edges · 28 communities (20 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f646b11`
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
1. `Button` - 65 edges
2. `cn()` - 61 edges
3. `react` - 44 edges
4. `createClient()` - 39 edges
5. `lucide-react` - 35 edges
6. `Input` - 34 edges
7. `next` - 31 edges
8. `formatCLP()` - 29 edges
9. `Card` - 27 edges
10. `CardHeader` - 27 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `getAuthenticatedContext()`  [EXTRACTED]
  src/app/api/ai/draft-assistant/route.ts → src/lib/supabase/admin.ts
- `POST()` --calls--> `getAuthenticatedContext()`  [EXTRACTED]
  src/app/api/ai/financial-advisor/route.ts → src/lib/supabase/admin.ts
- `LoginPage()` --calls--> `LoginForm()`  [EXTRACTED]
  src/app/(auth)/login/page.tsx → src/components/auth/login-form.tsx
- `PendingPage()` --calls--> `Button`  [EXTRACTED]
  src/app/(auth)/pending/page.tsx → src/components/ui/button.tsx
- `RegisterPage()` --calls--> `RegisterForm()`  [EXTRACTED]
  src/app/(auth)/register/page.tsx → src/components/auth/register-form.tsx

## Import Cycles
- None detected.

## Communities (28 total, 8 thin omitted)

### Community 0 - "governance/page.tsx"
Cohesion: 0.17
Nodes (37): lucide-react, react, EventsPage(), CompanyRow, GovernancePage(), UsersManagementSectionProps, CostFormDialog(), ConsolidateDialog() (+29 more)

### Community 1 - "package.json"
Cohesion: 0.11
Nodes (18): name, private, version, autoprefixer, class-variance-authority, clsx, eslint, eslint-config-next (+10 more)

### Community 2 - "createClient"
Cohesion: 0.16
Nodes (32): recharts, LoginPage(), PendingPage(), RegisterPage(), AnalyticsPage(), ReportPage(), TrashPage(), DashboardData (+24 more)

### Community 3 - "@google/genai"
Cohesion: 0.18
Nodes (5): @google/genai, POST(), runtime, POST(), runtime

### Community 4 - "createAdminClient"
Cohesion: 0.26
Nodes (14): GET(), isAuthorizedSuperAdmin(), PATCH(), DELETE(), dynamic, GET(), getAuthFlags(), PATCH() (+6 more)

### Community 5 - "Button"
Cohesion: 0.10
Nodes (37): jspdf, EventDetailPage(), NewEventPage(), getColumns(), AiSuggestionsGridProps, ConsolidateDialogProps, DistributeInsumoDialogProps, EditEventDialogProps (+29 more)

### Community 6 - "demo-seed.ts"
Cohesion: 0.13
Nodes (23): @supabase/supabase-js, dynamic, GET(), runtime, POST(), runtime, COST_CATEGORIES, DEMO_MAX_COSTS (+15 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 8 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority, clsx, @google/genai, html2canvas, jspdf, lucide-react, next (+11 more)

### Community 9 - "ai-suggestions-grid.tsx"
Cohesion: 0.18
Nodes (33): CostsPage(), UsersManagementSection(), CostFormDialogProps, CostsTable(), CostsTableProps, calcularBruto5050(), calcularLiquido5050(), calcularRetencionSII() (+25 more)

### Community 18 - "companies/route.ts"
Cohesion: 0.18
Nodes (12): zod, BankInfoSchema, CreateCompanySchema, dynamic, generateInviteCode(), POST(), runtime, slugify() (+4 more)

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
Cohesion: 0.15
Nodes (23): DashboardLayout(), Header(), HeaderProps, adminLinks, navLinks, Sidebar(), SidebarProps, DropdownMenu() (+15 more)

### Community 27 - "status/route.ts"
Cohesion: 0.28
Nodes (7): POST(), runtime, dynamic, GET(), runtime, getDemoQuotaStats(), resetDemoSession()

## Knowledge Gaps
- **11 isolated node(s):** `next/core-web-vitals`, `html2canvas`, `@types/node`, `@types/pdf-parse`, `@types/react` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 148 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `governance/page.tsx`, `package.json`, `createClient`, `@google/genai`, `createAdminClient`, `Button`, `demo-seed.ts`, `app/layout.tsx`, `companies/route.ts`, `client.ts`, `parse-file/route.ts`, `cn`, `status/route.ts`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `html2canvas`, `@types/node` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `react` connect `governance/page.tsx` to `package.json`, `createClient`, `Button`, `ai-suggestions-grid.tsx`, `cn`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.09608843537414966 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `demo-seed.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12535612535612536 - nodes in this community are weakly interconnected._