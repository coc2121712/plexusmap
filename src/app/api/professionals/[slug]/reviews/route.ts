// POST /api/professionals/:slug/reviews — Submit a public review
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicReviewSchema, parseBody } from '@/lib/validations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = parseBody(publicReviewSchema, body);
    if (!parsed.success) return parsed.response;

    const { patientName, rating, comment } = parsed.data;

    // Find professional
    const professional = await prisma.professional.findUnique({
      where: { slug },
      select: { id: true, rating: true, reviewCount: true },
    });

    if (!professional) {
      return NextResponse.json(
        { error: 'Profesional no encontrado' },
        { status: 404 }
      );
    }

    // Rate limiting: max 1 review per name per professional per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReview = await prisma.review.findFirst({
      where: {
        professionalId: professional.id,
        patientName,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (recentReview) {
      return NextResponse.json(
        { error: 'Ya dejaste una reseña recientemente. Intenta más tarde.' },
        { status: 429 }
      );
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        professionalId: professional.id,
        patientName,
        rating,
        comment: comment || null,
        source: 'PLEXUSMAP',
        isVerified: false,
      },
    });

    // Recalculate average rating
    const stats = await prisma.review.aggregate({
      where: { professionalId: professional.id },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.professional.update({
      where: { id: professional.id },
      data: {
        rating: Math.round((stats._avg.rating || 0) * 10) / 10,
        reviewCount: stats._count.id,
      },
    });

    return NextResponse.json({
      data: {
        id: review.id,
        message: 'Reseña publicada exitosamente',
      },
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Error al publicar la reseña' },
      { status: 500 }
    );
  }
}
