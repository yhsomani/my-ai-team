/**
 * Portfolio case-study catalog for the TalentSphere platform.
 *
 * Static, typed content — each case study is grounded in a real module that
 * ships in this repository. Every claim carries a `truthTags` entry whose
 * `evidence` names the file that backs it, so the showcase reads as
 * source-verifiable rather than copy.
 */

export interface PortfolioCategory {
  id: string;
  label: string;
}

export interface PortfolioSummary {
  headline: string;
  paragraph: string;
  focus: string[];
}

export interface PortfolioMetric {
  label: string;
  value: string;
}

export interface PortfolioTruthTag {
  claim: string;
  evidence: string;
}

export interface PortfolioCaseStudy {
  id: string;
  title: string;
  tagline: string;
  year: string;
  categories: string[];
  summary: string;
  highlights: string[];
  metrics: PortfolioMetric[];
  stack: string[];
  truthTags: PortfolioTruthTag[];
}

/**
 * Category filter list: a leading "All" chip plus the 11 unique categories
 * represented across the case studies. `id` is the filter key; `label` is
 * what renders on the chip.
 */
export const portfolioCategories: PortfolioCategory[] = [
  { id: 'all', label: 'All' },
  { id: 'fullstack', label: 'Full-stack systems' },
  { id: 'design', label: 'Design systems' },
  { id: 'ai', label: 'AI systems' },
  { id: 'data', label: 'Data pipelines' },
  { id: 'frontend', label: 'Frontend projects' },
  { id: 'backend', label: 'Backend services' },
  { id: 'cloud', label: 'Cloud/DevOps/Platform' },
  { id: 'security', label: 'Security/Infra' },
  { id: 'robustness', label: 'Data robustness' },
  { id: 'embedded', label: 'Mobile/Embedded' },
  { id: 'automation', label: 'Automation' },
];

export const portfolioSummary: PortfolioSummary = {
  headline: 'Senior full-stack engineering work, verified against source.',
  paragraph:
    'A curated set of production systems built with React 19, TypeScript, Redux Toolkit, and Supabase PostgREST. Each case study below is a real module shipped in the TalentSphere monorepo — not a mockup — and every claim is tagged with the file that proves it. Filter by category to narrow the showcase.',
  focus: [
    'Type-safe persistence and realtime across the stack',
    'A shared component system with themed design tokens',
    'Sandboxed challenge evaluation feeding an idempotent XP ledger',
    'Operational analytics aggregated into disposable KPI reports',
  ],
};

export const portfolioCaseStudies: PortfolioCaseStudy[] = [
  {
    id: 'talentsphere-platform',
    title: 'TalentSphere Unified Platform',
    tagline: 'An end-to-end learning-to-earning platform wired to live Supabase persistence.',
    year: '2026',
    categories: ['fullstack', 'backend', 'cloud', 'robustness'],
    summary:
      'The flagship monolith surface: role-based routing, lazy-loaded pages, Redux Toolkit slices, and a typed Supabase client with RLS-backed PostgREST queries. Public and protected routes share one registry so navigation, search, and access control stay in lockstep.',
    highlights: [
      'Single route registry drives nav, command search, and protected-route guards',
      'Typed PostgREST client with safe PGRST116 / 404 null-mapping',
      'Dev-mode mock auth with an E2E override for scripted sessions',
      '135 test files / 817 passing unit and integration tests',
    ],
    metrics: [
      { label: 'Test files', value: '135' },
      { label: 'Passing tests', value: '817' },
      { label: 'TS diagnostics', value: '0' },
    ],
    stack: ['React 19', 'TypeScript 6', 'Vite', 'Redux Toolkit', 'Supabase PostgREST', 'Tailwind CSS'],
    truthTags: [
      { claim: 'Routes are centrally registered', evidence: 'src/navigation/routeRegistry.ts' },
      { claim: 'App wires lazy routes through the registry', evidence: 'src/App.tsx' },
      { claim: 'Supabase session + dev fallback auth', evidence: 'src/lib/supabaseClient.ts, src/App.tsx' },
      { claim: 'Full suite is green', evidence: 'vitest run — 135 files, 817 tests, 0 failures' },
    ],
  },
  {
    id: 'aura-design-system',
    title: 'Aura Design System',
    tagline: 'A themeable component library every page renders through.',
    year: '2026',
    categories: ['design', 'frontend'],
    summary:
      'A small, dependency-light component system: AuraButton, GlassCard, Badge, AuraInput, AuraModal, source-status badges, and an AuraThemeProvider that swaps CSS-variable palettes. Every primitive carries accessible names, hidden SVG decorations, and guard tests.',
    highlights: [
      'Semantic CSS tokens (`--bg-primary`, `--text-secondary`, `--accent`) drive theming',
      'Badges ship a silent screen-reader description alongside visible copy',
      'Every icon is hidden from AT with `aria-hidden` + `focusable=false`',
      'Source-status badges mark which provider backs a live surface',
    ],
    metrics: [
      { label: 'Shared primitives', value: '20+' },
      { label: 'Guard tests', value: '1 per primitive' },
      { label: 'New deps', value: '0' },
    ],
    stack: ['React 19', 'TypeScript', 'Tailwind CSS', 'clsx + tailwind-merge'],
    truthTags: [
      { claim: 'Card/Header/Title primitives', evidence: 'src/components/shared/GlassCard.tsx' },
      { claim: 'Badge + sr-only description', evidence: 'src/components/shared/Badge.tsx' },
      { claim: 'CSS-var theme provider', evidence: 'src/components/shared/AuraThemeProvider.tsx' },
      { claim: 'Shared barrel keeps aliases wired', evidence: 'src/components/shared/index.ts' },
    ],
  },
  {
    id: 'challenge-xp-engine',
    title: 'Sandboxed Challenge Evaluation & XP Engine',
    tagline: 'Client-side worker evaluation that persists results into an idempotent XP ledger.',
    year: '2026',
    categories: ['ai', 'fullstack', 'backend'],
    summary:
      'The assessment pipeline: candidate code runs in a Web Worker, a pure `evaluateSampleCases` evaluator grades it against sample cases, submissions persist passed-test + score + feedback, and gamification awards XP exactly once via a deduplicated transaction keyed per submission.',
    highlights: [
      'Worker-based execution keeps the UI thread responsive',
      'Sample-case evaluator is pure and unit-tested in isolation',
      'Submission updates are idempotent — re-grading never double-awards',
      'Level formula `XP(L) = 50·L·(L−1)` with closed-form inversion',
    ],
    metrics: [
      { label: 'Grading rounds', value: '1 per submission' },
      { label: 'Double-award risk', value: '0 (idempotent key)' },
      { label: 'XP ledger', value: 'shared:lib/xpLedger.ts' },
    ],
    stack: ['Web Workers', 'TypeScript', 'Supabase PostgREST', 'Redux Toolkit'],
    truthTags: [
      { claim: 'Pure sample-case evaluator', evidence: 'src/lib/challengeEvaluation.ts' },
      { claim: 'Submission persistence + status mapping', evidence: 'src/services/challengeService.ts' },
      { claim: 'Idempotent XP award transaction', evidence: 'src/services/gamificationService.ts' },
      { claim: 'XP level formulas', evidence: 'src/lib/xpLedger.ts' },
    ],
  },
  {
    id: 'operational-analytics',
    title: 'Operational Analytics Data Pipeline',
    tagline: 'Disposable dashboards and CSV exports derived from real workflow events.',
    year: '2026',
    categories: ['data', 'robustness', 'automation'],
    summary:
      'A warehouse-light analytics layer: per-domain workflow analyzers (dashboard, recruiter funnel, notifications, LMS, billing) reduce raw events into deltas, a shared CSV exporter renders them for download, and a Node aggregation script turns them into KPI snapshots.',
    highlights: [
      'Analyzers are pure functions over event records — trivial to test',
      'CSV export escapes cells and handles missing fields defensively',
      'KPI aggregations run offline via Node, no dashboard dependency',
      'Every analyzer ships a focused unit test',
    ],
    metrics: [
      { label: 'Analyzer modules', value: '15+' },
      { label: 'CSV fields', value: 'fully escaped' },
      { label: 'Producer', value: 'scripts/run-kpi-aggregations.mjs' },
    ],
    stack: ['TypeScript', 'Node', 'Vitest', 'CSV'],
    truthTags: [
      { claim: 'Dashboard operational analytics', evidence: 'src/lib/dashboardOperationalAnalytics.ts' },
      { claim: 'Recruiter funnel reductions', evidence: 'src/lib/recruiterFunnelAnalytics.ts' },
      { claim: 'Safe CSV exporter', evidence: 'src/lib/csvExport.ts' },
      { claim: 'Offline KPI aggregation', evidence: 'scripts/run-kpi-aggregations.mjs' },
    ],
  },
];

export const getCategoriesForCaseStudy = (caseStudy: PortfolioCaseStudy): PortfolioCategory[] =>
  caseStudy.categories
    .map((id) => portfolioCategories.find((category) => category.id === id))
    .filter((category): category is PortfolioCategory => Boolean(category));

export const filterCaseStudies = (categoryFilter: string): PortfolioCaseStudy[] =>
  categoryFilter === 'all'
    ? portfolioCaseStudies
    : portfolioCaseStudies.filter((caseStudy) => caseStudy.categories.includes(categoryFilter));