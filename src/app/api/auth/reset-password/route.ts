// GET /api/auth/reset-password?token=xxx — Validate reset token
// POST /api/auth/reset-password — Reset password with token
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { resetPasswordSchema, parseBody } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 404 }
      );
    }

    if (reset.usedAt) {
      return NextResponse.json(
        { error: 'Este enlace ya fue utilizado' },
        { status: 409 }
      );
    }

    if (reset.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Este enlace ha expirado. Solicita uno nuevo.' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      data: { email: reset.email, valid: true },
    });
  } catch (error) {
    console.error('Error validating reset token:', error);
    return NextResponse.json(
      { error: 'Error al verificar token' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseBody(resetPasswordSchema, body);
    if (!parsed.success) return parsed.response;

    const { token, password } = parsed.data;

    // Find valid token
    const reset = await prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 404 }
      );
    }

    if (reset.usedAt) {
      return NextResponse.json(
        { error: 'Este enlace ya fue utilizado' },
        { status: 409 }
      );
    }

    if (reset.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Este enlace ha expirado' },
        { status: 410 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: reset.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const hashedPassword = await hash(password, 12);

    // Transaction: update password + mark token as used
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

    return NextResponse.json({
      data: { success: true, message: 'Contraseña actualizada exitosamente' },
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Error al restablecer contraseña' },
      { status: 500 }
    );
  }
}
