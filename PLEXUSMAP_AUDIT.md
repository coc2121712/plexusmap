# PlexusMap — Auditoría Inicial

**Branch:** `audit/plexusmap-initial`
**Repo:** https://github.com/coc2121712/plexusmap
**Fecha inicio:** 25-may-2026
**Auditores:**
- Claude web (Opus 4.7) — outlines, redacción, política
- Claude Code CLI — verificación de código, str_replace, commits

**Estado del documento:** SCAFFOLD INICIAL — secciones 1, 2, 3, 5, 6, 7, 8 redactadas. Sección 4 contiene hipótesis preliminares marcadas `[POR VERIFICAR]` que Claude Code irá promoviendo a issues numerados (#1, #2, ...) en commits separados conforme verifique contra código real.

---

## RESUMEN EJECUTIVO

PlexusMap es el directorio público de profesionales de salud del ecosistema Augur, posicionado estratégicamente como funnel de adquisición para los productos comerciales (principalmente Kairos). Está en producción sobre Hostinger KVM1, con DNS y SSL configurados, y el directorio ya está poblado con datos importados desde cinco redes de aseguradoras panameñas (Mapfre, ASSA, BCBS Panama, PALIG, Sura) más una segunda fuente: la Google Places API, que aportó 464 profesionales reales adicionales (commit `a57965c`).

El vector primario auditado es el **takeover de perfiles vía claim flow**. A diferencia de otros productos del ecosistema, los datos del directorio son explícitamente públicos por diseño, por lo que el riesgo de exposición de datos no está en scope (no aplica análisis de cumplimiento Ley 81 sobre los datos en sí). El riesgo real es de **suplantación**: un atacante que logre reclamar un perfil ajeno adquiere control sobre una identidad profesional con reputación construida, datos de contacto verificados, y potencialmente integración con Kairos (vía `kairosEnabled` + `kairosTenantId`). Para PlexusMap como funnel de adquisición del ecosistema, un takeover exitoso degrada simultáneamente la confianza del usuario final y la integridad del lead para los productos comerciales aguas abajo.

Esta auditoría es la cuarta en el ecosistema Augur, sucesora directa de las auditorías de Praetor (14-may), Kairos (15-may) y Exactor (24-may), y aplica el harness metodológico multi-agente y la política de hallazgos trazables consolidados durante la auditoría de Exactor. Los resultados cuantitativos (totales de hallazgos, top prioridades, decisiones arquitectónicas) se consolidan al cierre, en Sección 8.

---

## 1. CONVENCIONES

Replicadas del audit de Exactor (24-may-2026), con ajustes específicos de PlexusMap.

### 1.1 Trazabilidad de hallazgos

- **Hallazgo trazable:** verificado contra el código actual del repo, con evidencia en archivo + line numbers + commit SHA.
- **Hallazgo deferred:** mencionado en `AUDIT-BRIEF.md`, sesiones previas, o memoria del agente, pero no verificable hoy contra el código actual. **No se reconstruye desde memoria.**
- **Excepción de promoción:** si una reconstrucción desde una fuente no trazable SE VERIFICA contra el código actual, se promueve a trazable y se documenta con su evidencia real (no con la etiqueta original).

### 1.2 Patrón multi-agente

- Claude web (Opus 4.7) redacta outlines y verificaciones de estructura.
- Rogelio aprueba o pide cambios antes de cualquier commit.
- Claude Code CLI aplica `str_replace` individuales sobre `PLEXUSMAP_AUDIT.md`. **NO usa `--dangerously-skip-permissions` ni allow-all.** Cada edición requiere confirmación explícita en la sesión.
- Cada hallazgo va en su propio commit con mensaje:
  `audit(plexusmap): add issue #N — <título corto>`
  `Co-Authored-By: Claude <noreply@anthropic.com>`

### 1.3 Severidad

- 🔴 **Crítico** — explotable hoy o ya explotado; remediación inmediata.
- 🟠 **Alto** — explotable bajo condiciones realistas; remediación en sprint actual.
- 🟡 **Medio** — riesgo real pero contenido; remediación en backlog priorizado.
- 🟢 **Bajo** — mejora de calidad, robustez o consistencia; remediación oportunística.

### 1.4 Estado de cada hallazgo

- `OPEN` — verificado, sin remediar.
- `VERIFIED-CLOSED` — verificado como ya remediado en código actual.
- `PARTIAL` — parcialmente remediado, parte residual queda como nuevo issue.
- `DEFERRED` — no verificable contra repo actual.
- `DUPLICATE` — ya cubierto por otro issue de este audit o de audits previos del ecosistema.

### 1.5 Vinculación cross-audit

Cada hallazgo cuya superficie o patrón sea común con audits previos del ecosistema (Praetor, Kairos, Exactor) lleva referencia cruzada en el campo `Vinculado a`.

---

## 2. ALCANCE Y CONTEXTO

### 2.1 Producto y rol en el ecosistema Augur

PlexusMap (plexusmap.com) es el directorio público de profesionales de salud del ecosistema Augur. Su rol estratégico es de **funnel de adquisición**: capta tráfico orgánico vía SEO, presenta perfiles públicos, y canaliza profesionales hacia los productos comerciales del ecosistema (Kairos para agenda y revenue, Praetor para WhatsApp+IA, etc.) mediante el flujo de claim de perfil. Los demás productos del ecosistema están auditados o por auditarse independientemente.

### 2.2 Stack tecnológico

- **Framework:** Next.js 16.2.2 (App Router) + React 19.2.4
- **ORM y DB:** Prisma 5.22 + PostgreSQL
- **Auth:** NextAuth 4.24 con CredentialsProvider + bcryptjs (drift documentado vs estándar JWT de Kairos `@augur/auth`)
- **Validación:** Zod 4.3 (`src/lib/validations.ts`)
- **Frontend:** Tailwind 4, Zustand 5
- **Integraciones:** Google Maps (`@vis.gl/react-google-maps`), iCal (`ical.js`), cheerio (scraping), pdf-parse, fastest-levenshtein (fuzzy matching de imports)
- **Infra:** Hostinger KVM1, Nginx (config versionada en repo), Docker, scripts de backup PostgreSQL

### 2.3 Estado de infraestructura

Producción activa en Hostinger KVM1 con DNS y SSL configurados. `docker-compose.yml`, `Dockerfile`, `nginx/default.conf`, y `scripts/` (`backup-db.sh`, `ssl-setup.sh`, `vps-setup.sh`, `deploy.sh`) versionados en el repo. Healthcheck del contenedor activo. Backup automatizado de PostgreSQL con retención de 14 días.

### 2.4 Fuentes de datos del directorio

- **5 redes de aseguradoras panameñas:** Mapfre, ASSA, BCBS Panama, PALIG, Sura — importadas vía GraphQL con fuzzy matching y geocoding.
- **Google Places API:** 464 profesionales reales adicionales (commit `a57965c`).
- **Datos sintéticos:** 19 profesionales ficticios iniciales (declarados en `AUDIT-BRIEF.md` como estado MVP, aún presentes en `prisma/seed.ts`).

### 2.5 Decisión de scope

- **NO en scope:** cumplimiento Ley 81 de Protección de Datos Personales de Panamá sobre los datos del directorio (los datos son públicos por diseño y origen).
- **SÍ en scope:** flujo de claim debe garantizar que solo el dueño legítimo del perfil pueda reclamarlo. Anti-takeover, validación de identidad/propiedad, trazabilidad forense del reclamo.
- **SÍ en scope:** consistencia del ecosistema Augur (patrones de auth, integración cross-app con Kairos).
- **SÍ en scope:** continuidad de negocio (backups, remote, gobernanza de datos en repo).

---

## 3. SUPERFICIE AUDITADA

### 3.1 Modelos Prisma

12 modelos en `prisma/schema.prisma` (3 migraciones aplicadas: `foundation`, `add_premium_plan`, `add_whatsapp_phone`):

| Modelo | Función primaria |
|---|---|
| `User` | Cuenta autenticada (bcrypt) vinculada 1:1 a `Professional` |
| `Specialty` | Taxonomía normalizada con árbol parent/children |
| `Professional` | Perfil público del directorio (claimable) |
| `Insurance` + `ProfessionalInsurance` | Many-to-many de seguros aceptados |
| `Review` | Reseñas con `source` (PLEXUSMAP/WHATSAPP) |
| `Appointment` | Citas con `kairosAppointmentId` opcional |
| `Schedule` | Horario semanal recurrente |
| `ClaimRequest` | Solicitud de claim con token de verificación |
| `PasswordReset` | Token de reset de contraseña |

Enums: `UserRole`, `PlanType`, `ReviewSource`, `AppointmentStatus`, `AppointmentSource`, `ClaimStatus`.

### 3.2 Endpoints API (22 route files)

Mapa completo de superficie en `src/app/api/`:

**Públicos sin auth:**
- `GET /api/professionals` + `/specialties` + `/insurances`
- `POST /api/professionals/[slug]/reviews`
- `POST /api/professionals/[slug]/sync-ical`
- `GET /api/geocode/autocomplete` + `/details`
- `GET /api/og` + `/icon`
- `GET /api/health`
- `GET /api/export/csv`
- `* /api/appointments` + `/availability`

**Auth flow:**
- `* /api/auth/[...nextauth]`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

**Claim flow (vector primario):**
- `POST /api/claim`
- `GET /api/claim/verify`
- `POST /api/claim/verify/complete`

**Dashboard (requiere sesión):**
- `PUT /api/dashboard/profile`
- `PUT /api/dashboard/schedule`
- `PUT /api/dashboard/reviews/[id]/reply`

**Delta vs AUDIT-BRIEF:** 11 endpoints son nuevos no documentados en el brief de abril.

### 3.3 Flujo de claim — mapeo end-to-end

| Capa | Archivo |
|---|---|
| UI página de búsqueda y solicitud | `src/app/claim/page.tsx` |
| UI página de verificación | `src/app/claim/verify/page.tsx` |
| Componente buscador | `src/components/claim/ClaimSearch.tsx` |
| Componente formulario | `src/components/claim/ClaimForm.tsx` |
| Componente password | `src/components/claim/ClaimPasswordForm.tsx` |
| API solicitud | `src/app/api/claim/route.ts` |
| API verificación token | `src/app/api/claim/verify/route.ts` |
| API completar (crear User) | `src/app/api/claim/verify/complete/route.ts` |
| Validación Zod | `src/lib/validations.ts` (`claimRequestSchema`, `claimCompleteSchema`) |
| Rate limiting | `src/middleware.ts` (10 req/min en `/api/claim` y `/api/claim/verify/complete`) |
| **Aprobación admin manual** | **NO EXISTE** |

Flujo declarado (3 pasos): `POST /api/claim` (crea ClaimRequest + token random 32 bytes) → `GET /api/claim/verify?token=xxx` (valida token, retorna datos) → `POST /api/claim/verify/complete` (crea User con password elegida, marca `isClaimed=true`, aprueba ClaimRequest, todo en transacción).

### 3.4 Auth y sesiones

NextAuth 4.24 con `CredentialsProvider` + bcryptjs para hashing local. JWT strategy. Drift documentado vs el patrón estándar JWT del ecosistema (`@augur/auth` consolidado en Kairos durante audit del 15-may). Endpoints de auth: `/api/auth/[...nextauth]`, `/api/auth/forgot-password`, `/api/auth/reset-password`.

### 3.5 Integraciones cross-app

- **Kairos:** `Professional.kairosEnabled` (bool) + `kairosTenantId` (string, opcional, sin FK cross-app).
- **Cliniweb:** `Professional.cliniwebIcalUrl` para sincronización iCal de citas.
- **WhatsApp:** `Professional.whatsappPhone` auto-clasificado durante import, usado para CTA de contacto.

---

## 4. HALLAZGOS NUEVOS

> **Estado de esta sección:** las entradas marcadas `[POR VERIFICAR]` son hipótesis preliminares derivadas del análisis estático del schema, el AUDIT-BRIEF, y el reporte de inventario de Claude Code. Claude Code irá verificándolas contra el código real y promoviéndolas a issues numerados (#1, #2, ...) en commits separados. Hipótesis que no se verifiquen se moverán a Sección 5.4 (DEFERRED).

### 4.0 Issues verificados

#### #1 — Token de claim sin envío al profesional (takeover trivial en dev)

**Severidad:** 🔴 Crítico
**Categoría:** Seguridad (claim flow)
**Archivos:** `src/app/api/claim/route.ts:47-68`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.A.1 | Ver también issues del mismo bloque 4.A (#2, #4, #5) | Generalizado en #11 (bug sistémico)

**Evidencia:**

```ts
// route.ts:47-48 — token generado pero nunca enviado
const token = randomBytes(32).toString('hex');

// route.ts:61-68 — en dev, token devuelto en respuesta al solicitante
const isDev = process.env.NODE_ENV !== 'production';
return NextResponse.json({
  data: {
    ...(isDev ? { verifyUrl: `/api/claim/verify?token=${token}` } : {}),
  },
});

// grep nodemailer|sendgrid|resend|sendEmail → 0 resultados en todo el repo
```

**Análisis:**

**Nota cross-block (añadida en sesión 4.B):** Este hallazgo es parte de un bug sistémico — todo el codebase carece de infraestructura de envío de email. Ver issue #11 para el alcance completo y la remediación generalizada.

No existe infraestructura de envío de email en el codebase. El token de verificación se genera y almacena en DB, pero nunca se entrega al profesional dueño del perfil. En dev (`NODE_ENV !== 'production'`), el token URL se retorna directamente en el body de la respuesta al solicitante, permitiendo takeover inmediato. En producción, el flujo está efectivamente muerto — el token se crea pero nunca llega a nadie. El mensaje al usuario "Recibirás un correo de verificación" (línea 67) es falso en ambos entornos.

**Recomendación:**

1. Implementar envío de email del token de verificación a `Professional.email` (cuando existe).
2. Eliminar retorno del token en respuesta API incluso en dev (usar logs o fixtures de test).
3. Si `NODE_ENV` se misconfigura en prod, el token se filtra — agregar safeguard adicional (verificar explícitamente `NODE_ENV === 'production'` en serverside, no asumir).

#### #2 — Sin comparación de email entre solicitante y profesional

**Severidad:** 🔴 Crítico
**Categoría:** Seguridad (claim flow)
**Archivos:** `src/app/api/claim/route.ts:16-19`, `src/app/api/claim/verify/complete/route.ts:19-22`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.A.2 | Ver también issues del mismo bloque 4.A (#1, #5)

**Evidencia:**

```ts
// route.ts:16-19 — Professional.email NO se incluye en select
const professional = await prisma.professional.findUnique({
  where: { id: professionalId },
  select: { id: true, isClaimed: true, name: true },
});

// verify/complete/route.ts:19-22 — mismo patrón, email excluido
professional: {
  select: { id: true, slug: true, name: true, isClaimed: true },
},

// Ninguno de los 3 endpoints del claim flow consulta Professional.email
```

**Análisis:**

El flujo de claim acepta cualquier email proporcionado por el solicitante sin validarlo contra el email publicado del profesional (`Professional.email`). El campo `Professional.email` ni siquiera se fetch-ea en los queries de ninguno de los tres endpoints. Combinado con #1, esto permite que cualquier persona con acceso al token (trivial en dev) tome control de cualquier perfil, incluso aquellos con email publicado que serviría como factor de verificación.

**Recomendación:**

1. Fetch `Professional.email` en `POST /api/claim`.
2. Si `Professional.email` existe: enviar token SOLO a esa dirección (no al solicitante).
3. Si `Professional.email` es null: flag para revisión admin (#4) o verificación alternativa (#5).

#### #3 — Sin trazabilidad forense directa del claim en Professional

**Severidad:** 🟡 Medio
**Categoría:** Seguridad (claim flow)
**Archivos:** `prisma/schema.prisma:77`, `src/app/api/claim/verify/complete/route.ts:75-78`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.A.3

**Evidencia:**

```prisma
// schema.prisma:77 — Professional solo tiene boolean, sin timestamp ni FK al user que reclamó
isClaimed       Boolean            @default(false)
// No existe: claimedAt DateTime?
// No existe: claimedByUserId String?
```

```ts
// verify/complete/route.ts:75-78 — solo se setea el boolean
await tx.professional.update({
  where: { id: claim.professional.id },
  data: { isClaimed: true },
});
```

**Análisis:**

El modelo `Professional` registra el claim como un boolean sin metadata. No hay `claimedAt` ni `claimedByUserId` directamente en el registro. Existe trazabilidad indirecta vía `User.professionalId` y `ClaimRequest.reviewedAt`, pero es frágil: si el `User` se elimina, `isClaimed` queda en `true` sin forma de trazar quién lo reclamó ni cuándo. En un escenario de disputa o investigación de takeover, la reconstrucción forense requiere joins entre tres tablas sin garantía de integridad referencial post-eliminación.

**Recomendación:**

1. Agregar `claimedAt DateTime?` y `claimedByUserId String?` al modelo `Professional`.
2. Setear ambos campos en la transacción de `verify/complete`.

#### #4 — Sin panel admin de aprobación de claims

**Severidad:** 🟠 Alto
**Categoría:** Seguridad (claim flow)
**Archivos:** `src/app/api/claim/verify/complete/route.ts:64-84`, `src/app/` (no existen rutas admin)
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.A.4 | Ver también issues del mismo bloque 4.A (#1, #2, #5)

**Evidencia:**

```ts
// verify/complete/route.ts:64-84 — auto-aprobación en transacción, sin intervención humana
await prisma.$transaction(async (tx) => {
  await tx.user.create({
    data: {
      email: claim.email,
      password: hashedPassword,
      name: claim.name,
      role: 'PROFESSIONAL',
      professionalId: claim.professional.id,
    },
  });
  await tx.professional.update({
    where: { id: claim.professional.id },
    data: { isClaimed: true },
  });
  await tx.claimRequest.update({
    where: { id: claim.id },
    data: { status: 'APPROVED', reviewedAt: new Date() },
  });
});

// glob src/app/admin/**/* → 0 resultados
// grep approve|reject en src/app/api/**/*.ts → solo aparece en auto-flow (verify, complete)
```

**Análisis:**

No existen rutas `/admin` en la aplicación. El único uso del rol `ADMIN` es para autorizar la exportación CSV (`/api/export/csv`). Los estados `APPROVED` y `REJECTED` de `ClaimRequest` se setean exclusivamente de forma programática en el flujo auto-servicio — no hay endpoint de revisión manual. Para un directorio con 500+ perfiles reales importados de fuentes autoritativas (redes de aseguradoras, Google Places), la ausencia de gatekeeping humano amplifica el impacto de #1 y #2: cualquier vulnerabilidad en el flujo automático se traduce directamente en takeover sin recurso.

**Recomendación:**

1. Implementar panel admin con endpoints `PUT /api/admin/claims/[id]/approve` y `PUT /api/admin/claims/[id]/reject`.
2. Alternativa mínima: auto-aprobación con grace period de 7 días + notificación al email publicado del profesional, permitiendo disputa.
3. Casos donde `Professional.email` es null deben requerir aprobación admin obligatoria (ver #5).

#### #5 — Sin verificación de identidad para perfiles sin email publicado

**Severidad:** 🔴 Crítico
**Categoría:** Seguridad (claim flow)
**Archivos:** `src/app/api/claim/route.ts:16-19`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.A.5 | Colapsa en #1 y #2 para el estado actual; se independiza al remediar #1/#2

**Evidencia:**

```ts
// route.ts:16-19 — Professional.email no se incluye en select, no hay branch por presencia/ausencia
const professional = await prisma.professional.findUnique({
  where: { id: professionalId },
  select: { id: true, isClaimed: true, name: true },
});
// No existe: if (!professional.email) { /* flujo alternativo */ }
```

```prisma
// schema.prisma:72 — email es nullable, muchos perfiles importados lo tienen en null
email           String?            // public contact email (NOT auth)
```

**Análisis:**

Perfiles importados desde Google Places y algunas redes de aseguradoras carecen de email publicado (`Professional.email = null`). El flujo de claim trata estos perfiles de forma idéntica a los que sí tienen email: el solicitante proporciona cualquier dirección, y el flujo prosigue sin distinción. Actualmente esto colapsa en #1/#2 (ya que `Professional.email` nunca se consulta para ningún perfil). Cuando #1 y #2 se remedien, los perfiles sin email quedarán sin ruta de verificación posible por email, necesitando un mecanismo alternativo.

**Recomendación:**

1. Cuando `Professional.email` es null, requerir aprobación admin obligatoria (ver #4).
2. Implementar verificación alternativa: número de idoneidad profesional, cédula, o documento de identidad.
3. Considerar enriquecimiento proactivo del directorio: campañas para que profesionales registren su email antes de necesitar reclamar.

#### #6 — ClaimRequest sin expiración de token

**Severidad:** 🟠 Alto
**Categoría:** Seguridad (claim flow)
**Archivos:** `prisma/schema.prisma:189-204`, `src/app/api/claim/verify/route.ts:17-39`, `src/app/api/claim/verify/complete/route.ts:16-37`
**Estado:** OPEN
**Vinculado a:** Hallazgo emergente durante verificación de bloque 4.A | Amplifica #1, #2, #4, #5

**Evidencia:**

```prisma
// schema.prisma:189-204 — ClaimRequest no tiene campo expiresAt
model ClaimRequest {
  id             String       @id @default(uuid())
  professionalId String
  name           String
  email          String
  phone          String
  message        String?
  status         ClaimStatus  @default(PENDING)
  token          String       @unique
  createdAt      DateTime     @default(now())
  reviewedAt     DateTime?
  // No existe: expiresAt DateTime
}
```

```ts
// verify/route.ts:34-39 — solo valida status, no edad del token
if (claim.status !== 'PENDING') {
  return NextResponse.json(
    { error: 'Esta solicitud ya fue procesada' },
    { status: 409 }
  );
}
// No existe: if (claim.createdAt < Date.now() - TTL) { /* expired */ }
```

**Análisis:**

Los tokens de claim no tienen expiración: no hay campo `expiresAt` en el modelo ni validación de edad en los endpoints de verificación. Un token generado hace meses o años permanece válido indefinidamente mientras el `ClaimRequest.status` sea `PENDING`. Esto amplifica todos los issues anteriores del claim flow: si un token se filtra por cualquier vía (logs, backups, respuesta HTTP en dev), permanece explotable sin límite temporal. Contraste con `PasswordReset`, que sí tiene `expiresAt` (schema línea 215).

**Recomendación:**

1. Agregar `expiresAt DateTime` a `ClaimRequest` con default a 24-48 horas desde creación.
2. Validar `expiresAt` en ambos endpoints de verificación (`verify` y `verify/complete`).
3. Job periódico o check en middleware para marcar como `REJECTED` los claims expirados.

#### #7 — GET /api/claim/verify sin rate limiting específico

**Severidad:** 🟡 Medio
**Categoría:** Seguridad (claim flow)
**Archivos:** `src/middleware.ts:55-60`
**Estado:** OPEN
**Vinculado a:** Hallazgo emergente durante verificación de bloque 4.A | Defense-in-depth para #1, #6

**Evidencia:**

```ts
// middleware.ts:55-60 — solo POST endpoints tienen rate limiting estricto
const STRICT_POST_PATHS = [
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/claim',
  '/api/claim/verify/complete',
];
// GET /api/claim/verify NO está en la lista → cae en límite general (100 req/min)
```

**Análisis:**

El endpoint `GET /api/claim/verify?token=xxx` no tiene rate limiting estricto. Cae bajo el límite general de 100 req/min en lugar de los 10 req/min aplicados a los otros endpoints del claim flow. Aunque el token es de 256 bits (64 caracteres hex) y no es brute-forceable en la práctica, la inconsistencia debilita la postura defense-in-depth. Un atacante con un token parcialmente filtrado (e.g., truncado en logs) podría intentar completar los caracteres faltantes a 100 req/min.

**Recomendación:**

1. Agregar `/api/claim/verify` a `STRICT_ALL_PATHS` (rate limit estricto en GET y POST).
2. Alternativamente, crear categoría `STRICT_GET_PATHS` si se quiere granularidad por método.

#### #8 — User.emailVerifiedAt no existe en schema

**Severidad:** 🟡 Medio
**Categoría:** Seguridad (auth)
**Archivos:** `prisma/schema.prisma:14-26`, `src/app/api/claim/verify/complete/route.ts:65-73`, `src/app/api/auth/[...nextauth]/route.ts:14-35`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.B.1 | Ver también #1, #2 (amplificación cross-flow)

**Evidencia:**

```prisma
// schema.prisma:14-26 — modelo User sin campo de verificación de email
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  password       String   // bcrypt hash
  name           String
  role           UserRole @default(PROFESSIONAL)
  professionalId String?  @unique
  professional   Professional? @relation(fields: [professionalId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
// No existe: emailVerifiedAt DateTime?
```

```ts
// verify/complete/route.ts:65-73 — User creado con email no verificado del solicitante
await tx.user.create({
  data: {
    email: claim.email,      // email arbitrario del ClaimRequest
    password: hashedPassword,
    name: claim.name,
    role: 'PROFESSIONAL',
    professionalId: claim.professional.id,
  },
});

// auth/[...nextauth]/route.ts:14-25 — authorize sin check de verificación
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null;
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  });
  if (!user) return null;
  const isValid = await compare(credentials.password, user.password);
  if (!isValid) return null;
  return { id: user.id, email: user.email, ... };
  // No existe: if (!user.emailVerifiedAt) return null;
}
```

**Análisis:**

El modelo `User` no tiene campo de verificación de email (`emailVerifiedAt`, `isEmailVerified`, ni equivalente). El User se crea en el claim flow con `claim.email` — el email que proporcionó el solicitante — sin ninguna verificación de propiedad. NextAuth `authorize` valida solo email+password, sin check de verificación de email. El User puede loguearse inmediatamente tras completar el claim. Combinado con #1 (token no enviado al profesional) y #2 (email no comparado con `Professional.email`), la cuenta se crea con un email arbitrario no verificado que se convierte en credencial de login permanente. Si #1 y #2 se remedian (token enviado al email correcto), la verificación se vuelve implícita vía recepción del token, pero no explícita — un campo `emailVerifiedAt` sigue siendo necesario para auditoría, revocación, y consistencia con estándares de auth.

**Recomendación:**

1. Agregar `emailVerifiedAt DateTime?` al modelo `User`.
2. Setear `emailVerifiedAt` en la transacción de claim complete (implícitamente verificado al recibir el token).
3. Agregar check en NextAuth `authorize`: rechazar login si `emailVerifiedAt` es null.
4. Considerar flujo de re-verificación si el User cambia su email post-claim.

#### #9 — PasswordReset.usedAt sin DB constraint (TOCTOU)

**Severidad:** 🟢 Bajo
**Categoría:** Seguridad (auth) — defense in depth
**Archivos:** `src/app/api/auth/reset-password/route.ts:30-35, 76-81, 105-114`, `prisma/schema.prisma:210-220`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.B.3

**Evidencia:**

```ts
// reset-password/route.ts:30-35 — GET handler: check usedAt (app-level)
if (reset.usedAt) {
  return NextResponse.json(
    { error: 'Este enlace ya fue utilizado' },
    { status: 409 }
  );
}

// reset-password/route.ts:76-81 — POST handler: mismo check (app-level)
if (reset.usedAt) {
  return NextResponse.json(
    { error: 'Este enlace ya fue utilizado' },
    { status: 409 }
  );
}

// reset-password/route.ts:105-114 — marca como usado en transacción
await prisma.$transaction([
  prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  }),
  prisma.passwordReset.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  }),
]);
```

```prisma
// schema.prisma:214 — usedAt es nullable sin constraint de DB
usedAt    DateTime?
// No existe: @@unique([token, usedAt]) parcial ni CHECK constraint
```

**Análisis:**

La app verifica correctamente `usedAt` en ambos handlers (GET y POST) y marca el token como usado en una transacción atómica con el password update. Sin embargo, la prevención de reuso depende 100% de lógica de aplicación — no hay constraint de DB (índice parcial, check constraint, o equivalent). Esto crea una ventana TOCTOU (time-of-check-time-of-use): dos requests concurrentes con el mismo token podrían pasar el check `usedAt === null` simultáneamente antes de que cualquiera setee `usedAt`. Impacto práctico negligible: el atacante ya necesita el token de 256 bits, y ambos requests setearían passwords diferentes con el último ganando. Es un hallazgo de disciplina de defense-in-depth, no de explotabilidad real.

**Recomendación:**

1. Agregar partial unique index o check constraint a nivel Prisma/PostgreSQL que impida `UPDATE ... SET usedAt` si `usedAt IS NOT NULL`.
2. Alternativamente, usar `SELECT ... FOR UPDATE` en la transacción para serializar accesos concurrentes al mismo token.

#### #10 — GET /api/auth/reset-password sin rate limit estricto

**Severidad:** 🟢 Bajo
**Categoría:** Seguridad (rate limiting) — defense in depth
**Archivos:** `src/middleware.ts:77-79`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.B.4 | Ver también #7 (mismo patrón de cobertura inconsistente)

**Evidencia:**

```ts
// middleware.ts:77-79 — exención blanket para todos los GET /api/auth/*
if (pathname.startsWith('/api/auth/') && request.method === 'GET') {
  return NextResponse.next();
}
// Intención: skip rate limiting para session checks de NextAuth (GET /api/auth/session, /csrf, /providers)
// Efecto real: también exime GET /api/auth/reset-password?token=xxx (oráculo de validación de token)
```

**Análisis:**

La exención de rate limiting para `GET /api/auth/*` fue diseñada para evitar limitar los session checks de NextAuth (`/api/auth/session`, `/api/auth/csrf`, `/api/auth/providers`). Sin embargo, el patrón `startsWith('/api/auth/')` es over-broad e incluye accidentalmente `GET /api/auth/reset-password?token=xxx`, que funciona como oráculo de validación: retorna 200 para token válido, 404 para inválido, 409 para usado, 410 para expirado. Un atacante podría consultar este endpoint sin límite de rate. El token de 256 bits (64 hex chars) hace brute-force impracticable, pero la exención viola el principio de least privilege. La cobertura de rate limiting en general es adecuada — la tabla de cobertura verificada durante el bloque 4.B:

| Endpoint | Protección | Estado |
|---|---|---|
| `POST /api/auth/forgot-password` | STRICT_POST_PATHS (10/min) | Correcto |
| `GET /api/geocode/autocomplete` | STRICT_ALL_PATHS + per-user rateLimit(30/min) + auth | Triple protección |
| `GET /api/geocode/details` | STRICT_ALL_PATHS + per-user rateLimit(20/min) + auth | Triple protección |
| `GET /api/export/csv` | Auth ADMIN-only + general (100/min) | Aceptable |
| `POST /api/professionals/[slug]/sync-ical` | Auth owner/admin + general (100/min) | Aceptable |
| `GET /api/auth/reset-password` | **Sin rate limit (exención blanket)** | **Gap** |

**Recomendación:**

1. Narrowar la exención de GET a solo los paths de NextAuth: `/api/auth/session`, `/api/auth/csrf`, `/api/auth/providers`, `/api/auth/callback`.
2. Alternativamente, agregar `/api/auth/reset-password` a `STRICT_ALL_PATHS`.

#### #11 — Sistema completo sin infraestructura de envío de email

**Severidad:** 🔴 Crítico
**Categoría:** Seguridad (sistémico) | DevOps (continuidad)
**Archivos:** `src/app/api/auth/forgot-password/route.ts:54-67`, `src/app/api/claim/route.ts:47-68`, `src/` (grep completo)
**Estado:** OPEN
**Vinculado a:** Hallazgo emergente cross-block (sesión 4.B) | Generaliza #1 a sistema completo

**Evidencia:**

```ts
// forgot-password/route.ts:54-67 — patrón idéntico a claim flow (#1)
// Token creado pero nunca enviado. En dev, URL retornada en response body.
const isDev = process.env.NODE_ENV !== 'production';
return NextResponse.json({
  ...successResponse,
  ...(isDev
    ? {
        data: {
          ...successResponse.data,
          resetUrl: `/reset-password?token=${token}`,
        },
      }
    : {}),
});
// En producción: token creado en DB, respuesta genérica, email nunca enviado.
// En dev: resetUrl retornado al SOLICITANTE (no al dueño de la cuenta).
```

```bash
# grep en todo src/ — 0 resultados para cualquier proveedor de email
$ grep -rn "nodemailer\|sendgrid\|resend\|sendEmail\|send_email\|mailgun\|postmark\|ses\.send\|transporter\.send" src/
# (sin resultados)
```

**Análisis:**

No es un bug del claim flow ni del forgot-password individualmente — es un bug sistémico: el codebase completo carece de infraestructura de envío de email. No hay dependencia de email (nodemailer, resend, sendgrid, etc.) en `package.json`, no hay helper de envío, no hay templates. Ambos flujos que dependen de email (claim y forgot-password) siguen el mismo patrón: generan token en DB, en dev retornan la URL en el response body, en producción no entregan nada. Impacto en producción ahora mismo:

- **Forgot-password no funciona.** Usuarios que olviden su contraseña no tienen mecanismo de recuperación.
- **Víctimas de takeover sin recurso.** Si un perfil es tomado vía claim flow (#1-#5), la víctima no puede usar forgot-password para recuperar acceso.
- **Dev mode leak.** Si `NODE_ENV` no es `'production'` (misconfigured en prod), el forgot-password endpoint retorna `resetUrl` al solicitante — quien puede no ser el dueño de la cuenta. Esto permitiría account takeover de cualquier cuenta existente.
- **Comunicación transaccional muerta.** Welcome emails, confirmaciones de claim, notificaciones de password reset — todo inexistente.

El ecosistema Augur ya tiene infraestructura de email operativa: `noreply@joinaugur.com` via Resend con DNS de Cloudflare verificado, usada por otros productos del ecosistema.

**Recomendación:**

1. Adoptar la infraestructura existente del ecosistema Augur: `noreply@joinaugur.com` via Resend (Cloudflare DNS verificado).
2. Implementar helper compartido `src/lib/email.ts` con Resend SDK.
3. Aplicar a TODOS los flujos que generan tokens: claim (#1), forgot-password (este issue), futuras notificaciones.
4. Eliminar leak de URL en dev mode en ambos endpoints — usar logs o fixtures de test en su lugar.

#### #12 — Auth drift: NextAuth+bcrypt local vs estándar JWT @augur/auth del ecosistema

**Severidad:** 🟡 Medio
**Categoría:** Ecosistema (auth)
**Archivos:** `src/app/api/auth/[...nextauth]/route.ts:1-66`, `package.json`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.C.1 | Sección 7.1 (decisión arquitectónica) | Ver también #8 (User.emailVerifiedAt)

**Evidencia:**

```ts
// route.ts:1-3 — imports locales, sin @augur/auth
import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';

// route.ts:62-65 — JWT strategy propia de NextAuth con secret local
session: {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // 7 days
},
secret: process.env.NEXTAUTH_SECRET,

// route.ts:39-45 — custom claims específicos de PlexusMap
async jwt({ token, user }) {
  if (user) {
    token.role = u.role;
    token.professionalId = u.professionalId;
    token.professionalSlug = u.professionalSlug;
  }
  return token;
},

// grep -rn "@augur/auth" src/ → 0 resultados
// package.json → sin dependencia @augur/auth
```

**Análisis:**

PlexusMap es el único producto del ecosistema Augur que NO usa el patrón estándar `@augur/auth` (consolidado en Kairos durante audit del 15-may, adoptado por Praetor y Exactor). Usa NextAuth 4.24 con `CredentialsProvider` + bcryptjs local y JWT strategy propia. Funcionalmente es similar (ambos JWT), pero los tokens NO son compartibles cross-app: claims structure diferente (`role`/`professionalId`/`professionalSlug` vs claims de `@augur/auth`), signing secret diferente (`NEXTAUTH_SECRET` vs JWT_SECRET del ecosistema), y session maxAge diferente (7 días). Implicación práctica: SSO entre PlexusMap y Kairos es imposible hoy. Un profesional que reclama perfil en PlexusMap y después activa Kairos tiene dos accounts/logins separados con potencialmente el mismo email. La decisión de migrar o no se delega a Sección 7.1.

**Recomendación:**

1. Evaluar migración a `@augur/auth` como parte de la decisión arquitectónica de Sección 7.1.
2. Si se migra: reescribir `authorize`, session callbacks, y creación de User en `verify/complete` (#1).
3. Si se mantiene NextAuth: documentar explícitamente la divergencia y aceptar dos logins separados como trade-off.
4. En ambos casos: unificar email como identificador cross-app para que Kairos pueda vincular el profesional al reclamar.

#### #13 — Integración Kairos: tenantId fallback inseguro + apiKey vacío

**Severidad:** 🟠 Alto
**Categoría:** Ecosistema (integración cross-app)
**Archivos:** `prisma/schema.prisma:78-79`, `src/app/api/appointments/route.ts:39`, `src/app/api/appointments/availability/route.ts:52`, `src/lib/kairos-client.ts:123-131`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.C.2 | Ver también #1, #11 (timing de integración post-claim)

**Evidencia:**

```prisma
// schema.prisma:78-79 — plain nullable string sin relación, sin constraint, sin validación
kairosEnabled   Boolean            @default(false)
kairosTenantId  String?
```

```ts
// appointments/route.ts:39 — fallback inseguro: usa UUID interno de PlexusMap como tenantId de Kairos
const tenantId = professional.kairosTenantId || professional.id;

// availability/route.ts:52 — mismo fallback inseguro
const tenantId = professional.kairosTenantId || professional.id;
```

```ts
// kairos-client.ts:123-131 — factory con DOBLE fallback inseguro
const baseUrl = process.env.KAIROS_API_URL;
const apiKey = process.env.KAIROS_API_KEY || '';  // fallback a string vacío

if (baseUrl) {
  _client = new KairosClient(baseUrl, apiKey);  // client con apiKey potencialmente ''
} else {
  const { KairosMockClient } = require('@/lib/kairos-mock');
  _client = new KairosMockClient() as KairosClientInterface;
}
```

**Análisis:**

Tres vectores de fallo latente en la misma integración, actualmente mitigados por el mock client (KAIROS_API_URL no configurado en producción), pero que se activarán simultáneamente cuando la integración real entre en servicio:

**(a) Sin validación de existencia de tenantId:** `kairosTenantId` es un string libre sin validación contra la API de Kairos. Si Kairos elimina un tenant, PlexusMap queda con `kairosEnabled = true` y un tenantId huérfano. No hay endpoint en dashboard que permita editar estos campos, ni mecanismo de sincronización bidireccional.

**(b) Fallback `|| professional.id` — bomba de tiempo:** cuando `kairosTenantId` es null (default para todos los profesionales), el sistema usa `professional.id` (UUID v4 de PlexusMap) como tenantId de Kairos. Este UUID no existe en Kairos — generará 404s en el mejor caso, o (si por colisión estadísticamente improbable pero no imposible) escribirá en un tenant ajeno.

**(c) apiKey fallback a string vacío:** si `KAIROS_API_KEY` no está configurado cuando `KAIROS_API_URL` sí lo está, las requests irán con header `X-Kairos-Key: ''`. Kairos rechazará (401) pero PlexusMap no distinguirá entre "tenant no existe" y "API key inválida" — ambos caen en el catch genérico con `console.error`.

El momento correcto para crear/sincronizar `kairosTenantId` es post-claim (#1): cuando un profesional reclama su perfil y decide activar Kairos, PlexusMap debería crear el tenant en Kairos y persistir el ID real. Hoy esa secuencia no existe.

**Recomendación:**

1. Eliminar fallback `|| professional.id` — fail explícito si `kairosTenantId` es null cuando `kairosEnabled` es true.
2. Validar `kairosTenantId` contra API de Kairos antes de persistirlo (health check del tenant).
3. Fail explícito si `KAIROS_API_KEY` no está configurado cuando `KAIROS_API_URL` sí — no fallback silencioso a ''.
4. Considerar reemplazar `kairosEnabled: Boolean` por enum `kairosStatus: ACTIVE|PENDING|DISABLED|ERROR` para reflejar estados reales de la integración.
5. Implementar flujo de provisioning post-claim: crear tenant en Kairos → obtener tenantId real → persistir en PlexusMap.

#### #14 — Sin logging estructurado ni observability — telemetría ciega

**Severidad:** 🟡 Medio
**Categoría:** Ecosistema (observability)
**Archivos:** `src/` (22+ archivos), `src/middleware.ts:92-101`, `src/lib/kairos-mock.ts:61`, `package.json`, `.env.example`, `.env.production.example`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.C.3 (aspecto standalone) | Cross-ref forense con #1 (claim takeover), #4 (sin admin), #11 (email muerto) | Aspecto cross-ecosystem DEFERRED en 5.4

**Evidencia:**

```ts
// Patrón uniforme en 15+ API routes — catch genérico con console.error sin estructura
// appointments/route.ts:76
console.error('Error creating appointment:', error);
// claim/route.ts:72
console.error('Error creating claim:', error);
// auth/reset-password/route.ts:120
console.error('Error resetting password:', error);

// middleware.ts:92-101 — rate limit 429 retornado SIN logging
if (isRateLimited(bucket, limit.max, limit.window)) {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta más tarde.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  );
}
// No existe: console.warn(`Rate limited: ${ip} on ${pathname}`);

// kairos-mock.ts:61 — único log con prefijo, pero es console.log en mock
console.log(`[KairosMock] Created appointment: ${appointmentId} ...`);
```

```bash
# Dependencias de observability en package.json — 0 resultados
$ grep -i "pino\|winston\|datadog\|sentry\|newrelic\|bunyan" package.json
# (sin resultados)

# Variables de observability en .env.example y .env.production.example — 0 resultados
$ grep -i "SENTRY_DSN\|DATADOG\|LOG_LEVEL\|NEWRELIC" .env.example .env.production.example
# (sin resultados)

# Helpers de logging en src/lib/ — 0 resultados
$ ls src/lib/logger* src/lib/log* 2>/dev/null
# (sin resultados)
```

**Análisis:**

PlexusMap no tiene infraestructura de observability: cero dependencias de logging estructurado, cero helpers de logging, cero variables de configuración de observability. Los 22+ puntos de error handling usan `console.error` con strings ad-hoc sin correlation ID, request ID, user ID, ni severity level. El rate limiter en middleware retorna 429 silenciosamente — sin logging del evento. Esto tiene impacto directo en la capacidad forense para los issues de seguridad documentados:

- **#1 (claim takeover):** un takeover exitoso no deja trail auditable más allá de los registros en DB. Sin logs de quién intentó reclamar, desde qué IP, cuántas veces.
- **#4 (sin admin):** incluso si existiera panel admin, no habría logs de acciones administrativas.
- **#11 (email muerto):** sin telemetría de intentos de envío fallidos, imposible diagnosticar si el email "casi funciona" o nunca se intentó.
- **Rate limiting:** 429s van unlogged — imposible detectar patrones de brute-force post-facto o ajustar umbrales basándose en datos reales.

La consistencia de este patrón con el resto del ecosistema Augur (Kairos, Praetor, Exactor) NO es verificable desde esta sesión — ver DEFERRED en 5.4.

**Recomendación:**

1. Implementar helper compartido `src/lib/logger.ts` con logs JSON estructurados (mínimo: timestamp, severity, message, requestId, userId, context).
2. Logear explícitamente eventos de rate limiting (429) con IP + pathname + presencia de token (no valor).
3. Decidir adopción de librería (pino o winston) como parte de la re-auditoría de Kairos/Praetor — potencial estándar del ecosistema.
4. Agregar variable `LOG_LEVEL` a `.env.example` y `.env.production.example`.
5. Considerar integración con servicio de error tracking (Sentry o equivalente) para alertas en tiempo real.

#### #15 — Remote git inexistente al inicio del audit

**Severidad:** 🟠 Alto (pre-remediación)
**Categoría:** DevOps (continuidad)
**Archivos:** `.git/config` (al inicio del audit: sin sección `[remote]`)
**Estado:** VERIFIED-CLOSED (remediado durante Tarea B del setup del audit, 25-may-2026)
**Vinculado a:** Hipótesis 4.D.1

**Evidencia (estado original al inicio del audit):**

```bash
# Al iniciar el audit (25-may-2026), git remote -v retornó vacío
$ git remote -v
# (sin output — no existía remote configurado)

# El repo solo existía en disco local del entorno de desarrollo
# git log mostraba commits desde d67d974 (Initial commit) sin push a ningún remote
```

**Análisis:**

Producto en producción activa (Hostinger VPS con DNS y SSL configurados) sin respaldo del código fuente en ningún remote. El repo solo existía en disco local. No había code review posible, no había disaster recovery del código (los backups de DB existían, pero no del código), y no había trazabilidad cross-ecosystem. Un fallo de disco, `rm -rf` accidental, o ransomware habría perdido la historia completa del proyecto — incluyendo 3 migraciones Prisma, 30+ scripts de import, y la configuración de infraestructura.

**Remediación aplicada:**

`git remote add origin https://github.com/coc2121712/plexusmap.git` + push de `master` y `audit/plexusmap-initial` durante Tarea B del setup del audit (25-may-2026).

**Lección para el ecosistema:**

1. Política Augur: remote obligatorio desde day-1 en todo producto. Considerar pre-commit hook que rechace commits en repos sin remote configurado.
2. Verificar que los otros productos del ecosistema (Kairos, Praetor, Exactor) tengan remotes activos con push reciente.

#### #16 — CLAUDE.md describía Praetor por error (drift documental crítico)

**Severidad:** 🟡 Medio (pre-remediación)
**Categoría:** DevOps (drift documental)
**Archivos:** `CLAUDE.md`, `.claude/CLAUDE.md.backup-praetor`
**Estado:** VERIFIED-CLOSED (remediado en commit `52a53ca`)
**Vinculado a:** Hipótesis 4.D.2

**Evidencia (estado original al inicio del audit):**

```markdown
# Estado del CLAUDE.md ANTES de commit 52a53ca:
# - Identidad: describía Praetor (plataforma WhatsApp+IA)
# - Estructura objetivo: rutas y convenciones de Nexus inbox
# - Referencias a archivos de Ludus (CRM interno)
# - Cero contenido específico de PlexusMap
# Backup preservado: .claude/CLAUDE.md.backup-praetor
```

**Análisis:**

CLAUDE.md es el archivo de contexto primario para agentes IA (Claude Code, Cursor, Codex). El archivo contenía la identidad, estructura, y convenciones de Praetor — un producto completamente diferente del ecosistema Augur. Cualquier agente que usara CLAUDE.md como contexto habría recibido instrucciones incorrectas: rutas de archivos inexistentes, convenciones de otro stack, y decisiones arquitectónicas de otro producto. Esto probablemente ocurrió al copiar la estructura del proyecto desde Praetor sin regenerar CLAUDE.md.

**Remediación aplicada:**

Regenerado completamente en commit `52a53ca` con identidad correcta de PlexusMap: stack real (Next.js 16 + Prisma + NextAuth), vector primario (claim flow), comandos, estructura del proyecto, y política de auditoría Augur. Backup del archivo original preservado en `.claude/CLAUDE.md.backup-praetor`.

**Lección para el ecosistema:**

1. CLAUDE.md debe regenerarse al forkear/clonar/derivar un proyecto. Considerar check en CI que valide que CLAUDE.md menciona el nombre del repo.
2. Agregar verificación de CLAUDE.md como paso obligatorio en el checklist de setup de nuevos productos Augur.

#### #17 — 96 archivos sin commitear en master al inicio del audit

**Severidad:** 🟠 Alto (pre-remediación)
**Categoría:** DevOps (gobernanza)
**Archivos:** 16 archivos modificados + 80 archivos untracked en `master` al inicio del audit
**Estado:** VERIFIED-CLOSED (remediado en commit `164fd95`)
**Vinculado a:** Hipótesis 4.D.3

**Evidencia (estado original al inicio del audit):**

```bash
# git status al iniciar audit (25-may-2026):
# 16 modified:  schema.prisma, seed.ts, components, layouts, API routes
# 80 untracked: scripts/import-*.ts, scripts/output/*, scripts/google-places-*,
#               geocode endpoints, OG endpoints, dashboard updates, etc.
# Último commit pre-audit: 01935f6 (10-may-2026) — 16 días sin commitear
```

**Análisis:**

~96 archivos de trabajo significativo sin trazabilidad en version control: migraciones Prisma modificadas, 30+ scripts de import de aseguradoras, datos de cross-reference, componentes nuevos de dashboard, endpoints de geocoding y OG image. El último commit (`01935f6`, 10-may-2026) tenía 16 días de antigüedad. Un `git checkout .` accidental, pérdida de disco, o ransomware habría destruido todo el trabajo acumulado sin posibilidad de recuperación — incluyendo los scripts que importaron los 500+ profesionales reales al directorio.

**Remediación aplicada:**

Snapshot WIP en commit `164fd95` previo al inicio del audit. Commit honesto sobre la naturaleza no-cohesiva del bundle: "bundling uncommitted work prior to audit/plexusmap-initial".

**Lección para el ecosistema:**

1. Política de commit frequency: al menos un commit diario en branches de trabajo activo.
2. Considerar git hook que advierta si han pasado >3 días sin commit local.

#### #18 — scripts/output/ con PII de profesionales reales commiteado al repo

**Severidad:** 🟠 Alto
**Categoría:** DevOps (gobernanza de datos)
**Archivos:** `scripts/output/` (35 archivos, 9.3 MB), `.gitignore`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.D.4

**Evidencia:**

```bash
# scripts/output/ — 35 archivos, 9.3 MB de datos intermedios de import
$ ls scripts/output/
assa-raw.json          bcbs-raw.json          mapfre-raw.json
assa-matched.json      bcbs-matched.json      mapfre-matched.json
assa-new.json          bcbs-new.json          mapfre-new.json
palig-raw.json         sura-raw.json          campaign-whatsapp.csv
palig-matched.json     sura-matched.json      sura-red-medica.pdf (3.8 MB)
palig-new.json         sura-new.json          sura-red-ap.pdf (511 KB)
# ... + stats, insert-results, raw-text por aseguradora
```

```csv
# campaign-whatsapp.csv — 477 filas con celulares personales de profesionales reales
name,slug,whatsappPhone,specialty,fullUrl
# (477 filas con nombre real, número WhatsApp personal, especialidad, URL de perfil)
```

```bash
# scripts/output/ NO está en .gitignore
$ grep -i "output" .gitignore
# (sin resultados)
```

**Análisis:**

35 archivos de datos intermedios de import de 5 aseguradoras panameñas (ASSA, BCBS, MAPFRE, PALIG, SURA) + una campaña de WhatsApp están versionados en el repositorio sin exclusión en `.gitignore`. Los archivos contienen nombres, teléfonos de consultorio, ubicaciones, y especialidades de profesionales reales de salud de Panamá — datos originados de directorios semi-públicos de aseguradoras. Sin embargo, `campaign-whatsapp.csv` contiene 477 **números de celular WhatsApp personales** asociados a nombres reales — estos NO son datos públicos del directorio (el directorio muestra teléfono de consulta, no celular personal). Adicionalmente, 2 PDFs de Sura (4.3 MB combinados) son directorios de red médica completos. Aunque el repo es privado actualmente, la mitigación es frágil: un cambio accidental a público, un colaborador externo invitado, o un fork interno expone 477 personas. Los 9.3 MB de datos intermedios tampoco deberían estar versionados — son regenerables desde los scripts de import.

**Recomendación:**

1. Agregar `scripts/output/` a `.gitignore` inmediatamente.
2. `git rm --cached -r scripts/output/` + commit para desversionar sin eliminar de disco local.
3. Mover los datos a un bucket privado (S3, Cloudflare R2) o regenerarlos on-demand desde los scripts de import.
4. Si el repo se va a hacer público alguna vez: reescribir history con BFG Repo-Cleaner o `git filter-repo` para eliminar estos archivos de commits previos.
5. Política Augur: revisar si otros productos del ecosistema tienen datos intermedios de import versionados.

#### #19 — Credenciales admin triviales en seed, documentadas en plaintext

**Severidad:** 🟠 Alto (con escalamiento condicional a 🔴 — ver verificación pendiente)
**Categoría:** Seguridad (credenciales)
**Archivos:** `CLAUDE.md:146-149`, `prisma/seed.ts:1020-1044`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.D.5 | Cross-ref con #4 (sin panel admin — la credencial admin existe pero no hay panel)

**Evidencia:**

```markdown
<!-- CLAUDE.md:146-149 — credenciales en plaintext en archivo versionado -->
| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@plexusmap.com | admin123 |
| Profesional | gponce@plexusmap.com | demo123 |
```

```ts
// seed.ts:1019-1027 — admin user creado en TODOS los modos (dev, production, google-places)
// Admin user (all modes)
await prisma.user.create({
  data: {
    email: 'admin@plexusmap.com',
    password: hashSync('admin123', 10),  // cost factor 10 (vs 12 en auth endpoints)
    name: 'Admin PlexusMap',
    role: 'ADMIN',
  },
});
```

```ts
// seed.ts:1029-1044 — usuario fundador en production mode — NO documentado en CLAUDE.md
if (SEED_MODE === 'production' || SEED_MODE === 'google-places') {
  const founder = await prisma.professional.findFirst({
    where: { slug: FOUNDER_SLUG },
  });
  if (founder) {
    await prisma.user.create({
      data: {
        email: 'fundador@plexusmap.com',
        password: hashSync('founder2026!', 10),
        name: 'Clínica Óptica Central',
        role: 'PROFESSIONAL',
        professionalId: founder.id,
      },
    });
  }
}
```

**Análisis:**

Dos credenciales con passwords triviales documentadas en el repositorio. `admin@plexusmap.com / admin123` se crea en TODOS los modos del seed (incluido production), está documentada en plaintext en CLAUDE.md, y otorga rol ADMIN que autoriza `GET /api/export/csv` (exportación completa del directorio). `fundador@plexusmap.com / founder2026!` se crea solo en production/google-places mode y NO está documentada en CLAUDE.md. Si producción fue seeded con `SEED_MODE=production` (probable, dado que `.env.production.example:30` lo configura), estas credenciales están potencialmente activas. Cualquier contributor con acceso al repo (o al CLAUDE.md) tiene acceso admin. Inconsistencia menor adicional: seed usa bcrypt cost factor 10 vs 12 en los endpoints de auth.

**⚠️ Verificación pendiente del propietario (fuera del audit):**

Rogelio debe verificar manualmente en producción:

1. Intentar login con `admin@plexusmap.com / admin123`. Si funciona → **escalar este issue a 🔴 Crítico y rotar la credencial INMEDIATAMENTE.**
2. Intentar login con `fundador@plexusmap.com / founder2026!`. Mismo procedimiento.
3. Si AMBOS fallan: mantener severidad 🟠. El riesgo es latente — el próximo redeploy con `SEED_MODE=production` re-crearía estas credenciales si el seed no se modifica.

**Recomendación:**

1. Rotar AMBAS credenciales inmediatamente (asumir activas hasta verificar lo contrario).
2. Reemplazar passwords triviales en `seed.ts` con `randomBytes(16).toString('hex')` y forzar reset al primer login.
3. Eliminar tabla de credenciales de CLAUDE.md — documentar referencia a `seed.ts` en su lugar.
4. Considerar `SEED_MODE=production` sin usuarios admin — crear el primer admin manualmente post-deploy con password generado.
5. Unificar bcrypt cost factor a 12 en todos los flujos (seed incluido).

#### #20 — SSRF en POST /api/professionals/[slug]/sync-ical

**Severidad:** 🔴 Crítico
**Categoría:** Seguridad (SSRF)
**Archivos:** `src/app/api/professionals/[slug]/sync-ical/route.ts:44-53`, `src/lib/ical-parser.ts:24-29`, `src/lib/validations.ts:31`
**Estado:** OPEN
**Vinculado a:** Hipótesis 4.E.3 | Cross-ref con #19 (admin trivial amplifica superficie de explotación)

**Evidencia:**

```ts
// validations.ts:31 — URL validada solo por formato, acepta http://, https://, file://, ftp://
cliniwebIcalUrl: z.string().url('URL inválida').trim().optional().nullable().or(z.literal('')),
// z.string().url() usa WHATWG URL standard — no restringe protocolo ni destino
```

```ts
// ical-parser.ts:24-29 — fetch nativo sin validación de protocolo/IP/allowlist
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);

const res = await fetch(url, {
  signal: controller.signal,
  headers: { Accept: 'text/calendar' },
});
// Sin validación de: protocolo (solo https), IP destino (privadas, loopback),
// DNS (Docker network hostnames), allowlist de dominios de calendario
```

```ts
// Vectores de ataque comprobados contra la topología Docker de PlexusMap:
// http://127.0.0.1:5432      → PostgreSQL (loopback)
// http://postgres:5432        → PostgreSQL (Docker network plexusmap-net)
// http://redis:6379           → Redis (Docker network plexusmap-net)
// http://plexusmap:3000/api/* → Self-hit (amplificación, lectura de endpoints internos)
// http://169.254.169.254/...  → Metadata service (portable a cloud en migración futura)
```

**Análisis:**

Auth + ownership existen: el endpoint requiere sesión autenticada (`route.ts:17-20`) y ownership check (`route.ts:38-42`), limitando la superficie a profesionales con claim o admin. La URL se obtiene de `professional.cliniwebIcalUrl` seteada vía `PUT /api/dashboard/profile` con `z.string().url()` que valida formato pero NO restringe protocolo ni destino. El fetch nativo de Node.js (`ical-parser.ts:27`) ejecuta contra la URL sin validación de IP, protocolo, ni allowlist. El timeout de 15 segundos limita DoS pero no SSRF. El servidor procesa el contenido completo vía `res.text()` ANTES del check `BEGIN:VCALENDAR` — si un endpoint interno devuelve texto con líneas iCal válidas (`BEGIN:VCALENDAR\nBEGIN:VEVENT...`), eventos arbitrarios pueden persistir en la DB del professional como Appointments.

El Docker network (`plexusmap-net`) expone directamente postgres (puerto 5432), redis (6379), y la propia app en `plexusmap:3000`. Un atacante con ownership puede hacer que el servidor resuelva y conecte a cualquiera de estos servicios. Timing side-channel: un timeout de 15s vs respuesta inmediata revela existencia/ausencia de servicios internos. Aunque es blind SSRF (el contenido raw NO se retorna al cliente — solo conteos de eventos sincronizados), el vector de write-side es real: si un endpoint interno o servicio controlado devuelve contenido con estructura iCal válida, el endpoint persiste `Appointment` records arbitrarios en la DB del professional (`route.ts:85-95`).

**Interacción con #19 (admin trivial):** en escenario base, la superficie se limita a profesionales con claim (cientos). Pero si las credenciales admin de #19 (`admin@plexusmap.com / admin123`) están activas, un atacante admin puede setear `cliniwebIcalUrl` en CUALQUIER professional del directorio vía `PUT /api/dashboard/profile` (el admin bypass de ownership aplica en `sync-ical/route.ts:39`), y luego ejecutar el fetch con el slug de cualquier profesional. La superficie pasa de "profesionales con claim" a "todos los professionals del directorio" (2,685+). Esta amplificación cross-issue es la razón principal del escalamiento a 🔴 Crítico.

**Recomendación:**

1. Reemplazar `z.string().url()` por validador estricto que solo acepte `https://` (y opcionalmente `http://` para development).
2. Resolución DNS pre-fetch + bloqueo explícito de IPs privadas (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16) y de hostnames internos del Docker network (postgres, redis, plexusmap).
3. Allowlist explícita de dominios de calendario conocidos (calendar.google.com, outlook.live.com, p[N]-caldav.icloud.com, fastmail.com, etc.) — más restrictivo que blacklist.
4. Mantener timeout 15s y agregar límite de tamaño de respuesta (10 MB max) + validación de Content-Type (`text/calendar` o `text/plain`).
5. Mover fetch a un proxy/worker separado con red restringida si la complejidad de allowlist crece.
6. **Mitigación inmediata:** considerar disable temporal del endpoint sync-ical hasta implementar (1)+(2). Cross-ref con #19: rotar credenciales admin reduce inmediatamente la superficie de amplificación.

#### #21 — Sin capacidad de cambio de password para usuario autenticado

**Severidad:** 🟠 Alto (combinado con #11 el impacto práctico es 🔴 — ver Análisis)
**Categoría:** Seguridad (gestión de credenciales)
**Archivos:** `src/app/api/auth/change-password/route.ts` (nuevo), `src/components/dashboard/ChangePasswordForm.tsx` (nuevo), `src/app/(dashboard)/dashboard/security/` (nuevo), `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`, `prisma/schema.prisma`
**Estado:** REMEDIADO (en este audit)
**Vinculado a:** #11 (forgot-password muerto) | genera #22 (política de password) | #14 (logging — TODO dejado en el endpoint)

**Evidencia (pre-remediación):**

```bash
# 0 resultados — no existía endpoint ni UI de cambio de password
$ glob "**/change-password/**"      # vacío
$ grep -rn "passwordChangedAt"      # vacío
# DashboardShell NAV_ITEMS: Resumen / Mi Perfil / Horario / Reseñas — sin "Seguridad"
```

**Análisis:**

Un usuario autenticado no tenía vía alguna para rotar su contraseña. Combinado con #11 (forgot-password no entrega el token en producción por falta de infra de email), el resultado es que **un usuario no podía rotar su credencial por NINGÚN medio**: ni reset por email (muerto), ni cambio autenticado (inexistente). Para el vector primario del producto (takeover vía claim), una víctima de takeover tampoco podía recuperar control rotando la credencial. Es la razón del impacto práctico 🔴 pese a la severidad standalone 🟠.

**Remediación aplicada (este audit):**

1. `User.passwordChangedAt DateTime?` + migración `20260529125943_add_password_changed_at` (commit `f710706`).
2. `PUT /api/auth/change-password`: auth → 401, rate limit per-user 5/hora → 429, validación Zod (`changePasswordSchema`), verificación de `currentPassword` con `bcrypt.compare`, update con `bcrypt.hash` cost 12 (commit `50bb4f1`).
3. Invalidación de sesiones (estrategia JWT): claim `pwcAt` en el token, comparado contra `passwordChangedAt` en el callback `session` de NextAuth → retorno `null` fuerza relogin de las OTRAS sesiones; la actual sobrevive vía `update()` del cliente (commit `ed11d18`). **No se usa `token.iat`**: verificado contra `node_modules/next-auth/core/routes/session.js` + `jwt/index.js` que NextAuth 4.24.13 lo re-sella (`.setIssuedAt()`) en cada lectura de sesión, volviéndolo inservible para este propósito.
4. UI en `/dashboard/security` con indicador de fortaleza, validación en vivo y confirmación al éxito (commit `57c1b36`).

**Trade-off documentado:** la invalidación real con JWT stateless añade 1 lookup indexado por PK por verificación de sesión (callback `session`). Es el costo inherente de invalidar sin store server-side; se aceptó en lugar de rotar `NEXTAUTH_SECRET` (que mataría TODAS las sesiones, incluida la actual).

#### #22 — Política de password inconsistente entre flujos de auth

**Severidad:** 🟡 Medio
**Categoría:** Seguridad (política de password)
**Archivos:** `src/lib/validations.ts` (`claimCompleteSchema`, `resetPasswordSchema`, `changePasswordSchema`)
**Estado:** OPEN
**Vinculado a:** #21 (su endpoint usa la política fuerte; los otros no) | #11 (cuando forgot-password reviva debe usar la política fuerte)

**Evidencia:**

```ts
// claimCompleteSchema — min 8, sin complejidad, sin cap
password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
// resetPasswordSchema — min 8, sin complejidad, sin cap
password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
// changePasswordSchema (#21) — min 12 + complejidad + max 72
.min(12).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/)
```

**Análisis:**

El cambio de password (#21) exige `min(12)` + complejidad (minúscula, mayúscula, dígito) + cap de 72 bytes (límite de bcrypt). Los flujos de **creación** de credencial — `claimCompleteSchema` (claim) y `resetPasswordSchema` (reset) — siguen en `min(8)` sin complejidad ni cap. Inconsistencia: una contraseña que NO se aceptaría al cambiarla SÍ se acepta al crearla en el claim o al resetearla. Además, sin `max(72)`, bcrypt trunca silenciosamente las entradas más largas (ignora bytes >72).

**Recomendación:**

1. Extraer la política de `changePasswordSchema` a un esquema/refinamiento Zod reutilizable y aplicarlo en `claimCompleteSchema` y `resetPasswordSchema`.
2. Capar las tres entradas a `max(72)`.
3. Coordinar con #11: al revivir forgot-password, el reset debe nacer con la política fuerte.

#### #23 — DB local en Postgres nativo en vez del container Docker declarado

**Severidad:** 🟡 Medio
**Categoría:** DevOps (drift de configuración local)
**Archivos:** `docker-compose.yml:28-47`, `.env:8`
**Estado:** OPEN
**Vinculado a:** Hallazgo emergente durante el setup de migración de #21 | Sección 7.3 (separación de infra)

**Evidencia:**

```
- docker-compose.yml define servicio `postgres` (container `plexusmap-db`, DB `plexusmap`) — nunca arrancado localmente.
- Docker Desktop local: otros productos del ecosistema (Exactor, Praetor, Locus, dental-revenue-engine), NINGÚN container de PlexusMap.
- Puerto 5432 servido por Postgres NATIVO de Windows: servicio `postgresql-x64-17` (Running, Automatic).
- .env → DATABASE_URL=postgresql://dental:dental@localhost:5432/plexusmap (credenciales `dental:dental` = leftover de otro proyecto; nombre de DB `plexusmap` correcto).
- Sub-hallazgo: migraciones legacy `add_premium_plan` y `add_whatsapp_phone` NO estaban aplicadas en la DB local (`_prisma_migrations` atrasado, solo `foundation`). Confirmado vía `migrate status` + `db pull --print` (columnas y enum `PlanType` realmente faltaban — no era desync). Sincronizado en este trabajo con `prisma migrate deploy` (forward-only, aditivo, cero pérdida de datos).
```

**Análisis:**

El desarrollo local corre sobre un Postgres nativo de Windows, no sobre el container Docker que `docker-compose.yml` declara como fuente canónica. Sin impacto en producción (que sí usa Docker vía `.env.production` + service name `postgres`), pero indica drift entre la configuración declarada y la real, y explica por qué el historial de migraciones local estaba atrasado. El resto del ecosistema corre en Docker localmente.

**Recomendación:**

1. Migrar el desarrollo local al container Docker `plexusmap-db` (`docker compose up postgres`) para alinear con ecosistema y producción.
2. Corregir las credenciales leftover `dental:dental` en `.env` local.
3. Documentar el procedimiento de arranque local (servicio Docker + migraciones) — ligado a la deuda de `.env.example` y Sección 7.3.

#### #24 — Falta índice inverso en ProfessionalInsurance.insuranceId + sin índice de texto en búsqueda 🟡

- **Evidencia:** `prisma/schema.prisma:120-127` (`ProfessionalInsurance` con `@@id([professionalId, insuranceId])`, sin `@@index([insuranceId])`); `src/app/api/professionals/route.ts:59-68` (filtro por aseguradora vía `insurances.some.insurance.name contains`), `:33-49` (búsqueda `name`/`address` con `contains` mode insensitive → ILIKE `%term%`), `:89` (`orderBy [isPriority, isVerified, rating]`). El índice `[lat,lng]` (`schema.prisma:104`) no lo usa ninguna query (el mapa filtra client-side).
- **Impacto:** La PK compuesta solo indexa con `professionalId` como prefijo, así que el filtro por aseguradora hace lookup inverso sin índice. Las búsquedas de texto corren ILIKE `%term%` sin índice trigram/GIN → full table scan. Con 2,685+ profesionales el costo crece linealmente por request (la cache de 60s mitiga parcialmente, no elimina).
- **Cross-ref:** —
- **Recomendación:**
  1. Agregar `@@index([insuranceId])` a `ProfessionalInsurance` (migración aditiva).
  2. Crear índice GIN trigram (`pg_trgm`) sobre `Professional.name` y `address` para acelerar los `contains`.
  3. Evaluar índice compuesto que soporte el `orderBy` por defecto, o materializar el ranking si el dataset crece.

#### #25 — PII (whatsappPhone, patientPhone) sin cifrado at-rest ni separación público/privado a nivel modelo 🟡

- **Evidencia:** `prisma/schema.prisma:75` (`whatsappPhone` en la misma fila que el contacto público), `:137-138` (`Review.patientName/patientPhone`), `:159-160` (`Appointment.patientName/patientPhone`) — todo TEXT en claro, sin cifrado. `Review.patientPhone` no se setea en el flujo público (`src/app/api/professionals/[slug]/reviews/route.ts:49-58`). Verificado que NO hay fuga por la API: el perfil omite `patientPhone` (`src/app/[slug]/page.tsx:58-68`) y la búsqueda solo expone el `phone` landline (`src/app/api/professionals/route.ts:96-116`).
- **Impacto:** El modelo mezcla PII sensible (celular WhatsApp personal, teléfonos de pacientes) con datos públicos en la misma tabla, sin cifrado at-rest ni separación de columnas públicas/privadas. Es la causa raíz a nivel de datos de #18 (el `campaign-whatsapp.csv` se origina de `whatsappPhone`). No hay fuga activa por la API hoy, pero la ausencia de separación deja la PII expuesta ante cualquier nuevo serializer, export o backup.
- **Cross-ref:** #18
- **Recomendación:**
  1. Separar la PII privada (`whatsappPhone`, `patientPhone`) a tabla/columnas con cifrado at-rest (pgcrypto o cifrado a nivel app).
  2. Dropear `Review.patientPhone` si se confirma muerto, o documentar su uso (minimización de datos).
  3. Definir una lista explícita de campos serializables y un tipo `PublicProfessional` que impida exponer PII por accidente.

#### #26 — Pipeline de import sin constraint anti-duplicado 🟡

- **Evidencia:** `scripts/insert-assa-new.ts:147-152` (slug con sufijo `-N` ante colisión → garantiza la inserción aunque el nombre choque), `prisma/seed.ts:858-871` (`generateUniqueSlug`, mismo patrón); `prisma/schema.prisma:65-106` (`Professional` sin unique en `(name, address)` ni `phone`; solo `slug` unique). Dedup es script manual post-hoc por nombre normalizado-ordenado (`scripts/dedup-professionals.ts:73-100`); el matching fuzzy Levenshtein decide new-vs-matched (`scripts/utils/normalize.ts:29-75`).
- **Impacto:** El unique de `slug` no previene duplicados — se evade por diseño con sufijo numérico. Variaciones de grafía de un mismo profesional entre aseguradoras caen bajo el umbral fuzzy y entran como registros nuevos. La integridad depende de correr manualmente `dedup-professionals.ts --execute`; sin constraint de DB, los duplicados reaparecen en cada import.
- **Cross-ref:** —
- **Recomendación:**
  1. Agregar unique compuesto natural (p.ej. `(normalizedName, phone)` o `(name, address)`) o una clave de deduplicación persistida.
  2. Mover la lógica de dedup a un upsert idempotente dentro del pipeline de import (no post-hoc).
  3. Registrar `source`/`externalId` por aseguradora para reconciliación trazable.

#### #27 — Geocoding no determinista persistido 🟡

- **Evidencia:** `scripts/utils/geocode.ts:166-172` (fallback `province.lat + (Math.random()-0.5)*0.02`, persistido con `geocoded:false`), `:6-7` (`DEFAULT_LAT=8.9824, DEFAULT_LNG=-79.5199`) colisiona con la coordenada de un profesional real del seed (`prisma/seed.ts:84`). `scripts/insert-assa-new.ts:155-157` persiste el lat/lng del fallback a la DB.
- **Impacto:** Cuando el geocoding falla, se persisten coordenadas aleatorias (±~1.1 km) no reproducibles entre corridas — el marcador del mapa es esencialmente ficticio. Re-importar produce ubicaciones distintas para el mismo profesional. El default colisiona con un profesional real, apilando pins en un punto.
- **Cross-ref:** —
- **Recomendación:**
  1. Eliminar `Math.random()`; usar coordenada determinista (centro de provincia exacto) y marcar el registro como "ubicación aproximada".
  2. Agregar flag `geocodePrecision` (exact/approx/default) al modelo para no tratar aproximados como exactos en UI/SEO.
  3. Cola de re-geocoding para registros `approx/default` cuando haya API key disponible.

#### #28 — Reviews sin moderación ni anti-spam efectivo 🟠

- **Evidencia:** `src/app/api/professionals/[slug]/reviews/route.ts:31-46` (el rate limit filtra por `patientName`, controlado por el usuario → bypasseable cambiando el nombre); `src/lib/validations.ts:64` (`patientName` libre); sin límite por IP en esta ruta. `prisma/schema.prisma:143` (`isVerified` default false, sin estado de moderación) → las reseñas se publican de inmediato. El `rating` alimenta el ranking de búsqueda (`src/app/api/professionals/route.ts:89`) y el `aggregateRating` del JSON-LD (`src/app/[slug]/page.tsx` → `ProfessionalJsonLd`).
- **Impacto:** Cualquiera puede inflar o deflactar el rating de un profesional creando reseñas con nombres distintos, sin moderación ni verificación. Como el rating ordena los resultados de búsqueda y se emite como `aggregateRating` en el JSON-LD SEO, el spam manipula tanto el ranking interno como la señal de confianza que indexan los buscadores. Por este doble impacto (integridad del directorio + SEO) se escala a 🟠 Alto.
- **Cross-ref:** 4.E (cobertura de rate limiting / superficie)
- **Recomendación:**
  1. Rate limit por IP + device en `POST /reviews` (no por nombre); usar el utilitario `rateLimit()` o el middleware.
  2. Agregar estado de moderación (`PENDING/APPROVED/REJECTED`) y publicar solo las aprobadas; ligar la verificación a una cita real.
  3. Excluir las reseñas no verificadas/no moderadas del `aggregateRating` SEO y del ranking.

#### #29 — Drift schema/migraciones + seed destructivo 🟡

- **Evidencia:** `prisma/migrations/20260403025903_foundation/migration.sql:86` (`patientPhone TEXT NOT NULL`) vs `prisma/schema.prisma:138` (`patientPhone String?` nullable) — ninguna migración reconcilia el cambio; se aplicó vía `db push` (documentado en `AUDIT-BRIEF.md:44`). Migraciones manuales sin el timestamp completo de Prisma: `prisma/migrations/20260409_add_premium_plan/`, `20260414_add_whatsapp_phone/` (vs `20260403025903_foundation`). Seed destructivo: `prisma/seed.ts:880-887` (`deleteMany` de todas las tablas al inicio).
- **Impacto:** El historial de migraciones no refleja el schema ni el DB vivo. Un `migrate deploy` sobre una DB fresca produce `patientPhone NOT NULL`, y la ruta de reseñas (que no setea `patientPhone`) fallaría al crear reseñas públicas. El seed borra todo al inicio: ejecutarlo contra producción destruye los datos (cross-ref #19).
- **Cross-ref:** #19
- **Recomendación:**
  1. Generar una migración que reconcilie `Review.patientPhone` (nullable) y dejar de usar `db push` en favor de `migrate dev`.
  2. Regenerar/renombrar las migraciones manuales al formato timestamp de Prisma; verificar `migrate status` limpio.
  3. Hacer el seed idempotente y no destructivo (upsert), o gatearlo explícitamente para que nunca corra en producción.

#### #30 — Sin soft-delete ni flujo de borrado/rectificación (Ley 81 PA) 🟡

- **Evidencia:** `prisma/schema.prisma` (cero `deletedAt` en los 9 modelos); sin endpoint de borrado de cuenta/datos (`src/app/api/dashboard/` solo expone `profile`, `schedule`, `reviews/[id]/reply`); `ClaimRequest` retiene PII (`name`, `email`, `phone` — `schema.prisma:197-199`) sin expiración (cross-ref #6).
- **Impacto:** No existe patrón de borrado lógico ni flujo para que un titular ejerza supresión o rectificación de sus datos. Un profesional reclamado puede editar su perfil pero no borrar su cuenta ni su PII; los `ClaimRequest` conservan PII indefinidamente. Gap de cumplimiento ante la Ley 81 de Protección de Datos Personales de Panamá (derechos de supresión y rectificación).
- **Cross-ref:** #6, #18
- **Recomendación:**
  1. Agregar `deletedAt` (soft-delete) a los modelos con PII y filtrarlo en todas las queries públicas.
  2. Implementar endpoint autenticado de "borrar mi cuenta/datos" con cascada/anonimización (Reviews, Appointments, ClaimRequests).
  3. Definir política de retención y purga automática de `ClaimRequest`/PII vencida; documentar la base legal Ley 81.

#### #31 — POST /api/appointments sin autenticación ni rate limit 🟠

- **Evidencia:** `src/app/api/appointments/route.ts` (el handler POST no llama `getServerSession`/`authOptions` — verificado: 0 ocurrencias en `api/appointments/`); escribe PII de paciente `patientName`, `patientPhone` (`:54-64`). Gateado hoy por `kairosEnabled` (default false — `prisma/schema.prisma:82`; ningún seed lo activa) → `:32-37` retorna 404 para todos.
- **Impacto:** El endpoint crea citas con PII de paciente sin autenticación ni rate limit. Latente hoy porque ningún profesional tiene `kairosEnabled=true`. **Nota condicional de severidad (mismo patrón que #19): si `kairosEnabled` se activa para cualquier profesional sin parchear este endpoint, escalar a 🔴 Crítico** — se vuelve un sumidero de PII anónimo y un vector de spam de citas.
- **Cross-ref:** #13
- **Recomendación:**
  1. Exigir sesión autenticada (o un token de booking firmado) y verificar el profesional destino antes de crear la cita.
  2. Agregar rate limit por IP en `POST /api/appointments`.
  3. Coordinar con #13: validar `kairosTenantId`/apiKey reales antes de habilitar `kairosEnabled` en cualquier profesional.

### 4.0.5 Buenas prácticas reconocidas

Durante la verificación del audit se identificaron prácticas correctamente implementadas que vale documentar como referencia para el ecosistema Augur:

**Auth y sesiones:**

- **Anti-enumeración en `/api/auth/forgot-password`**: el endpoint siempre retorna response de éxito independientemente de si el email existe en DB, previniendo enumeración de cuentas válidas. Evidencia: `forgot-password/route.ts:15-29`.

- **Invalidación de tokens previos**: antes de crear un nuevo `PasswordReset`, se invalidan los pendientes del mismo email expirándolos inmediatamente. Evidencia: `forgot-password/route.ts:33-39`.

- **Transacción atómica en password update**: el cambio de password + marca de token como usado se hace en una sola transacción de Prisma, evitando estados inconsistentes. Evidencia: `reset-password/route.ts:105-114`.

- **bcrypt con cost factor 12**: balance razonable entre seguridad y latencia para login. Estándar industria 2026. Evidencia: `reset-password/route.ts:102`, `verify/complete/route.ts:62`.

Estas prácticas son **replicables a otros productos del ecosistema** (Kairos auth, Praetor auth) durante las re-auditorías pendientes.

**Infraestructura y deploy:**

- **Configuración Nginx sin secrets ni IPs hardcoded**: `nginx/default.conf` referencia solo el hostname público `plexusmap.com` y el upstream Docker (`plexusmap:3000`). Sin API keys, tokens, ni valores sensibles versionados. Evidencia: `nginx/default.conf`.

- **Docker Compose con env vars parametrizados**: secrets gestionados via `${POSTGRES_PASSWORD}` y `env_file: .env.production`, sin valores hardcoded. Dockerfile usa dummy `DATABASE_URL` para build, explícitamente comentado como tal. Evidencia: `docker-compose.yml`, `Dockerfile:34`.

- **Scripts de deploy sin secrets**: `vps-setup.sh`, `ssl-setup.sh`, `deploy.sh`, `backup-db.sh` — todos verificados sin API keys, tokens, ni passwords hardcoded. IP del VPS obtenida dinámicamente vía `$(curl -s ifconfig.me)`, no hardcoded. Única IP en scripts: `127.0.0.1` (loopback). Evidencia: `scripts/*.sh`.

- **Healthcheck de Docker activo**: `wget -q --spider http://localhost:3000/api/health` con reintentos configurados. Backup automatizado de PostgreSQL con `pg_dump` + gzip + retención de 14 días. Evidencia: `docker-compose.yml:16-21`, `scripts/backup-db.sh`.

- **Security headers en Nginx**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Evidencia: `nginx/default.conf:79-81`.

Estas prácticas son **replicables a otros productos del ecosistema** (Kairos, Praetor, Exactor) durante sus deploys a producción.

**Validación:**

- **Cobertura Zod completa en endpoints con body**: 9 esquemas en `src/lib/validations.ts` cubren los 9 endpoints POST/PUT del API (`claimRequestSchema`, `claimCompleteSchema`, `profileUpdateSchema`, `scheduleUpdateSchema`, `reviewReplySchema`, `publicReviewSchema`, `createAppointmentSchema`, `forgotPasswordSchema`, `resetPasswordSchema`). Helper `parseBody()` estandariza el patrón de validación con error handling consistente. Cero gaps verificados. Evidencia: `src/lib/validations.ts`, grep de `parseBody` en 9 route files.

- **Validación manual apropiada en endpoints GET**: paginación con `Math.min/Math.max` cap'd a 50 (`professionals/route.ts:16`), regex para fecha (`/^\d{4}-\d{2}-\d{2}$/` en `appointments/availability/route.ts:19`), auth + rate limit per-user en geocode endpoints (30/min autocomplete, 20/min details). Endpoints read-only (health, specialties, insurances, claim/verify GET) sin input de riesgo. Evidencia: revisión completa de los 20 route files durante bloque 4.E.

- **Queries parametrizadas vía Prisma**: cero SQL crudo identificado en `src/`. Imposibilidad estructural de SQL injection por uso consistente de Prisma Client. Evidencia: cobertura del audit en bloques 4.A-4.E.

⚠️ **Excepción reconocida**: la única validación Zod insuficiente está documentada en #20 — `z.string().url()` para `cliniwebIcalUrl` acepta protocolos no-HTTP, habilitando SSRF. No desmerece la cobertura general, pero requiere remediación específica.

Estas prácticas son **replicables a otros productos del ecosistema** — verificar adopción consistente de Zod + `parseBody` en Kairos/Praetor/Exactor durante las re-auditorías pendientes.

### 4.A Vector primario — claim flow

- **[PROMOVIDA → #1]** Token de verificación nunca enviado al profesional. Peor que la hipótesis: no existe infraestructura de email. En dev, token retornado en respuesta HTTP. En prod, flujo muerto.
- **[PROMOVIDA → #2]** `ClaimRequest.email` no se compara con `Professional.email`. Confirmado: `Professional.email` ni siquiera se fetch-ea en ninguno de los 3 endpoints.
- **[PROMOVIDA → #3]** `Professional.isClaimed` sin `claimedAt` ni `claimedByUserId`. Confirmado. Trazabilidad indirecta vía User/ClaimRequest es frágil.
- **[PROMOVIDA → #4]** No existe panel admin de aprobación de claims. Confirmado: 0 rutas admin, claims se auto-aprueban.
- **[PROMOVIDA → #5]** Sin verificación de identidad para perfiles sin email publicado. Confirmado. Colapsa en #1/#2 hoy; se independiza al remediarlos.

**Hallazgos emergentes promovidos durante verificación del bloque 4.A:**

- **[EMERGENTE → #6]** `ClaimRequest` sin campo `expiresAt` ni validación de edad del token. Tokens permanentemente válidos amplifican todos los issues del claim flow.
- **[EMERGENTE → #7]** `GET /api/claim/verify` sin rate limiting estricto (100 req/min general vs 10 req/min de los demás endpoints del flujo). Inconsistencia defense-in-depth.

### 4.B Auth y sesiones

- **[PROMOVIDA → #8]** `User.emailVerifiedAt` no existe en schema. Confirmado: modelo User sin campo de verificación de email. Cuenta creada via claim con email arbitrario no verificado. Severidad: 🟡 Medio (amplificada por #1/#2).
- **[DEFERRED]** `PasswordReset.expiresAt` sin default a nivel schema. Justificación: campo required (non-nullable, sin @default) — Prisma enforce presencia a nivel de creación. App setea correctamente 1h en `forgot-password/route.ts:44`. Prisma no soporta `@default` para tiempos relativos. No hay gap de seguridad. Detalle en sección 5.4.
- **[PROMOVIDA → #9]** `PasswordReset.usedAt` sin enforcement de DB constraint. Confirmado: check existe en app (GET y POST) pero es TOCTOU. Transacción atómica pero sin constraint de DB. Severidad: 🟢 Bajo (impacto práctico negligible).
- **[PROMOVIDA → #10]** Cobertura de rate limiting. Cobertura general adecuada (geocode con triple protección, export/csv admin-only). Gap confirmado: exención blanket `GET /api/auth/*` en middleware.ts:77-79 incluye accidentalmente `GET /api/auth/reset-password`. Severidad: 🟢 Bajo.

**Hallazgos emergentes promovidos durante verificación del bloque 4.B:**

- **[EMERGENTE → #11]** Sistema completo sin infraestructura de email — bug sistémico que generaliza #1. Forgot-password muerto en producción + dev mode leak de resetUrl al solicitante. Severidad: 🔴 Crítico.

### 4.C Ecosistema Augur

- **[PROMOVIDA → #12]** Drift de auth confirmado. NextAuth 4.24 + CredentialsProvider + bcryptjs vs estándar JWT `@augur/auth`. Tokens no compartibles cross-app, SSO imposible. Severidad: 🟡 Medio (decisión arquitectónica delegada a Sección 7.1).
- **[PROMOVIDA → #13]** `kairosTenantId` sin FK + fallback inseguro `|| professional.id` + apiKey fallback `''`. Tres vectores de fallo latente mitigados hoy por mock client. Severidad: 🟠 Alto (bomba latente cuando se active integración real).
- **[PROMOVIDA → #14 (aspecto standalone) + DEFERRED en 5.4 (aspecto cross-ecosystem)]** Logging/observability. PlexusMap sin logging estructurado verificado: 22+ console.error ad-hoc, 0 dependencias, 0 helpers. Consistencia con resto del ecosistema NO verificable desde esta sesión. Severidad standalone: 🟡 Medio (amplifica forensics de #1, #4, #11).

**Hallazgos emergentes promovidos durante verificación del bloque 4.C:** ninguno (cross-block observation sobre apiKey vacío absorbida en #13).

### 4.D DevOps y continuidad

- **[REMEDIADO durante setup → #15 (VERIFIED-CLOSED)]** Remote git inexistente. Severidad 🟠 Alto (pre-remediación). Resuelto en Tarea B del setup del audit.
- **[REMEDIADO durante setup → #16 (VERIFIED-CLOSED)]** CLAUDE.md describía Praetor. Severidad 🟡 Medio (pre-remediación). Resuelto en commit `52a53ca`.
- **[REMEDIADO durante setup → #17 (VERIFIED-CLOSED)]** 96 archivos sin commitear en master. Severidad 🟠 Alto (pre-remediación). Resuelto en commit `164fd95`.
- **[PROMOVIDA → #18]** `scripts/output/` con PII de profesionales reales (477 celulares WhatsApp) commiteado al repo sin `.gitignore`. Severidad 🟠 Alto.
- **[PROMOVIDA → #19]** Credenciales admin triviales (`admin123`, `founder2026!`) en seed.ts, documentadas en CLAUDE.md. Activas en producción pendiente de verificación del propietario. Severidad 🟠 Alto (escalamiento condicional a 🔴).
- **[VERIFIED-NO-ISSUE]** Configuración de infra (`nginx/default.conf`, `scripts/*.sh`, `docker-compose.yml`, `Dockerfile`) verificada: sin secrets, sin IPs hardcoded, env vars correctamente parametrizados. Documentado como buena práctica en sección 4.0.5.

**Hallazgos emergentes durante verificación del bloque 4.D:** ninguno. Hipótesis 4.D.6 cerrada sin issue, documentada como buena práctica.

### 4.E Validación y superficie no documentada

- **[VERIFIED-NO-ISSUE]** Cobertura Zod completa. 9 esquemas en `validations.ts` cubren los 9 endpoints POST/PUT. GET endpoints con validación manual apropiada. Queries parametrizadas vía Prisma. Documentado como buena práctica en sección 4.0.5.
- **[NOTA METODOLÓGICA]** 11 endpoints adicionales al AUDIT-BRIEF abril 2026 identificados y cubiertos durante bloques 4.A-4.F. Ver nota al cierre del bloque.
- **[PROMOVIDA → #20]** SSRF en sync-ical. Fetch nativo a URL arbitraria sin validación de protocolo/IP/allowlist. Docker network expone postgres, redis, y app. Cross-ref #19 amplifica superficie. Severidad: 🔴 Crítico.
- **[VERIFIED-NO-ISSUE]** `GET /api/export/csv` requiere auth + rol ADMIN + rate limit general (100/min). Ya evaluado como aceptable en #10. Seguridad efectiva depende de resolución de #19 (credenciales admin triviales).

**Nota metodológica (4.E.2):** AUDIT-BRIEF.md (versión abril 2026) describía ~9 endpoints. La auditoría identificó 20 route files en `src/app/api/`, con 11 endpoints adicionales no documentados en el brief original (`/api/geocode/*`, `/api/export/csv`, `/api/og`, `/api/icon`, `/api/professionals/[slug]/sync-ical`, `/api/appointments/*`, `/api/auth/reset-password`, `/api/claim/verify/complete`, `/api/health`). La cobertura de auditoría se extendió a todos durante los bloques 4.A-4.F. Recomendación para futuros productos del ecosistema Augur: regenerar AUDIT-BRIEF como paso inicial del audit, no asumir vigencia del previo.

**Observación emergente para bloque 4.F:** durante revisión de `POST /api/professionals/[slug]/reviews` se identificó que el per-name rate limit es bypassable con nombres distintos. Revisar en bloque 4.F como issue de integridad/spam, no de seguridad de superficie.

### 4.F Modelo de datos e integridad

- **[REFUTADO mayormente]** 4.F.1 — Integridad referencial y cascadas. Todas las relaciones hijas de `Professional` (Review, Appointment, Schedule, ProfessionalInsurance, ClaimRequest) tienen `onDelete: Cascade` con constraint a nivel DB (`schema.prisma:135,157,178,121-123,195`; `migration.sql:178-190`); `Specialty → Professional` es `RESTRICT`. Sin huérfanos. **Sub-hallazgo 🟢 (NO genera issue):** `User → Professional` es `onDelete: SET NULL` (`migration.sql:169`) → borrar un `Professional` deja la cuenta `User` huérfana (login vivo, `professionalId=null`); `dedup-professionals.ts:105-109` borra duplicados sin manejar esa relación, y su comentario "cascade not always set" (`:106`) es inexacto (las cascadas SÍ están configuradas).
- **[PROMOVIDA → #24]** 4.F.2 — Índices y rendimiento. Falta índice inverso en `ProfessionalInsurance.insuranceId` (la PK compuesta solo prefija `professionalId`, `schema.prisma:126`) + sin índice trigram/GIN para los `contains` ILIKE de name/address. Full table scan a 2,685+ profesionales.
- **[PROMOVIDA → #25]** 4.F.3 — PII a nivel modelo. PII (`whatsappPhone`, `Review/Appointment.patientPhone`) en claro, sin cifrado at-rest ni separación público/privado. **Nota:** el síntoma de #18 NO se reproduce en la API — el perfil omite `patientPhone` (`[slug]/page.tsx:58-68`) y la búsqueda solo expone el `phone` landline (`professionals/route.ts:96-116`); lo promovido es la **causa raíz a nivel de datos**. `Review.patientPhone` además está muerto en el flujo público (la ruta no lo setea, `reviews/route.ts:49-58`) — responde la pregunta de scope carry-forward.
- **[PROMOVIDA → #26, #27]** 4.F.4 — Integridad de import. #26: sin constraint anti-duplicado (el slug `-N` evade el unique, `insert-assa-new.ts:147-152`; dedup manual post-hoc). #27: geocoding no determinista persistido (`geocode.ts:166-172`, `Math.random()` en el fallback) + `DEFAULT_LAT/LNG` colisiona con un profesional real del seed.
- **[PROMOVIDA → #28]** 4.F.5 — Reviews + spam. Rate limit per-name bypasseable (`reviews/route.ts:31-46`), sin estado de moderación (`schema.prisma:143`); el `rating` alimenta ranking (`route.ts:89`) y `aggregateRating` JSON-LD SEO. Escalado a 🟠.
- **[PROMOVIDA → #29]** 4.F.6 — Migraciones e higiene. Drift `Review.patientPhone` NOT NULL en migración (`migration.sql:86`) vs nullable en schema vivo vía `db push` (`schema.prisma:138`) + migraciones manuales sin timestamp Prisma completo + seed destructivo (`seed.ts:880-887`).
- **[PROMOVIDA → #30]** 4.F.7 — Borrado / Ley 81 PA. Cero `deletedAt` en los 9 modelos, sin flujo de borrado/rectificación; `ClaimRequest` retiene PII indefinidamente (cross-ref #6).
- **[REFUTADO]** Carry-forward `Review.helpfulCount` "counter trivialmente manipulable vía repetición del endpoint": es campo **muerto** — solo se lee, hardcoded a 0 (`ProfilePage.tsx:28`), sin endpoint que lo incremente. No existe vector.
- **[NO PROMOVIDO]** Carry-forward `Schedule` sin excepciones (vacaciones/feriados/slots bloqueados): limitación funcional, no de seguridad. No se promueve.
- **[ABSORBIDO en #31]** Carry-forward `Appointment.patientPhone` sin validación de formato a nivel schema: el endpoint que lo escribe (`POST /api/appointments`) se promueve por authz en #31; la validación de formato sí existe a nivel app (`createAppointmentSchema`, `validations.ts:73-78`).

**Hallazgos emergentes promovidos durante verificación del bloque 4.F:**

- **[EMERGENTE → #31]** `POST /api/appointments` sin autenticación ni rate limit, escribe PII de paciente (`appointments/route.ts`, 0 `getServerSession`). Latente hoy por `kairosEnabled=false`; 🔴 si Kairos se activa sin parche. Cross-ref #13.

---

## 5. DELTA vs AUDIT-BRIEF.md (Sección 9 — Deuda Técnica)

> Estructura espejo del delta consolidado por Claude Code en el inventario inicial. Cada entrada se cierra con commit SHA cuando aplica.

### 5.1 VERIFIED-CLOSED — Hallazgos del brief resueltos en código actual

| Hallazgo en brief | Estado actual | Commit que resolvió |
|---|---|---|
| "Password temporal invisible al usuario" (ALTA) | Resuelto — `ClaimPasswordForm.tsx` permite elegir password | `01935f6` |
| "No hay forgot password" (ALTA) | Resuelto — existen `forgot-password/route.ts` y `reset-password/route.ts` | `01935f6` (presumido, verificar) |

### 5.2 VERIFIED-OPEN — Hallazgos del brief que SIGUEN vivos

Las entradas aquí se promueven a Sección 4 con número de issue. Esta tabla solo lleva el cross-reference.

| Hallazgo en brief | Sección 4 |
|---|---|
| "Claim verify auto-aprueba sin verificación" (ALTA) | 4.A — claim flow vector primario |
| "Password/token de claim no se comunica al dueño" — mitad **email** del hallazgo (la mitad UI se cerró en 5.1) (ALTA) | 4.A / 4.B — #1 (token nunca enviado), #11 (sin infraestructura de email) |

### 5.3 PARTIAL — Hallazgos parcialmente resueltos

| Hallazgo en brief | Lo resuelto | Lo que falta | Sección 4 |
|---|---|---|---|
| "Zod instalado pero no se usa" (MEDIA) | `validations.ts` existe, usado en claim routes | Cobertura en dashboard, appointments, reviews | 4.E |
| "No hay rate limiting" (ALTA) | `middleware.ts` con rate limiting en auth + claim | Cobertura en geocode, export/csv, sync-ical | 4.B |

### 5.4 DEFERRED — Hallazgos no verificables hoy

| Hipótesis | Razón del defer | Sesión |
|---|---|---|
| 4.B.2 — `PasswordReset.expiresAt` sin default a nivel schema | Campo es required (non-nullable). App setea 1h correctamente en `forgot-password/route.ts:44`. Ambos handlers de `reset-password/route.ts` verifican expiración. Prisma no soporta `@default` para tiempos relativos (now + offset). No hay gap de seguridad — el patrón actual (required sin default) es el correcto. | 4.B |
| 4.C.3 — Consistencia de logging/observability con resto del ecosistema | Aspecto cross-ecosystem no verificable desde esta sesión: solo PlexusMap fue auditado, y los audits previos de Kairos/Praetor/Exactor no documentaron su patrón de observability. Para confirmar drift o alineación se requiere lectura cross-repo. **Razón metodológica, no no-issue** — el aspecto standalone (PlexusMap sin logging estructurado) ya fue promovido a #14. | 4.C |

### 5.5 Delta vs tesis estratégica Augur

PlexusMap no es SaaS comercial: es infraestructura pública con tres roles — (1) embudo SEO orgánico que genera leads para los productos comerciales, (2) moat de datos defensivo (2,685+ profesionales geolocalizados con redes de aseguradoras, difícil de replicar), (3) base futura del booking integrado con Kairos. Requisito transversal: mantener percepción de marca **independiente y neutral** para conservar credibilidad como directorio. Leídos contra esta tesis, los hallazgos no atacan tanto "¿es seguro el código?" como los tres roles estratégicos.

**Rol 1 — Embudo SEO / lead-gen:**

- **#11 (🔴 sin infraestructura de email)** rompe la conversión de raíz: claim flow y forgot-password muertos → nadie puede reclamar su perfil → el embudo capta tráfico pero no convierte. Es el golpe más directo al rol de funnel.
- **#28 (🟠 spam de reviews)** envenena `rating` → contamina a la vez el ranking de búsqueda y el `aggregateRating` del JSON-LD → degrada la calidad del lead y la señal de confianza indexada por buscadores.
- **#14 (🟡 sin logging estructurado)** → sin medición del funnel ni forensics de abuso.

**Rol 2 — Moat de datos defensivo (2,685+ profesionales):**

- **#18 (🟠) + #25 (🟡) + #30 (🟡)** → el moat es a la vez el mayor activo y el mayor pasivo: una fuga o scrape expone PII personal (celular WhatsApp, teléfonos de pacientes — que **no** son datos públicos del directorio) → riesgo legal (Ley 81) y reputacional que erosiona la credibilidad de directorio neutral.
- **#26/#27 (🟡 duplicados + geocoding no determinista)** → erosionan la calidad del dataset (pins duplicados/mal ubicados) → reducen el valor defensivo del moat.

**Rol 3 — Base futura de booking con Kairos:**

- **#13 (🟠 tenantId fallback inseguro + apiKey vacío)** → el sustrato de integración es inseguro; activar booking sin parchear cablea cada profesional a un tenant adivinable.
- **#31 (🟠 appointments sin auth)** → bomba latente: al activar `kairosEnabled` el endpoint se vuelve un sumidero de PII anónimo.
- **#20 (🔴 SSRF en sync-ical)** → la superficie de integración de calendario es explotable, amplificada por #19 a 2,685+ profesionales.

**Síntesis:** la exigencia de neutralidad de marca **eleva las apuestas** de los issues de PII (#18/#25/#30) y de credenciales admin (#19) por encima de su severidad técnica nominal — un takeover de perfil (#1/#2/#5) o una fuga de PII no es solo un bug: es la pérdida del rol de "directorio independiente y confiable" del que depende todo el embudo.

---

## 6. TOP 3 PRIORIDADES DE REMEDIACIÓN

Criterios: severidad × esfuerzo de remediación × impacto en el ecosistema, leídos contra los tres roles estratégicos (§5.5). El orden es de **ejecución**, no solo de severidad nominal.

**Acción-0 (hoy, antes de cualquier parche) — verificar #19 en producción.** Intentar login con `admin@plexusmap.com / admin123` y `fundador@plexusmap.com / founder2026!`. Si alguna funciona: rotar de inmediato y escalar #19 a 🔴. La verificación es gratuita y **acota el radio de explotación de #20**: mientras las credenciales admin triviales estén activas, el SSRF alcanza a los 2,685+ profesionales del directorio (vía admin bypass de ownership), no solo a los reclamados.

### 1. #20 — SSRF en sync-ical (🔴)

- **Por qué primero:** es lo único explotable HOY en producción (regla 1.3: 🔴 = remediación inmediata). Amplificado por #19 a todo el directorio.
- **Qué desbloquea:** cierra el agujero activo de la superficie de integración de calendario — el rol 3 (booking Kairos) se construye sobre esa superficie.
- **Trade-off:** remediación contenida (validación de protocolo `https://` + allowlist de IP/dominios de calendario), bajo esfuerzo / alto retorno. Cross-ref #19: la acción-0 reduce el radio mientras se aplica el parche.

### 2. #11 — Sistema sin infraestructura de email (🔴)

- **Por qué segundo:** es la raíz que mata claim flow y forgot-password, y es **prerrequisito** para cerrar correctamente los críticos de takeover de claim (#1, #2, #5 — no se puede enviar el token de verificación al dueño real sin canal de email).
- **Qué desbloquea:** el rol 1 (conversión del embudo) y la remediación de tres críticos de una sola vez. Sin email, el producto capta tráfico pero no convierte, y los criticals de claim no tienen fix correcto.
- **Trade-off:** requiere elegir/integrar un proveedor de email (esfuerzo de infra real), pero es fundacional — todo el funnel depende de ello.

### 3. #18 / #25 — PII (477 celulares WhatsApp + modelo sin cifrado/separación) (🟠/🟡)

- **Por qué tercero:** riesgo legal (Ley 81 PA) y reputacional sobre el moat de datos (rol 2) y la exigencia de marca neutral. Una fuga de PII personal no es un bug técnico: erosiona la credibilidad de directorio independiente de la que depende todo el embudo.
- **Qué desbloquea:** evita que el activo defensivo (el dataset) se convierta en su mayor pasivo.
- **Trade-off:** esfuerzo medio — `.gitignore` + `git rm --cached` + scrub de history (BFG/`git filter-repo`) para #18, y cifrado/separación de columnas privadas para #25.

**Por qué estos y no otros:** #13 (tenantId inseguro) y #31 (appointments sin auth) son bombas **latentes** gateadas por la integración Kairos aún inactiva → backlog priorizado, no top-3 hoy. #28 (spam de reviews) golpea la calidad del funnel pero no es explotación de seguridad ni rompe la conversión de raíz → cuarto en prioridad. #19 es crítico condicional pero su acción inmediata es **verificación**, no remediación de código → tratado como acción-0 ligada a #20.

---

## 7. DECISIONES ARQUITECTÓNICAS PENDIENTES

No son issues — son decisiones de rumbo que la auditoría destapa y que Rogelio debe tomar conscientemente.

### 7.1 Auth: ¿migrar a `@augur/auth` o mantener NextAuth?

**Trade-off:** consistencia del ecosistema y compartibilidad de tokens cross-app vs costo de migración y madurez actual de NextAuth en producción. Relevante para integración futura con Kairos vía `kairosTenantId` y para una hipotética experiencia de SSO entre productos Augur.

### 7.2 Claims: ¿panel admin de aprobación o auto-aprobación con verificación email reforzada?

**Trade-off:** la auto-aprobación actual (token sent → password → claim done) es operacionalmente eficiente pero depende 100% de que el token llegue al dueño correcto. Un panel admin agrega fricción y costo operativo recurrente pero permite revisar casos ambiguos (perfiles sin email publicado, dueño real disputa claim previo, etc.). Alternativa intermedia: auto-aprobación + 7 días de "grace period" donde el dueño real puede impugnar con prueba de identidad.

### 7.3 Repo: ¿separar infra config a repo dedicado o mantener monorepo?

**Trade-off:** el repo actual mezcla código de app, config Nginx, scripts de VPS, datos de cross-reference de aseguradoras (`scripts/output/`), e iconos rasterizados. Mantenerlo es ágil para un product owner solo; separarlo aclara superficie de auditoría y reduce el riesgo de filtrar secrets de infra junto con código.

### 7.4 Gobernanza de datos del directorio

(Decisión adicional sugerida por el inventario.) Los datos importados de aseguradoras y Google Places están en producción y commiteados al repo en formatos intermedios. Pendiente: política explícita sobre qué se versiona, qué se mantiene fuera del repo, y proceso de re-import para mantener frescura.

> **Cierre de §7:** estas cuatro decisiones (7.1–7.4) son el output **arquitectónico** del audit — no son issues remediables sino bifurcaciones de rumbo que Rogelio debe resolver conscientemente antes de elevarlas al roadmap del ecosistema Augur.

---

## 8. CIERRE DE LA AUDITORÍA

Esta auditoría se ejecutó con el **harness multi-agente** del ecosistema Augur (§1.2): Claude web redactó outlines y verificaciones de estructura, Rogelio aprobó cada paso, y Claude Code CLI aplicó los `str_replace` individuales sobre `PLEXUSMAP_AUDIT.md` — sin `--dangerously-skip-permissions` ni allow-all; cada edición y cada commit pasaron por confirmación explícita en sesión.

La **política de trazabilidad** (§1.1) fue estricta: un hallazgo solo se promueve a issue numerado si se verifica contra el código actual del repo con evidencia `archivo:línea`; lo no verificable contra el código de hoy se marca **DEFERRED** y no se reconstruye desde memoria del agente. Bajo esta política quedaron **2 hipótesis DEFERRED con razón documentada** (4.B.2 `PasswordReset.expiresAt` sin default — el patrón required es el correcto, sin gap de seguridad; 4.C.3 logging cross-ecosystem — no verificable sin lectura cross-repo, su aspecto standalone se promovió a #14) y **3 hallazgos cerrados como VERIFIED-CLOSED** (#15 remote git inexistente, #16 CLAUDE.md describía Praetor, #17 96 archivos sin commitear — los tres remediados durante el setup del audit). El alcance cubrió los bloques de verificación 4.A–4.F (claim flow, auth/sesiones, ecosistema Augur, DevOps, validación/superficie, modelo de datos); el vector primario declarado fue el takeover de perfiles vía claim flow.

| Métrica | Valor |
|---|---|
| Total de hallazgos numerados | **31** (#1–#31) |
| └─ OPEN | 28 |
| └─ VERIFIED-CLOSED | 3 — #15, #16, #17 |
| 🔴 Críticos (OPEN) | 5 — #1, #2, #5, #11, #20 |
| 🟠 Altos (OPEN) | 9 |
| 🟡 Medios (OPEN) | 12 |
| 🟢 Bajos (OPEN) | 2 |
| DEFERRED (hipótesis sin número) | 2 — 4.B.2, 4.C.3 |
| Total de commits del audit | 47 (45 previos + C3 + C4 de cierre) |
| SHA del último commit | (C4 — commit de cierre; reportado al cierre) |
| Branch final | `audit/plexusmap-initial` |
| Remote | `https://github.com/coc2121712/plexusmap.git` |

**Siguientes pasos del ecosistema (post-PlexusMap):**

1. Implementación de remediaciones Top 3 (cross-producto si aplica).
2. Re-auditoría de Praetor con harness metodológico nuevo (los hallazgos #5-#14 del audit del 14-may no usaron el harness consolidado en Exactor).
3. Re-auditoría de Kairos con harness metodológico nuevo (mismo razonamiento, audit del 15-may).
4. Decisiones arquitectónicas de Sección 7 elevadas a roadmap del ecosistema.

---

*Documento generado por harness multi-agente del ecosistema Augur. Política de hallazgos y trazabilidad: ver Sección 1.*
