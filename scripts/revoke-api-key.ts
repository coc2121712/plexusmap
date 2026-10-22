/**
 * PlexusMap — Revoke an API key of the directory API (/api/v1/directory)
 *
 * Marks the key inactive and stamps revokedAt. The row is kept for audit
 * (lastUsedAt, who had it). Idempotent: revoking an already-revoked key is a no-op.
 *
 * Usage (exactly one of --id / --prefix):
 *   npx tsx scripts/revoke-api-key.ts --id <uuid>
 *   npx tsx scripts/revoke-api-key.ts --prefix <plx_xxxxxxxx>
 *
 * To list keys (id, name, prefix, last use): `npx prisma studio` → ApiKey.
 * The prefix is the first 12 chars shown when the key was created.
 *
 * Connects via process.env.DATABASE_URL — the target (host:port/db, no
 * credentials) is printed first.
 */

import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';

const prisma = new PrismaClient();

const USAGE =
  'Uso: npx tsx scripts/revoke-api-key.ts --id <uuid> | --prefix <plx_xxxxxxxx>';

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
  let values: { id?: string; prefix?: string };
  try {
    values = parseArgs({
      options: {
        id: { type: 'string' },
        prefix: { type: 'string' },
      },
      strict: true,
    }).values;
  } catch (e) {
    die(`${e instanceof Error ? e.message : String(e)}\n${USAGE}`);
  }

  const id = values.id?.trim();
  const prefix = values.prefix?.trim();
  if ((id ? 1 : 0) + (prefix ? 1 : 0) !== 1) die(`indica exactamente uno: --id o --prefix.\n${USAGE}`);

  console.error(`→ Conectando a: ${describeTarget()}`);

  const matches = await prisma.apiKey.findMany({
    where: id ? { id } : { prefix },
    select: { id: true, name: true, prefix: true, active: true, revokedAt: true },
  });

  if (matches.length === 0) die('no existe ninguna API key con ese criterio. Nada cambiado.');
  if (matches.length > 1) {
    die(
      `el prefijo coincide con ${matches.length} llaves; usa --id. Candidatas:\n` +
        matches.map((k) => `  ${k.id}  ${k.name}`).join('\n')
    );
  }

  const key = matches[0];
  if (!key.active && key.revokedAt) {
    console.log(`OK, la API key "${key.name}" (${key.prefix}) ya estaba revocada desde ${key.revokedAt.toISOString()}. Nada cambiado.`);
    return;
  }

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { active: false, revokedAt: new Date() },
  });

  console.log(`OK, API key revocada: "${key.name}" (${key.prefix}, id ${key.id}).`);
}

main()
  .catch((e) => {
    console.error('ERROR al revocar la API key:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
