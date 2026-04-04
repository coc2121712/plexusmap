// POST /api/claim/verify/complete — Create user account with chosen password
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { claimCompleteSchema, parseBody } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseBody(claimCompleteSchema, body);
    if (!parsed.success) return parsed.response;

    const { token, password } = parsed.data;

    // Find pending claim
    const claim = await prisma.claimRequest.findUnique({
      where: { token },
      include: {
        professional: {
          select: { id: true, slug: true, name: true, isClaimed: true },
        },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 404 }
      );
    }

    if (claim.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Esta solicitud ya fue procesada' },
        { status: 409 }
      );
    }

    if (claim.professional.isClaimed) {
      await prisma.claimRequest.update({
        where: { id: claim.id },
        data: { status: 'REJECTED', reviewedAt: new Date() },
      });
      return NextResponse.json(
        { error: 'Este perfil ya fue reclamado' },
        { status: 409 }
      );
    }

    // Check email not already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: claim.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con este email' },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

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

    return NextResponse.json({
      data: {
        success: true,
        email: claim.email,
        slug: claim.professional.slug,
      },
    });
  } catch (error) {
    console.error('Error completing claim:', error);
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    );
  }
}
