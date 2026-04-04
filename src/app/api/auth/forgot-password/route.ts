// POST /api/auth/forgot-password — Generate password reset token
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema, parseBody } from '@/lib/validations';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseBody(forgotPasswordSchema, body);
    if (!parsed.success) return parsed.response;

    const normalizedEmail = parsed.data.email;

    // Always return success to prevent email enumeration
    const successResponse = {
      data: {
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
      },
    };

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return same response to prevent enumeration
      return NextResponse.json(successResponse);
    }

    // Invalidate any existing unused tokens for this email
    await prisma.passwordReset.updateMany({
      where: {
        email: normalizedEmail,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() }, // expire them immediately
    });

    // Generate token (1 hour expiry)
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    // In production, send email here
    // For now, include the link in dev mode
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
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
