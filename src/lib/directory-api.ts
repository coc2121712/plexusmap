// ═══════════════════════════════════════════
// Shared logic for the read-only directory API (/api/v1/directory)
//
// - Query parsing (strict: an unknown param is a 400, so a typo such as
//   `updatedsince` can never silently turn an incremental sync into a full dump).
// - Two listing modes: keyset on (updatedAt, id) for sync, and distance for
//   "near me" lookups.
// - Serializers built on an explicit field allowlist (`select`, never `include`):
//   a column added to the model later is NOT exposed until added here.
//
// NEVER exposed: whatsappPhone, email, cliniwebIcalUrl, patient data, users.
// ═══════════════════════════════════════════

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=60' };

export function apiError(
  error: string,
  code: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    details === undefined ? { error, code } : { error, code, details },
    { status }
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID_RE.test(value);

// ─── Query params ───

const boolParam = z.enum(['true', 'false']).transform((v) => v === 'true');

const isoDateParam = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha ISO inválida')
  .transform((v) => new Date(v));

const listQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    specialty: z.string().trim().min(1).max(100).optional(), // slug (a parent slug also matches its children)
    insurance: z.string().trim().min(1).max(100).optional(), // insurance id (uuid) or name (contains)
    claimed: boolParam.optional(),
    kairosEnabled: boolParam.optional(),
    updatedSince: isoDateParam.optional(), // inclusive: updatedAt >= value
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().positive().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z.string().max(300).optional(),
  })
  .strict();

export type ListQuery = z.infer<typeof listQuerySchema>;

export const DEFAULT_RADIUS_KM = 10;

export function parseListQuery(
  searchParams: URLSearchParams
): { ok: true; data: ListQuery } | { ok: false; response: NextResponse } {
  // An empty value (`?lat=`) means "not provided", not 0.
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams) {
    if (value !== '') raw[key] = value;
  }

  const result = listQuerySchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: apiError(
        'Parámetros inválidos.',
        'invalid_params',
        400,
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      ),
    };
  }

  const q = result.data;
  const hasLat = q.lat !== undefined;
  const hasLng = q.lng !== undefined;
  if (hasLat !== hasLng) {
    return { ok: false, response: apiError('lat y lng van juntos.', 'invalid_params', 400) };
  }
  if (q.radiusKm !== undefined && !hasLat) {
    return { ok: false, response: apiError('radiusKm requiere lat y lng.', 'invalid_params', 400) };
  }
  return { ok: true, data: q };
}

// ─── Cursor (opaque to clients) ───
// 'k' = keyset on (updatedAt, id) for sync mode · 'o' = offset for distance mode

export type Cursor = { m: 'k'; u: string; i: string } | { m: 'o'; n: number };

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(value: string): Cursor | null {
  try {
    const c = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (c.m === 'k' && typeof c.u === 'string' && typeof c.i === 'string') {
      if (Number.isNaN(Date.parse(c.u)) || !isUuid(c.i)) return null;
      return { m: 'k', u: c.u, i: c.i };
    }
    if (c.m === 'o' && typeof c.n === 'number' && Number.isInteger(c.n) && c.n >= 0 && c.n <= 100_000) {
      return { m: 'o', n: c.n };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Field allowlist ───

const LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  address: true,
  lat: true,
  lng: true,
  phone: true, // business phone, already public on the profile page
  rating: true,
  reviewCount: true,
  isVerified: true,
  isClaimed: true,
  kairosEnabled: true,
  updatedAt: true,
  specialty: { select: { slug: true, name: true, parent: { select: { slug: true } } } },
  insurances: {
    select: { insurance: { select: { id: true, name: true } } },
    orderBy: { insurance: { name: 'asc' } },
  },
  // Internal: serialized only for keys with `directory:internal`.
  kairosTenantId: true,
  planType: true,
  planExpiresAt: true,
} satisfies Prisma.ProfessionalSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  bio: true,
  photos: true,
  schedules: {
    where: { isActive: true },
    select: { dayOfWeek: true, startTime: true, endTime: true, slotDuration: true },
    orderBy: { dayOfWeek: 'asc' },
  },
} satisfies Prisma.ProfessionalSelect;

type ListRow = Prisma.ProfessionalGetPayload<{ select: typeof LIST_SELECT }>;
type DetailRow = Prisma.ProfessionalGetPayload<{ select: typeof DETAIL_SELECT }>;

export function serializeProfessional(row: ListRow, opts: { internal: boolean; distanceKm?: number }) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    specialty: {
      slug: row.specialty.slug,
      name: row.specialty.name,
      parentSlug: row.specialty.parent?.slug ?? null,
    },
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    phone: row.phone,
    insurances: row.insurances.map((pi) => ({ id: pi.insurance.id, name: pi.insurance.name })),
    rating: row.rating,
    reviewCount: row.reviewCount,
    isVerified: row.isVerified,
    isClaimed: row.isClaimed,
    kairosEnabled: row.kairosEnabled,
    updatedAt: row.updatedAt.toISOString(),
    ...(opts.distanceKm !== undefined ? { distanceKm: opts.distanceKm } : {}),
    ...(opts.internal
      ? {
          internal: {
            kairosTenantId: row.kairosTenantId,
            planType: row.planType,
            planExpiresAt: row.planExpiresAt?.toISOString() ?? null,
          },
        }
      : {}),
  };
}

export async function getProfessionalDetail(idOrSlug: string, internal: boolean) {
  const row: DetailRow | null = await prisma.professional.findUnique({
    where: isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    select: DETAIL_SELECT,
  });
  if (!row) return null;

  const groups = await prisma.review.groupBy({
    by: ['rating'],
    where: { professionalId: row.id },
    _count: { _all: true },
  });
  const reviewDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const g of groups) reviewDistribution[String(g.rating)] = g._count._all;

  return {
    ...serializeProfessional(row, { internal }),
    bio: row.bio,
    photos: row.photos,
    schedules: row.schedules,
    reviewDistribution,
  };
}

// ─── Filters ───

function buildWhere(q: ListQuery): Prisma.ProfessionalWhereInput {
  const and: Prisma.ProfessionalWhereInput[] = [];

  if (q.q) {
    // Same semantics as the public search: every token must hit the name,
    // or the whole text must hit the specialty name / address.
    const tokens = q.q.split(/\s+/).filter(Boolean);
    const nameMatch: Prisma.ProfessionalWhereInput =
      tokens.length > 1
        ? { AND: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' as const } })) }
        : { name: { contains: q.q, mode: 'insensitive' } };
    and.push({
      OR: [
        nameMatch,
        { specialty: { name: { contains: q.q, mode: 'insensitive' } } },
        { address: { contains: q.q, mode: 'insensitive' } },
      ],
    });
  }

  if (q.specialty) {
    and.push({ specialty: { OR: [{ slug: q.specialty }, { parent: { slug: q.specialty } }] } });
  }

  if (q.insurance) {
    and.push({
      insurances: {
        some: isUuid(q.insurance)
          ? { insuranceId: q.insurance }
          : { insurance: { name: { contains: q.insurance, mode: 'insensitive' } } },
      },
    });
  }

  if (q.claimed !== undefined) and.push({ isClaimed: q.claimed });
  if (q.kairosEnabled !== undefined) and.push({ kairosEnabled: q.kairosEnabled });
  if (q.updatedSince) and.push({ updatedAt: { gte: q.updatedSince } });

  return and.length > 0 ? { AND: and } : {};
}

// ─── Geo ───

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LAT = 111.32;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Cheap pre-filter on the (lat, lng) index; the exact distance is applied afterwards. */
function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const cos = Math.cos(toRad(lat));
  const lngDelta = cos > 0.01 ? radiusKm / (KM_PER_DEGREE_LAT * cos) : 180;
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

// ─── Listing ───

export type ListResult =
  | {
      ok: true;
      data: ReturnType<typeof serializeProfessional>[];
      total: number;
      hasMore: boolean;
      nextCursor: string | null;
    }
  | { ok: false; response: NextResponse };

const invalidCursor = () => ({
  ok: false as const,
  response: apiError('Cursor inválido para esta consulta.', 'invalid_cursor', 400),
});

export async function listProfessionals(q: ListQuery, internal: boolean): Promise<ListResult> {
  const where = buildWhere(q);
  const cursor = q.cursor ? decodeCursor(q.cursor) : null;
  if (q.cursor && !cursor) return invalidCursor();

  // ── Distance mode: nearest first; the cursor is an offset into the sorted result. ──
  if (q.lat !== undefined && q.lng !== undefined) {
    if (cursor && cursor.m !== 'o') return invalidCursor();
    const { lat, lng } = q;
    const radius = q.radiusKm ?? DEFAULT_RADIUS_KM;
    const box = boundingBox(lat, lng, radius);

    const rows = await prisma.professional.findMany({
      where: {
        AND: [
          where,
          { lat: { gte: box.minLat, lte: box.maxLat }, lng: { gte: box.minLng, lte: box.maxLng } },
        ],
      },
      select: LIST_SELECT,
    });

    const nearby = rows
      .map((row) => ({ row, distanceKm: haversineKm(lat, lng, row.lat, row.lng) }))
      .filter((x) => x.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm || (a.row.id < b.row.id ? -1 : 1));

    const offset = cursor?.m === 'o' ? cursor.n : 0;
    const page = nearby.slice(offset, offset + q.limit);
    const hasMore = offset + q.limit < nearby.length;
    return {
      ok: true,
      data: page.map((x) =>
        serializeProfessional(x.row, { internal, distanceKm: Math.round(x.distanceKm * 100) / 100 })
      ),
      total: nearby.length,
      hasMore,
      nextCursor: hasMore ? encodeCursor({ m: 'o', n: offset + q.limit }) : null,
    };
  }

  // ── Sync mode: stable order by (updatedAt, id), keyset pagination. ──
  if (cursor && cursor.m !== 'k') return invalidCursor();
  const after: Prisma.ProfessionalWhereInput | null = cursor
    ? {
        OR: [
          { updatedAt: { gt: new Date(cursor.u) } },
          { updatedAt: new Date(cursor.u), id: { gt: cursor.i } },
        ],
      }
    : null;

  const [rows, total] = await Promise.all([
    prisma.professional.findMany({
      where: after ? { AND: [where, after] } : where,
      select: LIST_SELECT,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: q.limit + 1,
    }),
    prisma.professional.count({ where }),
  ]);

  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  const last = page[page.length - 1];
  return {
    ok: true,
    data: page.map((row) => serializeProfessional(row, { internal })),
    total,
    hasMore,
    nextCursor:
      hasMore && last ? encodeCursor({ m: 'k', u: last.updatedAt.toISOString(), i: last.id }) : null,
  };
}
