# Enterprise Web UI Standardization Platform

Analyze uploaded HTML/CSS projects, detect UI components without relying on class
names, map them to a central Design System, and generate a standardized copy of
the project — **without ever modifying the original source**.

This repository implements **Phase 1 (Foundation)**, **Phase 2 (Analysis Engine)**
and **Phase 3 (Transformation Engine)** of the platform spec. The transformation
engine is deterministic and rule-based (no AI in these phases).

---

## 1. Implemented features

### Phase 1 — Foundation
- Project structure split into a framework-agnostic engine, shared types, API
  route handlers, and a Next.js frontend.
- Central **Design System v1** (colors, typography, spacing, radius, shadows,
  component library) exposed as tokens and CSS custom properties, versioned.
- **Safe project upload**: ZIP archives or single HTML/CSS files, with
  protection against path traversal, archive bombs, oversized files, excessive
  file counts, and disallowed executables.
- **Persistence/storage abstractions** (file-backed by default) with a
  documented Prisma/PostgreSQL + S3 migration path.

### Phase 2 — Analysis Engine
- **HTML parsing** with `parse5`: DOM hierarchy, attributes, classes, ids, text,
  inline styles, stylesheet references, stable per-element source references.
- **CSS analysis** with `PostCSS`: selectors, declarations, specificity, source
  order, media queries, custom properties, `!important`, hover/focus states.
  Declarations are resolved onto elements via a cascade; anything that needs a
  live browser is reported as **unresolved**, never invented.
- **Multi-signal component detection**: semantic HTML > roles/attributes >
  structure > styling heuristics. A styled `<div>` is only ever a *candidate*.
- **Design-property extraction + findings** compared against the Design System,
  distinguishing real violations from unclassified exceptions.

### Phase 3 — Transformation Engine
- **Deterministic component mapping** (configurable rules) separating detection,
  target selection, eligibility, and code modification.
- **CSS normalization** via the PostCSS AST (not string replacement): maps exact
  / near token colors, radius, spacing, typography. Off-palette colors (e.g.
  error red) are preserved. `!important` is flagged for review.
- **HTML transformation** that only *adds* standardized classes to confidently
  detected semantic components and **never changes tags**. Candidates are flagged
  `needs-review`.
- **Standardized output project** generated separately, with an injected
  `ds-tokens.css`, a structured `transformation-report.json`, and full change
  records.
- **Static post-transform validation**: re-parse HTML/CSS, verify stylesheet
  references, confirm output exists and the original is untouched. The report is
  explicit that static validation does **not** guarantee behavioral parity.

---

## 2. Architecture

```
weboper/
├── packages/
│   ├── shared/src/        # shared TypeScript contracts (types.ts)
│   └── core/src/          # framework-agnostic engine
│       ├── design-system/ # tokens, color utilities
│       ├── upload/        # safe zip extraction + validation
│       ├── analysis/      # parse5 + postcss + detection + findings
│       ├── transformation/# mapping + css/html transforms + orchestration
│       └── project/       # in-memory workspace, css resolution
├── app/
│   ├── api/               # REST route handlers (thin controllers)
│   ├── lib/               # service, repository, storage, api client
│   ├── components/        # UI primitives + analysis/transform views
│   ├── projects/[id]/     # project detail (analysis + transform)
│   ├── upload/            # upload page
│   └── design-system/     # design system browser
├── prisma/schema.prisma   # PRODUCTION persistence model (deferred)
├── docker-compose.yml     # optional Postgres + MinIO (deferred)
├── tests/                 # vitest unit/integration + live E2E
└── .env.example
```

**Why a single Next.js app instead of a separate NestJS service?** The spec
recommends NestJS + PostgreSQL + Redis + MinIO. That production topology needs
infrastructure that is not required to validate the MVP. The engine lives in a
standalone `packages/core` with zero Next.js coupling, and the API route handlers
are thin controllers that call service methods — the exact separation a NestJS
controller/service split provides. Porting to NestJS means moving `packages/core`
as-is and reimplementing the `Repository`/`ObjectStorage` interfaces against
Prisma/S3. See "Production migration path" below.

---

## 3. Setup

Requirements: Node.js 20+ (tested on Node 24), npm.

```bash
npm install
cp .env.example .env    # optional; MVP runs with defaults
```

No database or object storage is required for the MVP. Project metadata and
artifacts are stored under `./storage` (git-ignored).

---

## 4. Running

```bash
npm run dev       # start the app at http://localhost:3000
npm run build     # production build
npm start         # run the production build
```

### Tests

```bash
npm test          # unit + integration tests (vitest)
npm run typecheck # tsc --noEmit
npm run lint      # eslint

# live end-to-end against a running dev server:
npm run dev       # in one terminal
npm run e2e       # in another — drives upload → analyze → transform → export
```

---

## 5. API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Project record (incl. analysis + history) |
| DELETE | `/api/projects/:id` | Delete a project |
| POST | `/api/projects/:id/upload` | Upload ZIP or HTML/CSS (multipart `file`) |
| POST | `/api/projects/:id/validate` | Re-validate stored project |
| POST | `/api/projects/:id/analyze` | Run analysis |
| GET | `/api/projects/:id/analysis` | Get analysis result |
| GET | `/api/projects/:id/components` | Detected components |
| POST | `/api/projects/:id/transform` | Transform (body: `{ categories?: [...] }`) |
| GET | `/api/projects/:id/transformations` | List transformation versions |
| GET | `/api/projects/:id/transformations/:version` | One transformation report |
| GET | `/api/projects/:id/export?version=N` | Download standardized ZIP |
| GET | `/api/design-system/tokens` | Design tokens |
| GET | `/api/design-system/components` | Component library |

Responses are typed JSON. Errors use `{ error: { code, message } }` with
appropriate HTTP status codes. Operations only report success after the
underlying work actually completes.

---

## 6. Example input and output

**Input** (`index.html` + `styles/main.css`):

```css
.submit-btn { background-color: #73493a; border-radius: 4px; }
.alert-error { background-color: #cc0000; }   /* off-palette */
```

```html
<button class="submit-btn">Submit</button>
<div class="action-button" onclick="go()" tabindex="0">Go</div>
```

**Generated output** (`standardized-vN.zip`):

```css
.submit-btn { background-color: var(--color-primary); border-radius: var(--radius-small); }
.alert-error { background-color: #cc0000; }   /* preserved — not a token */
```

```html
<button class="submit-btn ds-button ds-button--primary">Submit</button>
<!-- the div stays a div; recorded as a needs-review change, never auto-promoted -->
```

Plus `styles/ds-tokens.css` (the `:root` token block) linked into each page, and a
`transformation-report.json` listing every change with before/after, rule, and
status.

---

## 7. Environment variables

See `.env.example`. The MVP only needs the defaults (`STORAGE_DRIVER=local`).
`DATABASE_URL` and the `S3_*` variables are for the deferred production path.

---

## 8. Production migration path (deferred)

1. `docker compose up -d postgres minio`
2. Set `DATABASE_URL` and run `npx prisma migrate dev` against
   `prisma/schema.prisma`.
3. Implement `PrismaRepository` (against `app/lib/repository.ts`'s `Repository`
   interface) and `S3ObjectStorage` (against `app/lib/storage.ts`'s
   `ObjectStorage` interface). No caller changes required.
4. Optionally extract `packages/core` into a NestJS service and point the web app
   at it.

---

## 9. Known limitations and unsupported cases

- **Static analysis only.** No browser rendering engine runs, so computed layout
  and properties that depend on cascade state beyond simple selectors are marked
  *unresolved* rather than guessed.
- **No framework conversion.** React/Vue/Angular transformation is out of scope
  for these phases (adapters are stubbed via the mapping layer).
- **JavaScript is never executed** and its behavior is not guaranteed to be
  preserved. JS presence produces a warning.
- **Selector matching is intentionally limited** to tag/`.class`/`#id` compound
  selectors. Descendant/sibling combinators and attribute/pseudo selectors mark
  affected properties unresolved.
- **Behavioral parity is not guaranteed** by a passing static validation. The
  transformation report states this explicitly.
- **Preview/before-after, approval/rollback, compliance scoring, AI assistance,
  auth/roles, and publishing** belong to later phases and are not implemented here.

---

## 10. Acceptance criteria checklist

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Upload a ZIP of HTML + CSS | ✅ |
| 2 | Backend validates and stores the original | ✅ |
| 3 | Parse HTML and CSS | ✅ |
| 4 | Identify UI elements without relying on class names | ✅ |
| 5 | Report colors, typography, spacing, component candidates | ✅ |
| 6 | Map eligible components/properties to the Design System | ✅ |
| 7 | Generate a separate standardized output project | ✅ |
| 8 | Generated HTML/CSS re-parse successfully | ✅ |
| 9 | Transformation report lists actual changes | ✅ |
| 10 | Original uploaded project remains unchanged | ✅ |
| 11 | Uncertain transformations produce warnings, not silent edits | ✅ |
| 12 | Errors displayed clearly in the frontend | ✅ |
| 13 | Automated tests cover parsing, mapping, transformation, validation | ✅ (24 unit + live E2E) |

Representative fixtures (`tests/fixtures.ts`) include inconsistent class names,
semantic HTML, conflicting CSS, an off-palette error color, and an ambiguous
custom-element button candidate.
```
