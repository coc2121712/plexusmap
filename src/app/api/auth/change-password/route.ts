// PUT /api/auth/change-password — Change password for the logged-in user (issue #21)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { compare, hash } from 'bcryptjs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { changePasswordSchema, parseBody } from '@/lib/validations';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Per-user rate limit: 5 attempts / hour (defense against a hijacked session
  // brute-forcing the current password). IP/path limits in middleware don't cover PUT.
  const limit = rateLimit(`change-password:${session.user.id}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo en una hora.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  // TODO (issue #14 — logging estructurado): registrar los siguientes eventos
  // de auditoría de seguridad cuando se implemente el helper de logging:
  //   - cambio de contraseña exitoso (userId, timestamp).
  //   - rate limit hit 429 (userId, timestamp) — posible brute-force de sesión.
  //   - currentPassword incorrecto 400 (userId, timestamp) — intento fallido.

  try {
    const body = await request.json();
    const parsed = parseBody(changePasswordSchema, body);
    if (!parsed.success) return parsed.response;

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const valid = await compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(newPassword, 12);

    // Setting passwordChangedAt invalidates every OTHER active session: the NextAuth
    // session callback rejects tokens whose pwcAt claim predates this timestamp.
    // The current session survives because the client calls session update() after
    // success, refreshing its pwcAt claim. See issue #21.
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Error al cambiar la contraseña' },
      { status: 500 }
    );
  }
}
