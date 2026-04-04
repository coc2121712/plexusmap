// PUT /api/dashboard/reviews/:id/reply — Reply to a review
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { reviewReplySchema, parseBody } from '@/lib/validations';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.professionalId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = parseBody(reviewReplySchema, body);
  if (!parsed.success) return parsed.response;

  const { reply } = parsed.data;

  try {
    // Verify the review belongs to this professional
    const review = await prisma.review.findFirst({
      where: {
        id,
        professionalId: session.user.professionalId,
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 });
    }

    await prisma.review.update({
      where: { id },
      data: { reply },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error replying to review:', error);
    return NextResponse.json({ error: 'Error al responder' }, { status: 500 });
  }
}
