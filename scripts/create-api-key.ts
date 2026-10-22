/**
 * PlexusMap — Create an API key for the directory API (/api/v1/directory)
 *
 * The raw key is printed ONCE (stdout, alone on its line) and never stored:
 * only its SHA-256 hash and a 12-char prefix go to the database.
 * Everything human-readable goes to stderr, so this works in a pipeline:
 *
 *   KEY=$(npx tsx scripts/create-api-key.ts --name augur-prod)
 *
 * Usage:
 *   npx tsx scripts/create-api-key.ts --name <nombre> [--scopes a,b] [--expires-in-days N]
 *
 * Options:
 *   --name              Required. Who uses it, e.g. "augur-prod", "kairos-prod".
 *   --scopes            Comma-separated. Default: directory:read
 *                       Issuable: directory:read, directory:internal
 *                       (internal also grants read). directory:contacts is
 *                       reserved and cannot be issued (audit #18, #25, #30).
 *   --expires-in-days   Optional. Key never expires if omitted.
 *
 * Connects via process.env.DATABASE_URL — the target (host:port/db, no
 * credentials) is printed first so you can confirm you are not hitting prod
 * by accident.
 */

import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import {
  SCOPES,
  extractPrefix,
  generateApiKey,
  hashApiKey,
  isIssuableScope,
  isReservedScope,
} from '../src/lib/api-key';

const prisma = new PrismaClient();

const USAGE =
  'Uso: npx tsx scripts/create-api-key.ts --name <nombre> [--scopes directory:read,directory:internal] [--expires-in-days N]';

function describeTarget(): string {
  const raw = process.env.DATABASE_URL || '';
  try {
    const u = new URL(raw);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '(DATABASE_URL no seteada o no parseable)';
  }
}

function die(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function main() {
  let values: { name?: string; scopes?: string; 'expires-in-days'?: string };
  try {
    values = parseArgs({
      options: {
        name: { type: 'string' },
        scopes: { type: 'string' },
        'expires-in-days': { type: 'string' },
      },
      strict: true,
    }).values;
  } catch (e) {
    die(`${e instanceof Error ? e.message : String(e)}\n${USAGE}`);
  }

  const name = values.name?.trim();
  if (!name) die(`falta --name.\n${USAGE}`);
  if (name.length > 100) die('--name no puede exceder 100 caracteres.');

  // Scopes: validate, dedupe, and make `internal` imply `read`.
  const requested = (values.scopes ?? SCOPES.DIRECTORY_READ)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (requested.length === 0) die(`--scopes vacío.\n${USAGE}`);

  const scopes = new Set<string>();
  for (const scope of requested) {
    if (isReservedScope(scope)) {
      die(`el permiso ${scope} está reservado y no se puede emitir (datos de contacto personales; ver auditoría #18, #25, #30).`);
    }
    if (!isIssuableScope(scope)) {
      die(`permiso desconocido: ${scope}. Válidos: ${Object.values(SCOPES).join(', ')}`);
    }
    scopes.add(scope);
  }
  if (scopes.has(SCOPES.DIRECTORY_INTERNAL)) scopes.add(SCOPES.DIRECTORY_READ);

  let expiresAt: Date | null = null;
  if (values['expires-in-days'] !== undefined) {
    const days = Number(values['expires-in-days']);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      die('--expires-in-days debe ser un entero entre 1 y 3650.');
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  console.error(`→ Conectando a: ${describeTarget()}`);

  const rawKey = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      name,
      prefix: extractPrefix(rawKey),
      keyHash: hashApiKey(rawKey),
      scopes: [...scopes],
      expiresAt,
    },
    select: { id: true, name: true, prefix: true, scopes: true, expiresAt: true },
  });

  console.error('');
  console.error('API key creada. Guárdala ahora: no se puede volver a ver.');
  console.error(`  id:       ${created.id}`);
  console.error(`  nombre:   ${created.name}`);
  console.error(`  prefijo:  ${created.prefix}`);
  console.error(`  permisos: ${created.scopes.join(', ')}`);
  console.error(`  vence:    ${created.expiresAt ? created.expiresAt.toISOString() : 'nunca'}`);
  console.error('');

  // The only thing on stdout.
  console.log(rawKey);
}

main()
  .catch((e) => {
    // Never print the key or anything derived from it on failure.
    console.error('ERROR al crear la API key:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
