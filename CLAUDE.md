# CLAUDE.md — PlexusMap (v2)

> **Drift documental**: V1 de este archivo describía Praetor por error.
> Backup en `.claude/CLAUDE.md.backup-praetor`. Regenerado 25-may-2026 durante audit.

## Identidad

PlexusMap es un directorio geolocalizado de profesionales de salud en Panama.
Funnel de adquisicion gratuito del ecosistema **Augur**:

- **PlexusMap** (este proyecto) — directorio publico, SEO-first, claim flow
- **Kairos** — gestion de rendimiento de agenda (SaaS $49-249/mes)
- **Praetor** — WhatsApp + IA (infraestructura + Nexus inbox)
- **Exactor** — facturacion electronica Panama (DGI)
- **Ludus** — CRM interno optica del founder (no se vende)

Mercado: Panama (Ciudad de Panama). UI en espanol (es-PA). Codigo en ingles.

## Stack

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| Frontend | React | 19.2.4 |
| Lenguaje | TypeScript (strict) | 5.x |
| CSS | Tailwind CSS | 4.x |
| ORM | Prisma | 5.22.0 |
| DB | PostgreSQL (Docker) | 16 |
| Auth | NextAuth.js (Credentials + JWT) | 4.24.13 |
| State | Zustand | 5.0.12 |
| Validacion | Zod | 4.3.6 |
| Mapas | @vis.gl/react-google-maps + @googlemaps/markerclusterer | 1.8.2 / 2.6.2 |
| Hashing | bcryptjs | 3.0.3 |

## Comandos

```bash
docker start dental_db           # PostgreSQL container
npm run dev                      # Dev server (default port 3000)
npm run build                    # Production build
npm run start                    # Production server
npm run lint                     # ESLint
npx prisma generate              # Regenerar Prisma client
npx prisma migrate dev           # Aplicar migraciones
npx prisma studio                # GUI de base de datos
npx tsx prisma/seed.ts           # Seed data
```

## Variables de entorno

Referencia: ver `.env` (no hay `.env.example` — deuda pendiente).

```
DATABASE_URL          # PostgreSQL connection string
NEXTAUTH_SECRET       # JWT signing secret (CAMBIAR en prod)
NEXTAUTH_URL          # Base URL (http://localhost:3000 en dev)
GOOGLE_MAPS_API_KEY   # Optional — mapa funciona con fallback sin key
```

## Estructura del proyecto

```
plexusmap/
├── prisma/
│   ├── schema.prisma              # 9 modelos, 4 enums
│   ├── seed.ts                    # Seed data
│   └── migrations/                # 3 migrations (foundation, premium_plan, whatsapp_phone)
├── src/
│   ├── app/
│   │   ├── page.tsx               # Homepage SSR
│   │   ├── [slug]/page.tsx        # Perfil publico SSR + JSON-LD
│   │   ├── especialidad/[slug]/   # Landing por especialidad
│   │   ├── claim/                 # Claim flow (page + verify)
│   │   ├── login/page.tsx         # Login
│   │   ├── reset-password/        # Reset password flow
│   │   ├── (dashboard)/           # Route group autenticado
│   │   │   └── dashboard/         # profile, schedule, reviews
│   │   ├── api/
│   │   │   ├── auth/              # NextAuth + forgot/reset password
│   │   │   ├── professionals/     # Busqueda, specialties, insurances, reviews, sync-ical
│   │   │   ├── claim/             # POST claim, GET verify, POST verify/complete
│   │   │   ├── dashboard/         # profile, schedule, reviews reply
│   │   │   ├── appointments/      # CRUD + availability
│   │   │   ├── geocode/           # autocomplete + details (Google proxy)
│   │   │   ├── export/csv/        # Admin CSV export
│   │   │   ├── health/            # Health check
│   │   │   └── og/, icon/         # OG image + favicon generation
│   │   ├── sitemap.ts, robots.ts
│   │   └── error.tsx, not-found.tsx, loading.tsx
│   ├── components/
│   │   ├── claim/                 # ClaimForm, ClaimSearch, ClaimPasswordForm
│   │   ├── dashboard/             # DashboardShell, ProfileEditor, ScheduleEditor, etc.
│   │   ├── map/                   # MapView, MapMarkers
│   │   ├── professional/          # ProfilePage, ReviewCard, ContactActions, etc.
│   │   ├── search/                # SearchBar, ProfessionalList, SpecialtyLanding
│   │   ├── seo/JsonLd.tsx
│   │   └── ui/                    # Header, Skeleton
│   ├── lib/
│   │   ├── prisma.ts              # PrismaClient singleton
│   │   ├── validations.ts         # Zod schemas (claim, reviews, etc.)
│   │   ├── rate-limit.ts          # Rate limiter utility
│   │   ├── ical-parser.ts         # iCal parsing
│   │   └── kairos-client.ts       # Placeholder (no implementado)
│   ├── middleware.ts              # Rate limiting en auth + claim endpoints
│   ├── hooks/useProfessionals.ts
│   ├── stores/map-store.ts        # Zustand store
│   └── types/
├── scripts/                       # Import/cross-reference scripts (ASSA, BCBS, MAPFRE, etc.)
└── AUDIT-BRIEF.md                 # Brief de auditoria con hallazgos potenciales
```

## Vector primario: Claim Flow

El claim flow es el vector critico de seguridad. Permite que un profesional
reclame su perfil publico y obtenga una cuenta con dashboard.

**Flujo actual (3 pasos):**
1. `POST /api/claim` — Crea ClaimRequest con token random (32 bytes hex). Zod-validated.
2. `GET /api/claim/verify?token=xxx` — Valida token, retorna datos del claim.
3. `POST /api/claim/verify/complete` — Usuario elige password. Transaccion: crea User + marca isClaimed + aprueba request.

**No hay aprobacion admin** — el claim se auto-aprueba al completar el flujo.
Rate limiting via middleware.ts (10 req/min en claim endpoints).

## Convenciones

- React: PascalCase. Services/lib: camelCase. DB: snake_case con Prisma @map.
- API routes: Next.js App Router route handlers (`route.ts`).
- Validacion: Zod schemas en `src/lib/validations.ts`. Usar `parseBody()` helper.
- Auth check en API: `getServerSession(authOptions)` + verificar `session.user.professionalId`.
- UI: Espanol (Panama). Codigo: Ingles. No `any` — TypeScript strict.
- Commits de audit: mensaje incluye `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Politica de auditoria Augur

Vigente desde 24-may-2026 para todo el ecosistema:

1. Hallazgos no trazables contra codigo actual = **deferred**. No se reconstruye desde memoria del agente.
2. Excepcion: si una reconstruccion se verifica contra codigo actual, se promueve a hallazgo trazable con evidencia real.
3. Commits separados por issue.
4. No usar `--dangerously-skip-permissions` ni allow-all.
5. Branch de trabajo: `audit/plexusmap-initial`.

## Credenciales de prueba

Las credenciales del seed **no se documentan en claro** (issue #19). Se configuran vía variables de entorno:

- `ADMIN_PASSWORD` — admin (`admin@plexusmap.com`). **Requerida** en `SEED_MODE=production`/`google-places`; en dev usa un default local trivial.
- `FOUNDER_PASSWORD` — fundador (`fundador@plexusmap.com`). **Requerida** en modo prod/google-places.

En modo prod el seed **aborta** si faltan, para no crear credenciales por defecto. Ver `prisma/seed.ts` y `.env.production.example`.

Audit Harness — Operating Rules
These rules govern all audit work on this repo. Follow them without being re-told each session.
Traceability

Every finding MUST point to concrete evidence: file:line + a short code excerpt. No location → it is NOT a finding; record it under "Deferred / unverifiable" instead.
Never reconstruct a finding from memory or from a prior session's label. If you cannot re-verify it against the current code, defer it.
Before asserting anything about a file's contents, READ the actual file and confirm. Do not trust your own recall of what a snippet says.

Severity

Use exactly these labels: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low. Justify each in one line.
When reporting severity totals, RECOUNT manually from the full issue list, item by item. Do not report a remembered or running total — historically these counts come out wrong. Show the per-issue breakdown so the count is auditable.

Commits

Atomic commits: one logical change per commit. Documenting a closed remediation and opening a NEW finding are SEPARATE commits — never combine them.
Before committing, stage only the intended file(s) and show git diff --cached so the exact staged content is visible.
Commit message style: audit(plexusmap): <subject> for audit-doc changes, feat(...)/fix(...) for code. Always append:
Co-Authored-By: Claude <noreply@anthropic.com>
After committing, run git log --oneline -6 and report the new SHA.

Push — explicit gate

NEVER git push unless the user instructs it in that turn. Commits stay local until the user explicitly says to push. Local commits are reversible; a push is the real boundary.

Edits

For CODE files, propose the edit and let the permission prompt gate it. Never request blanket "allow all edits."
Apply edits with individual str_replace/Edit calls, not bulk rewrites, so each change is reviewable.

Self-reports on destructive ops

After any delete/move/reset, do NOT trust your own "Done/Deleted" output. Run a follow-up check (e.g. git status, re-list the path) and confirm the result before reporting success.

Decision vs. execution

Decisions (severity, whether something is one issue or two, scope of a commit, architecture) → surface them to the user before acting.
Pure execution (read-only inspection, staging, committing per the rules above, housekeeping) → just do it and report the outcome once. Do not ask for step-by-step approval on mechanics.