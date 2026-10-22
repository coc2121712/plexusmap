# PlexusMap — API de directorio v1

API de **solo lectura** para que otros servicios del ecosistema (Augur, Kairos) usen el directorio de PlexusMap como fuente de datos: profesionales, especialidades y aseguradoras.

- **Base:** `https://plexusmap.com/api/v1/directory` (en local, el puerto donde corras `npm run dev`).
- **Formato:** JSON, UTF-8. Solo `GET`.
- **Autenticación:** API key con permisos (ver [Autenticación](#autenticación)).
- **Código:** `src/app/api/v1/directory/`, lógica compartida en `src/lib/directory-api.ts`, autenticación en `src/lib/api-auth.ts`.

## Autenticación

Cada petición lleva una API key, de cualquiera de estas dos formas:

```bash
curl -H "x-api-key: $PLEXUSMAP_API_KEY" https://plexusmap.com/api/v1/directory/specialties
curl -H "Authorization: Bearer $PLEXUSMAP_API_KEY" https://plexusmap.com/api/v1/directory/specialties
```

La llave se manda **solo en cabecera**, nunca en la URL. Guárdala en una variable de entorno del servicio que la usa; no la subas al repo ni la escribas en logs (para identificarla en un log usa su prefijo de 12 caracteres, p. ej. `plx_Ab3dE5gH`).

### Permisos

| Permiso | Qué da |
|---|---|
| `directory:read` | Campos públicos del directorio. Lo exigen **todos** los endpoints. |
| `directory:internal` | Además, el bloque `internal` (`kairosTenantId`, `planType`, `planExpiresAt`). Incluye `directory:read`. |
| `directory:contacts` | **Reservado, no se emite.** Ver [Qué no expone](#qué-no-expone). |

### Crear y revocar llaves

Las llaves se manejan por script, no por HTTP. Solo se guarda el hash SHA-256 de la llave y su prefijo: **la llave completa se muestra una sola vez**, al crearla.

```bash
# Crear (la llave sale sola por stdout; el resto va a stderr)
npx tsx scripts/create-api-key.ts --name augur-prod
npx tsx scripts/create-api-key.ts --name kairos-prod --scopes directory:internal --expires-in-days 365

# Revocar por id o por prefijo (idempotente)
npx tsx scripts/revoke-api-key.ts --id <uuid>
npx tsx scripts/revoke-api-key.ts --prefix plx_Ab3dE5gH
```

Los scripts usan `DATABASE_URL` y **imprimen primero el destino** (`host:puerto/base`, sin credenciales): confírmalo antes de seguir, porque el `.env` local apunta a la base de desarrollo. Para listar llaves usa `npx prisma studio` (tabla `ApiKey`).

**Rotación:** crea la llave nueva, despliégala en el servicio, comprueba que funciona y recién entonces revoca la anterior.

## Límites

- **120 peticiones por minuto por llave.** Al pasarlo: `429` con cabecera `Retry-After` (segundos).
- Además rige el límite general de `/api/*` por IP (100 por minuto, `src/middleware.ts`). Una carga completa del directorio (~2.700 profesionales a 200 por página) son unas 14 peticiones.
- Los límites se cuentan en memoria de cada proceso: valen mientras haya un solo contenedor de la app.

## Convenciones

- **Errores:** siempre `{ "error": "<mensaje en español>", "code": "<código estable>" }`. Programa contra `code`, no contra el texto. `400` agrega `details` con `{ path, message }` por parámetro inválido.
- **Parámetros estrictos:** un parámetro desconocido es un `400`. Es a propósito: un error de tipeo como `updatedsince` no puede convertir una sincronización incremental en una descarga completa.
- **Valores vacíos:** `?lat=` se trata como ausente, no como `0`.
- **Fechas:** ISO 8601 en UTC (`2026-10-21T19:05:11.000Z`).
- **Caché:** las respuestas llevan `Cache-Control: private, max-age=60`.
- **Compatibilidad:** pueden agregarse campos nuevos a una respuesta sin cambiar de versión; **ignora los campos que no conozcas**. Un cambio incompatible saldría como `/api/v2`.

| `code` | HTTP | Cuándo |
|---|---|---|
| `missing_api_key` | 401 | No viene la llave. |
| `invalid_api_key` | 401 | La llave no existe. |
| `api_key_inactive` | 403 | Revocada o inactiva. |
| `api_key_expired` | 403 | Pasó su fecha de vencimiento. |
| `insufficient_scope` | 403 | Le falta el permiso que pide el endpoint. |
| `invalid_params` | 400 | Parámetro desconocido, fuera de rango o mal formado. |
| `invalid_cursor` | 400 | Cursor corrupto, o de otro modo de listado (ver más abajo). |
| `not_found` | 404 | El profesional no existe. |
| `rate_limited` | 429 | Más de 120 peticiones por minuto con esa llave. |
| `internal_error` | 500 | Error del servidor. |

## `GET /professionals`

Lista profesionales. Tiene **dos modos**, según si mandas `lat` y `lng`.

### Parámetros

| Parámetro | Tipo | Descripción |
|---|---|---|
| `q` | texto (1–100) | Todas las palabras deben estar en el nombre, o el texto completo en la especialidad o la dirección. Sin distinguir mayúsculas. |
| `specialty` | slug | Ej. `cardiologia`. Un slug padre también incluye a sus hijas. |
| `insurance` | id (uuid) o texto | Con uuid, coincidencia exacta con la aseguradora. Con texto, "contiene" sin distinguir mayúsculas (`assa` encuentra "ASSA Compañía de Seguros"). |
| `claimed` | `true` \| `false` | Perfil reclamado por el profesional. |
| `kairosEnabled` | `true` \| `false` | Con agendamiento Kairos habilitado. |
| `updatedSince` | fecha ISO | Solo los modificados desde esa fecha, **inclusive** (`updatedAt >= valor`). |
| `lat`, `lng` | número | Activan el modo cercanía. Van juntos. `lat` en [-90, 90], `lng` en [-180, 180]. |
| `radiusKm` | número | Solo con `lat`/`lng`. Mayor que 0 y hasta 100. Por defecto 10. |
| `limit` | entero | De 1 a 200. Por defecto 50. |
| `cursor` | texto | El `nextCursor` de la respuesta anterior. Opaco: no lo construyas ni lo interpretes. |

Los filtros se combinan con **AND**.

### Modo sincronización (por defecto)

Orden estable por `(updatedAt, id)`, ascendente, con cursor. Está pensado para recorrer todo el directorio o solo lo que cambió (`updatedSince`).

### Modo cercanía (`lat` + `lng`)

Los más cercanos primero; cada fila trae `distanceKm` (km, 2 decimales). El cursor es un desplazamiento sobre el resultado ordenado. Un cursor de un modo **no sirve** en el otro (`invalid_cursor`).

### Respuesta

```json
{
  "data": [
    {
      "id": "3f9c1c52-1b0a-4e51-9a53-0d7a7a1d2f10",
      "slug": "dra-ana-perez",
      "name": "Dra. Ana Pérez",
      "specialty": { "slug": "cardiologia", "name": "Cardiología", "parentSlug": null },
      "address": "Calle 50, Ciudad de Panamá",
      "lat": 8.9824,
      "lng": -79.5199,
      "phone": "+507 000-0000",
      "insurances": [
        { "id": "a1b2c3d4-0000-4000-8000-000000000001", "name": "ASSA Compañía de Seguros" }
      ],
      "rating": 4.6,
      "reviewCount": 12,
      "isVerified": true,
      "isClaimed": false,
      "kairosEnabled": false,
      "updatedAt": "2026-10-21T19:05:11.000Z",
      "distanceKm": 1.37
    }
  ],
  "total": 11,
  "hasMore": false,
  "nextCursor": null
}
```

(Valores de ejemplo, no datos reales.)

- `distanceKm` aparece solo en modo cercanía.
- `internal` aparece solo con `directory:internal`:

  ```json
  "internal": { "kairosTenantId": null, "planType": "FREE", "planExpiresAt": null }
  ```

- `phone` es el teléfono del consultorio, ya público en el perfil. Puede ser `null`.
- `total` es la cantidad de filas que cumplen los filtros, **no** las que faltan por devolver.
- `nextCursor` es `null` cuando `hasMore` es `false`.

## `GET /professionals/{idOrSlug}`

Detalle de un profesional, por `id` (uuid) o por `slug`. Devuelve `{ "data": { … } }` con todos los campos de la lista más:

| Campo | Descripción |
|---|---|
| `bio` | Texto del perfil, o `null`. |
| `photos` | Arreglo de URLs. |
| `schedules` | Horarios activos: `{ dayOfWeek, startTime, endTime, slotDuration }`. `dayOfWeek`: 0 = domingo … 6 = sábado; horas `"HH:MM"`; `slotDuration` en minutos. Ordenados por día. |
| `reviewDistribution` | Cantidad de reseñas por estrellas: `{ "1": 0, "2": 1, "3": 0, "4": 3, "5": 8 }`. |

No incluye el texto de las reseñas ni datos de quienes las escribieron.

Un id o slug que no existe da `404 not_found`.

## `GET /specialties` y `GET /insurances`

Listas completas, sin paginar, ordenadas por nombre.

```json
{ "data": [ { "id": "…", "slug": "cardiologia", "name": "Cardiología", "icon": null, "parentSlug": null, "professionalCount": 68 } ] }
```

```json
{ "data": [ { "id": "…", "name": "ASSA Compañía de Seguros", "logo": null, "professionalCount": 11 } ] }
```

`professionalCount` cuenta solo los profesionales asignados directamente a esa especialidad o aseguradora.

## Recetas

### Sincronizar el directorio (carga inicial + incrementales)

```ts
// Pide una página y, si PlexusMap responde 429, espera `Retry-After` y reintenta la misma.
async function fetchPage(url: URL) {
  for (;;) {
    const res = await fetch(url, { headers: { 'x-api-key': process.env.PLEXUSMAP_API_KEY! } });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, Number(res.headers.get('retry-after') ?? 60) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`PlexusMap ${res.status}: ${await res.text()}`);
    return res.json();
  }
}

async function syncDirectory(since: string | null): Promise<string | null> {
  let cursor: string | null = null;
  let maxUpdatedAt = since;

  do {
    const url = new URL('https://plexusmap.com/api/v1/directory/professionals');
    url.searchParams.set('limit', '200');
    if (since) url.searchParams.set('updatedSince', since); // el MISMO valor en todas las páginas
    if (cursor) url.searchParams.set('cursor', cursor);

    const page = await fetchPage(url);
    for (const p of page.data) {
      await upsertLocal(p); // idempotente: por id
      if (!maxUpdatedAt || p.updatedAt > maxUpdatedAt) maxUpdatedAt = p.updatedAt;
    }
    cursor = page.hasMore ? page.nextCursor : null;
  } while (cursor);

  return maxUpdatedAt; // guárdalo: es el `since` de la próxima corrida
}
```

- Guarda el `maxUpdatedAt` **solo cuando termina todo el recorrido**. Como `updatedSince` es inclusivo, la próxima corrida repite las últimas filas: por eso el `upsert` debe ser idempotente.
- Carga inicial: `since = null`.
- **Reconciliación de borrados:** la API no avisa de profesionales eliminados (ver [Límites conocidos](#límites-conocidos)). De vez en cuando (p. ej. una vez por semana) haz un recorrido completo sin `updatedSince` y borra o desactiva localmente los ids que no aparezcan.

### "Quién acepta X cerca de mí" (bot de Augur)

```bash
curl -H "x-api-key: $PLEXUSMAP_API_KEY" \
  "https://plexusmap.com/api/v1/directory/professionals?specialty=odontologia-general&insurance=assa&lat=8.9824&lng=-79.5199&radiusKm=5&limit=5"
```

Devuelve, de más cerca a más lejos, hasta 5 profesionales de esa especialidad que atienden esa aseguradora en un radio de 5 km. Para obtener los slugs válidos de especialidad usa `GET /specialties`.

## Qué no expone

La API nunca devuelve `whatsappPhone`, email de contacto, enlaces iCal, datos de pacientes ni cuentas de usuario. Las respuestas se arman con una **lista explícita de campos** (`select`, nunca `include`): una columna nueva en la base no sale por la API hasta que se agregue a propósito en `src/lib/directory-api.ts`.

El permiso `directory:contacts` está reservado y los scripts se niegan a emitirlo. Los celulares de WhatsApp son datos personales, no datos públicos del directorio (`PLEXUSMAP_AUDIT.md`, hallazgos #18, #25 y #30), y hoy no existe una marca de "no contactar" ni separación de esos datos. Hasta tenerlas, ningún servicio debe poder leerlos por esta vía.

## Límites conocidos

- **Los borrados no se ven.** No hay borrado lógico (hallazgo #30); `updatedSince` no informa de profesionales eliminados. Usa la reconciliación de arriba.
- **Cambios de aseguradoras.** Agregar o quitar una aseguradora de un profesional que ya existe no actualiza su `updatedAt` (es una tabla de unión), así que `updatedSince` no lo detecta. Pasa hoy con los scripts `scripts/insert-*-new.ts`: los profesionales nuevos sí aparecen, pero a uno existente solo le crean la fila de aseguradora. Hasta que esos scripts actualicen `updatedAt`, la reconciliación completa lo corrige.
- **Cursor del modo cercanía.** Es un desplazamiento sobre el resultado del momento: si los datos cambian entre una página y otra, puede repetirse o saltarse alguna fila. Para recorridos completos usa el modo sincronización.
- **Búsqueda por radio.** No contempla el antimeridiano (±180° de longitud); no afecta a Panamá.
