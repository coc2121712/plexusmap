// POST /api/claim — Submit a claim request for a professional profile
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { claimRequestSchema, parseBody } from '@/lib/validations';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseBody(claimRequestSchema, body);
    if (!parsed.success) return parsed.response;

    const { professionalId, name, email, phone, message } = parsed.data;

    // Check professional exists and is not already claimed
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, isClaimed: true, name: true },
    });

    if (!professional) {
      return NextResponse.json(
        { error: 'Profesional no encontrado' },
        { status: 404 }
      );
    }

    if (professional.isClaimed) {
      return NextResponse.json(
        { error: 'Este perfil ya ha sido reclamado' },
        { status: 409 }
      );
    }

    // Check for existing pending claim
    const existingClaim = await prisma.claimRequest.findFirst({
      where: { professionalId, status: 'PENDING' },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: 'Ya existe una solicitud pendiente para este perfil' },
        { status: 409 }
      );
    }

    // Generate verification token
    const token = randomBytes(32).toString('hex');

    const claim = await prisma.claimRequest.create({
      data: {
        professionalId,
        name,
        email,
        phone,
        message: message || null,
        token,
      },
    });

    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      data: {
        id: claim.id,
        status: 'PENDING',
        message: 'Solicitud enviada. Recibirás un correo de verificación.',
        ...(isDev ? { verifyUrl: `/api/claim/verify?token=${token}` } : {}),
      },
    });
  } catch (error) {
    console.error('Error creating claim:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
