// GET /api/claim/verify?token=xxx — Validate claim token, return claim data
// The actual user creation happens in POST /api/claim/verify/complete
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      );
    }

    // Find pending claim with this token
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
        { error: 'Este perfil ya fue reclamado por otro profesional' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      data: {
        claimId: claim.id,
        email: claim.email,
        name: claim.name,
        professional: {
          id: claim.professional.id,
          slug: claim.professional.slug,
          name: claim.professional.name,
        },
      },
    });
  } catch (error) {
    console.error('Error validating claim token:', error);
    return NextResponse.json(
      { error: 'Error al verificar token' },
      { status: 500 }
    );
  }
}
