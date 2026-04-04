# PlexusMap — Audit Brief

## 1. Qué es

PlexusMap es un directorio geolocalizado de profesionales de salud en Panamá. Funciona como funnel de adquisición gratuito para **Kairos** (SaaS de agendamiento de citas, aún no integrado). Los profesionales de salud se listan con perfil público, mapa interactivo, reseñas y horarios. Los profesionales pueden reclamar su perfil, gestionar su información y responder reseñas desde un dashboard privado.

**Mercado objetivo:** Panamá (Ciudad de Panamá principalmente).
**Idioma:** Español (es-PA) en toda la UI.
**Estado:** MVP funcional, pre-producción. Solo datos seed (19 profesionales ficticios).

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.2 |
| Frontend | React | 19.2.4 |
| Lenguaje | TypeScript (strict mode) | 5.x |
| CSS | Tailwind CSS | 4.x |
| ORM | Prisma | 5.22.0 |
| Base de datos | PostgreSQL (Docker) | 16 |
| Auth | NextAuth.js (Credentials provider) | 4.24.13 |
| State management | Zustand | 5.0.12 |
| Validación | Zod (importado, no usado activamente) | 4.3.6 |
| Mapas | @vis.gl/react-google-maps + @googlemaps/markerclusterer | 1.8.2 / 2.6.2 |
| Hashing | bcryptjs | 3.0.3 |

---

## 3. Cómo Correr el Proyecto

### Prerequisitos
- Node.js 20+
- Docker Desktop corriendo con container `dental_db` (PostgreSQL 16)
- No se requiere Google Maps API key para funcionalidad base (mapa muestra fallback)

### Comandos
```bash
docker start dental_db
cd C:\Users\radia\plexusmap
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev -- -p 3001
```

### URLs
- App: http://localhost:3001
- API base: http://localhost:3001/api

### Variables de entorno (.env)
```
DATABASE_URL="postgresql://dental:dental@localhost:5432/plexusmap?schema=public"
NEXTAUTH_SECRET="plexusmap-dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3001"
```

### Credenciales de prueba
| Rol | Email | Password | Notas |
|-----|-------|----------|-------|
| Admin | admin@plexusmap.com | admin123 | Sin perfil profesional vinculado |
| Profesional | gponce@plexusmap.com | demo123 | Vinculada a "Dra. Gabriela Ponce" |

---

## 4. Arquitectura de Archivos

```
plexusmap/
├── prisma/
│   ├── schema.prisma          # 8 modelos, 4 enums
│   └── seed.ts                # 679 líneas, datos ficticios de Panamá
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout, fuentes Geist, SEO metadata
│   │   ├── page.tsx           # Homepage SSR (carga specialties + insurances)
│   │   ├── globals.css        # Tailwind v4 + theme tokens CSS
│   │   ├── sitemap.ts         # Sitemap dinámico (~35 URLs)
│   │   ├── login/page.tsx     # Login form (client component)
│   │   ├── [slug]/page.tsx    # Perfil público SSR + JSON-LD
│   │   ├── especialidad/[slug]/page.tsx  # Landing por especialidad
│   │   ├── claim/
│   │   │   ├── page.tsx       # Formulario de reclamo de perfil
│   │   │   └── verify/page.tsx # Página post-verificación
│   │   ├── (dashboard)/       # Route group con auth check
│   │   │   ├── layout.tsx     # Auth guard + DashboardShell
│   │   │   └── dashboard/
│   │   │       ├── page.tsx        # Resumen (stats + reviews)
│   │   │       ├── profile/page.tsx  # Editor de perfil
│   │   │       ├── schedule/page.tsx # Editor de horarios
│   │   │       └── reviews/page.tsx  # Gestor de reseñas
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth config
│   │       ├── professionals/
│   │       │   ├── route.ts         # GET búsqueda con filtros
│   │       │   ├── specialties/route.ts  # GET lista especialidades
│   │       │   ├── insurances/route.ts   # GET lista aseguradoras
│   │       │   └── [slug]/reviews/route.ts  # POST reseña pública
│   │       ├── dashboard/
│   │       │   ├── profile/route.ts    # PUT actualizar perfil
│   │       │   ├── schedule/route.ts   # PUT actualizar horario
│   │       │   └── reviews/[id]/reply/route.ts  # PUT responder reseña
│   │       └── claim/
│   │           ├── route.ts         # POST solicitar reclamo
│   │           └── verify/route.ts  # GET verificar token
│   ├── components/
│   │   ├── HomePage.tsx             # Layout principal: header + search + map + list
│   │   ├── ui/Header.tsx            # Navbar global
│   │   ├── map/
│   │   │   ├── MapView.tsx          # Google Maps wrapper + locate button
│   │   │   └── MapMarkers.tsx       # Pins coloreados por especialidad
│   │   ├── search/
│   │   │   ├── SearchBar.tsx        # Búsqueda debounced + filtros dropdown
│   │   │   ├── ProfessionalList.tsx # Lista sidebar de resultados
│   │   │   └── SpecialtyLanding.tsx # Vista de landing por especialidad
│   │   ├── professional/
│   │   │   ├── ProfilePage.tsx      # Perfil completo público
│   │   │   ├── ReviewCard.tsx       # Tarjeta de reseña individual
│   │   │   ├── ScheduleTable.tsx    # Tabla horario semanal
│   │   │   ├── ContactActions.tsx   # Botones: llamar, WhatsApp, compartir
│   │   │   ├── MiniMap.tsx          # Mapa estático placeholder
│   │   │   └── PublicReviewForm.tsx # Formulario de reseña pública
│   │   ├── claim/
│   │   │   └── ClaimForm.tsx        # Formulario de reclamo con buscador
│   │   ├── dashboard/
│   │   │   ├── DashboardShell.tsx   # Layout: sidebar + mobile nav
│   │   │   ├── StatsOverview.tsx    # 4 stat cards
│   │   │   ├── ProfileEditor.tsx    # Editar teléfono, email, bio, seguros
│   │   │   ├── ScheduleEditor.tsx   # Toggles por día + horarios
│   │   │   └── ReviewsManager.tsx   # Lista con reply inline
│   │   ├── seo/JsonLd.tsx           # Schema.org MedicalBusiness + WebSite
│   │   └── providers/SessionProvider.tsx  # NextAuth SessionProvider wrapper
│   ├── hooks/
│   │   └── useProfessionals.ts      # Hook: fetch professionals on filter change
│   ├── stores/
│   │   └── map-store.ts             # Zustand: professionals, filters, map state
│   ├── lib/
│   │   ├── prisma.ts                # Singleton PrismaClient
│   │   ├── google-maps.ts           # (placeholder, no contenido sustancial)
│   │   ├── kairos-client.ts         # (placeholder, no implementado)
│   │   └── praetor-client.ts        # (placeholder, no implementado)
│   └── types/
│       ├── index.ts                 # Interfaces compartidas
│       └── next-auth.d.ts           # Type augmentation para session
```

**Total: 22 rutas compiladas (build exitoso)**

---

## 5. Modelo de Datos (Prisma)

### Modelos
| Modelo | Propósito | Campos clave |
|--------|-----------|-------------|
| **User** | Autenticación | email (unique), password (bcrypt), role (ADMIN/PROFESSIONAL), professionalId? (FK 1:1) |
| **Specialty** | Taxonomía normalizada | slug (unique), name, icon (emoji), parentId (self-ref para sub-especialidades) |
| **Professional** | Perfil público | slug, name, specialtyId, lat/lng, phone?, email?, bio?, rating, reviewCount, isVerified, isClaimed, kairosEnabled, photos[] |
| **Insurance** | Aseguradoras | name (unique) |
| **ProfessionalInsurance** | M2M | professionalId + insuranceId (composite PK) |
| **Review** | Reseñas | professionalId, patientName?, patientPhone?, rating (1-5), comment?, reply?, source (PLEXUSMAP/WHATSAPP), isVerified, helpfulCount |
| **Appointment** | Citas (placeholder) | professionalId, patientName, patientPhone, dateTime, status, source |
| **Schedule** | Horario semanal | professionalId, dayOfWeek (0-6), startTime, endTime, slotDuration, isActive |
| **ClaimRequest** | Reclamos de perfil | professionalId, name, email, phone, message?, status (PENDING/APPROVED/REJECTED), token (unique) |

### Datos seed
- 13 especialidades médicas
- 10 aseguradoras panameñas
- 19 profesionales con coordenadas reales de Ciudad de Panamá
- ~97 horarios, ~47 reseñas con nombres ficticios
- 2 usuarios (admin + demo profesional)

---

## 6. Funcionalidades Implementadas

### 6.1 Búsqueda y Mapa (Homepage)
- **Mapa interactivo** con Google Maps (o fallback sin API key)
- **Pins coloreados** por slug de especialidad (verde=optometría, azul=odontología, etc.)
- **InfoWindow** al hacer click en pin con nombre, especialidad, rating
- **Búsqueda de texto** con debounce 300ms (nombre, especialidad, dirección)
- **Filtro por especialidad** (dropdown con slugs)
- **Filtro por aseguradora** (dropdown)
- **Lista lateral** de profesionales (desktop) o lista inferior (mobile)
- **Botón "Ubicarme"** para centrar mapa en geolocalización del usuario
- **Zustand store** para estado global: professionals, filters, mapCenter, selectedProfessional
- **Paginación** API: pageSize configurable (default 20, max 50)

### 6.2 Perfiles Públicos (`/[slug]`)
- **SSR** con generateMetadata para SEO
- **JSON-LD** Schema.org MedicalBusiness (aggregateRating, geo, openingHours)
- **Hero section**: foto/emoji, nombre, badge verificado, especialidad, rating con estrellas, dirección, badges de seguros
- **Biografía** editable
- **Reseñas** con avatar inicial, estrellas, time-ago en español, badge "Verificado", badge "WhatsApp", sección de respuesta del profesional
- **Formulario de reseña pública**: selector de estrellas interactivo (hover), nombre, comentario con contador /500
- **Horario semanal**: tabla Lunes-Domingo con badge "Hoy" para día actual
- **Mini mapa** placeholder con link a Google Maps
- **ContactActions**: botón llamar, WhatsApp (con mensaje pre-llenado), compartir (Web Share API o clipboard), Kairos booking (si habilitado)
- **CTA "Reclamar perfil"** en sidebar si `isClaimed === false` (link lleva al slug pre-seleccionado)

### 6.3 Landing por Especialidad (`/especialidad/[slug]`)
- **SSR** con metadata dinámica
- Lista de profesionales de esa especialidad
- SEO-friendly URLs

### 6.4 Claim Flow (Reclamo de Perfil)
- **Página `/claim`**: buscador de profesionales no reclamados con dropdown, formulario (nombre, email, teléfono, mensaje)
- **Pre-selección** via query param `?professional=slug` desde perfil público
- **`POST /api/claim`**: crea ClaimRequest con token random (32 bytes hex), validaciones: email formato, profesional existe, no reclamado, no hay solicitud pendiente
- **`GET /api/claim/verify?token=xxx`**: transacción — crea User con password temporal, marca Professional.isClaimed=true, aprueba ClaimRequest
- **Dev mode**: muestra URL de verificación directa (bypass email)
- **Página `/claim/verify`**: éxito (green checkmark + links a login y perfil) o pendiente (amber clock)

### 6.5 Dashboard Profesional (autenticado)
- **Auth guard** en layout: redirige a /login si no hay session
- **DashboardShell**: sidebar desktop + tabs mobile, logo, avatar con inicial, signOut

#### 6.5.1 Resumen (`/dashboard`)
- 4 stat cards: rating, total reseñas, citas pendientes, estado verificación
- Últimas 5 reseñas con link para responder

#### 6.5.2 Mi Perfil (`/dashboard/profile`)
- Editar: teléfono, email público, dirección, biografía (max 500 chars)
- Nombre: read-only (contactar soporte)
- Checkboxes de aseguradoras aceptadas (styled como toggle cards)
- PUT en /api/dashboard/profile: actualiza Professional + sync M2M insurances

#### 6.5.3 Horario (`/dashboard/schedule`)
- 7 días con toggle activo/inactivo
- Inputs de hora inicio/fin por día
- Select de duración de slot (15/20/30/45/60 min)
- Reordenado: Lunes-Sábado, luego Domingo
- PUT en /api/dashboard/schedule: delete all + recreate activos

#### 6.5.4 Reseñas (`/dashboard/reviews`)
- Lista completa de reseñas con avatar, estrellas, fecha, badge verificado/WhatsApp
- Formulario inline para responder (textarea + enviar/cancelar)
- Contador de reseñas sin responder (banner amber)
- PUT en /api/dashboard/reviews/:id/reply: verifica ownership, max 500 chars

### 6.6 SEO
- **Metadata** dinámica por página (title, description, openGraph)
- **JSON-LD**: MedicalBusiness para perfiles, WebSite + MedicalOrganization para homepage
- **Sitemap dinámico** (`/sitemap.xml`): homepage + /claim + todas las especialidades + todos los profesionales
- **robots**: index + follow
- **Open Graph**: locale es_PA, type profile para perfiles

### 6.7 Autenticación
- **NextAuth Credentials** provider con bcrypt
- **JWT strategy** (7 días de duración)
- Token incluye: role, professionalId, professionalSlug
- **Session augmentation** via TypeScript declaration merging
- **Login page** standalone con redirect a /dashboard

---

## 7. Rutas API Completas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | /api/professionals | No | Búsqueda con query/specialty/insurance, paginación |
| GET | /api/professionals/specialties | No | Lista todas las especialidades |
| GET | /api/professionals/insurances | No | Lista todas las aseguradoras |
| POST | /api/professionals/[slug]/reviews | No | Crear reseña pública (rate limited) |
| POST | /api/auth/[...nextauth] | No | NextAuth login/callbacks |
| GET | /api/auth/[...nextauth] | No | NextAuth session/providers |
| PUT | /api/dashboard/profile | Si | Actualizar perfil profesional |
| PUT | /api/dashboard/schedule | Si | Actualizar horario |
| PUT | /api/dashboard/reviews/[id]/reply | Si | Responder a reseña |
| POST | /api/claim | No | Solicitar reclamo de perfil |
| GET | /api/claim/verify | No | Verificar token de reclamo |

---

## 8. Flujos de Prueba Sugeridos

### 8.1 Flujo Paciente (sin cuenta)
1. Entrar a http://localhost:3001 — ver mapa + lista de profesionales
2. Buscar por texto (ej: "optometría") — verificar debounce y resultados
3. Filtrar por especialidad dropdown — verificar pins en mapa actualizan
4. Filtrar por aseguradora — verificar filtrado
5. Click en profesional de la lista o pin del mapa — verificar info window
6. Navegar a perfil (ej: `/dra-gabriela-ponce`) — verificar hero, bio, reseñas, horario
7. Dejar una reseña pública — seleccionar estrellas, nombre "Test", comentario, enviar
8. Intentar dejar otra reseña con mismo nombre — debe dar error 429
9. Verificar que rating del profesional se actualiza
10. Probar botones: llamar (tel: link), WhatsApp (wa.me link), compartir
11. Verificar `/sitemap.xml` — debe listar todos los profesionales y especialidades

### 8.2 Flujo Claim (profesional reclama perfil)
1. Ir a `/claim` o click "Soy profesional" en header
2. Buscar un profesional no reclamado en el buscador
3. Llenar formulario (nombre, email, teléfono)
4. Enviar — en dev mode aparece botón "Verificar ahora"
5. Click verificar — redirige a `/claim/verify?success=true`
6. Verificar que muestra página de éxito con links
7. Intentar reclamar el mismo profesional de nuevo — debe dar error 409
8. Login con el email usado en el claim — debe funcionar

### 8.3 Flujo Dashboard (profesional autenticado)
1. Login con gponce@plexusmap.com / demo123
2. Verificar redirect a /dashboard con stats
3. Ir a "Mi Perfil" — editar teléfono, bio, toggle seguros, guardar
4. Ir a "Horario" — activar/desactivar días, cambiar horas, guardar
5. Ir a "Reseñas" — verificar lista, responder a una reseña sin respuesta
6. Verificar la respuesta aparece en el perfil público
7. Click "Ver mi perfil público" — abre perfil en nueva tab
8. Cerrar sesión — redirige a homepage

### 8.4 Flujo Admin
1. Login con admin@plexusmap.com / admin123
2. Dashboard muestra "No eres un profesional vinculado" (no tiene professionalId)
3. Verificar que no puede editar perfil/horario (401 en APIs)

### 8.5 Navegación y SEO
1. Ir a `/especialidad/optometria` — verificar lista de optómetras
2. Ir a `/especialidad/slug-inexistente` — verificar 404
3. Ir a `/slug-inexistente` — verificar 404
4. Verificar meta tags en head (title, description, og:*)
5. Ver source de un perfil — buscar JSON-LD script tag con @type MedicalBusiness
6. Verificar `/sitemap.xml` devuelve XML válido

### 8.6 Responsive
1. Homepage en mobile: lista inferior en vez de sidebar
2. Dashboard en mobile: tabs horizontales en vez de sidebar
3. Perfil en mobile: ContactActions se mueve debajo del hero
4. Claim form en mobile: campos stack verticalmente

---

## 9. Deuda Técnica y Hallazgos Potenciales

### 9.1 Seguridad

| Severidad | Hallazgo | Ubicación |
|-----------|----------|-----------|
| **ALTA** | No hay rate limiting en ninguna API (excepto review por nombre/día) | Todos los endpoints |
| **ALTA** | NEXTAUTH_SECRET hardcodeado y débil en .env | `.env` línea 9 |
| **ALTA** | Claim verify auto-aprueba sin verificación real de identidad | `api/claim/verify/route.ts` |
| **ALTA** | Password temporal del claim no se comunica al usuario (ni por email ni en UI) | `api/claim/verify/route.ts` |
| **MEDIA** | No hay CSRF protection explícita (NextAuth la maneja parcialmente) | Global |
| **MEDIA** | No hay validación con Zod en API routes (Zod está instalado pero no se usa) | Todos los endpoints |
| **MEDIA** | No hay helmet.js ni security headers | `next.config.ts` vacío |
| **MEDIA** | API dashboard profile no valida formato de email/phone | `api/dashboard/profile/route.ts` |
| **MEDIA** | `eslint-disable @typescript-eslint/no-explicit-any` en professionals route | `api/professionals/route.ts` línea 17 |
| **BAJA** | bcrypt rounds = 12 (acceptable pero costoso en serverless) | `api/claim/verify/route.ts` |
| **BAJA** | No hay logout endpoint (client-side signOut solamente) | Global |

### 9.2 Funcionalidad

| Severidad | Hallazgo | Ubicación |
|-----------|----------|-----------|
| **ALTA** | El flujo de claim crea password temporal que el usuario nunca recibe | `api/claim/verify/route.ts` — password no aparece en UI ni se envía por email |
| **ALTA** | No hay funcionalidad de "olvidé mi contraseña" | No existe |
| **MEDIA** | Appointment model existe pero no hay endpoints para crear/gestionar citas | Schema + API |
| **MEDIA** | `kairosEnabled` y `kairosTenantId` existen pero Kairos no está integrado | Schema + ContactActions |
| **MEDIA** | ProfileEditor no permite cambiar coordenadas lat/lng (al editar dirección) | `ProfileEditor.tsx` |
| **MEDIA** | MiniMap es un placeholder gris con link a Google Maps, no un mapa real | `MiniMap.tsx` |
| **MEDIA** | StatsOverview muestra "citas pendientes" hardcodeado a 0 | `StatsOverview.tsx` |
| **BAJA** | Admin sin professionalId ve dashboard vacío sin mensaje claro | `dashboard/page.tsx` |
| **BAJA** | No hay paginación en UI de reseñas (carga solo últimas 20) | `[slug]/page.tsx` |
| **BAJA** | `helpfulCount` en Review no tiene mecanismo de incremento en UI | Schema + ninguna UI |

### 9.3 Código y Arquitectura

| Severidad | Hallazgo | Ubicación |
|-----------|----------|-----------|
| **MEDIA** | Archivos placeholder sin implementar: `kairos-client.ts`, `praetor-client.ts`, `google-maps.ts` | `src/lib/` |
| **MEDIA** | Directorios fantasma de API sin contenido útil: `api/appointments`, `api/reviews`, `api/search`, `api/webhooks` | `src/app/api/` |
| **MEDIA** | No hay tests (ni unit, ni integration, ni e2e) | Global |
| **MEDIA** | No hay error boundary ni loading states globales | Global |
| **MEDIA** | next.config.ts está vacío (no image domains, no headers, no redirects) | `next.config.ts` |
| **BAJA** | SVG icons inline en vez de librería de iconos (mucho SVG repetido) | Múltiples componentes |
| **BAJA** | DashboardShell usa `<a href>` en vez de `<Link>` de Next.js (full page reload en navegación) | `DashboardShell.tsx` |
| **BAJA** | Header usa `<a href>` en vez de `<Link>` de Next.js | `Header.tsx` |
| **BAJA** | No hay `.env.example` | Root |

### 9.4 Estética y UX

| Severidad | Hallazgo | Ubicación |
|-----------|----------|-----------|
| **MEDIA** | No hay dark mode (theme tokens existen pero no hay toggle ni prefers-color-scheme) | `globals.css` |
| **MEDIA** | No hay loading skeleton ni spinner cuando se buscan profesionales | `HomePage.tsx` |
| **MEDIA** | No hay empty state ilustrado (solo texto plano) | Múltiples componentes |
| **BAJA** | El footer es minimal (una línea de texto) | `ProfilePage.tsx` |
| **BAJA** | Claim success page no explica cómo hacer login (password temporal es invisible) | `claim/verify/page.tsx` |
| **BAJA** | No hay animaciones de transición entre estados del formulario de reseña | `PublicReviewForm.tsx` |
| **BAJA** | Mobile nav del dashboard no muestra iconos (solo texto) | `DashboardShell.tsx` |

### 9.5 Performance

| Severidad | Hallazgo | Ubicación |
|-----------|----------|-----------|
| **MEDIA** | Homepage usa `force-dynamic` — no hay cache de ningún tipo | `page.tsx` |
| **MEDIA** | Professionals API no tiene cache layer (Prisma query cada request) | `api/professionals/route.ts` |
| **MEDIA** | Claim page carga TODOS los profesionales no reclamados en SSR | `claim/page.tsx` |
| **BAJA** | No hay image optimization (photos[] son paths pero no se usa next/image) | Múltiples componentes |
| **BAJA** | MarkerClusterer importado pero no verificado si se usa activamente | `package.json` |

---

## 10. Resumen de Métricas

| Métrica | Valor |
|---------|-------|
| Rutas compiladas | 22 |
| Modelos Prisma | 9 (User, Specialty, Professional, Insurance, ProfessionalInsurance, Review, Appointment, Schedule, ClaimRequest) |
| Enums | 4 (UserRole, ReviewSource, AppointmentStatus/Source, ClaimStatus) |
| Componentes React | 21 |
| API endpoints | 11 |
| Hooks custom | 1 (useProfessionals) |
| Stores Zustand | 1 (map-store) |
| Líneas de código (estimado) | ~3,500 |
| Tests | 0 |
| Dependencias runtime | 10 |
| Dependencias dev | 8 |
