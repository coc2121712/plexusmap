# CLAUDE.md — Praetor

## Qué es este proyecto
Praetor es una plataforma multi-tenant de mensajería WhatsApp + IA.
Es la infraestructura de comunicación del ecosistema Kairos.
Tiene dos modos de operación:
1. **Invisible** — envía confirmaciones/recordatorios como infraestructura de Kairos
2. **Nexus** — inbox completo con bot IA, campañas, y gestión de conversaciones

## Ecosistema
- **PlexusMap** → directorio geolocalizado de salud (funnel gratuito) → plexusmap.com
- **Kairos** → gestión de rendimiento de agenda (producto de pago $49-249/mes)
- **Praetor** (este proyecto) → WhatsApp + IA (infraestructura + Nexus como add-on)
- **Praetor Nexus** → módulo de Praetor: inbox 3 columnas + bot IA + campañas
- **Ludus** → CRM interno de la óptica del founder (no se vende)

## Migración en curso: Colloquium → Nexus
Estamos migrando el módulo "Colloquium" de Ludus a Praetor como "Nexus".
Colloquium es un sistema completo de gestión de conversaciones WhatsApp con IA
que funciona en producción para la óptica del founder (single-tenant, SQL Server).
La migración lo convierte en multi-tenant sobre PostgreSQL.

### Archivos fuente de Colloquium (referencia, NO modificar)
Ubicación: C:\Users\radia\Downloads\ludus\
- views/Colloquium.tsx (2,751 líneas) — Vista principal 3 columnas
- components/ColloquiumSettings.tsx (700 líneas) — Modal de configuración
- backend/src/routes/conversations/ — 42 endpoints API
- backend/src/services/botEngine.ts (1,236 ln) — Motor del bot IA
- backend/src/services/whatsappService.ts (93 ln) — Abstracción dual-provider
- backend/src/utils/humanDelay.ts (57 ln) — Delay humano realista
- docs/COLLOQUIUM_ARCHITECTURE.md — Documentación completa de arquitectura
- docs/COLLOQUIUM_MODULE_SUMMARY.md — Resumen técnico con schemas

### Lo que ya existe en Praetor (este repo)
- bot-service/src/services/IntentClassifier.ts
- bot-service/src/services/ToolExecutor.ts
- bot-service/src/services/StateStore.ts (Redis)
- bot-service/src/tools/LudusTool.ts (stub)
- bot-service/src/tools/KairosTool.ts (stub)
- praetor-admin/ — Panel admin en React

## Stack técnico
- Runtime: Node.js 20+, Express.js, TypeScript estricto
- DB: PostgreSQL con Prisma ORM
- Cache: Redis
- WhatsApp: Dialog360 (primario), Callbell (fallback)
- IA: OpenAI GPT-4o + GPT-4o-mini, Gemini 2.5 Flash (fallback)
- Audio: Whisper, Visión: GPT-4o Vision
- Frontend: React + Tailwind
- Deploy: VPS Hostinger con Docker

## Estructura objetivo
```
praetor/
├── src/
│   ├── core/                      # Core multi-tenant
│   │   ├── auth/
│   │   ├── providers/whatsappProvider.ts
│   │   ├── tenant/
│   │   └── webhook/webhookRouter.ts
│   ├── modules/nexus/             # Ex-Colloquium
│   │   ├── routes/                # 42 endpoints migrados
│   │   ├── services/botEngine.ts, tenantPromptBuilder.ts, etc.
│   │   ├── utils/humanDelay.ts
│   │   ├── connectors/kairosConnector.ts, plexusmapConnector.ts
│   │   └── knowledge/
│   ├── context/                   # Context Providers abstractos
│   │   ├── types.ts, ludusProvider.ts, kairosProvider.ts, genericProvider.ts
│   └── shared/llm/, media/, config/
├── praetor-admin/src/views/Nexus.tsx, NexusSettings.tsx
├── prisma/schema.prisma
└── docker-compose.yml
```

## Convenciones
- React: PascalCase, Services: camelCase, DB: snake_case con Prisma @map
- Tablas Nexus: prefijo nexus_, todas con tenant_id
- API: /api/nexus/* (módulo Nexus), /api/tenants/*, /api/webhook/*
- UI: Español (Panamá), Código: Inglés, No "any"

## Variables de entorno
DATABASE_URL, REDIS_URL, OPENAI_API_KEY, GEMINI_API_KEY,
DIALOG360_API_KEY, DIALOG360_API_URL, CALLBELL_API_KEY,
JWT_SECRET, KAIROS_API_URL, PLEXUSMAP_API_URL
