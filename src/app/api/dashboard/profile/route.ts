// PUT /api/dashboard/profile — Update professional profile
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';
import { profileUpdateSchema, parseBody } from '@/lib/validations';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.professionalId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = parseBody(profileUpdateSchema, body);
    if (!parsed.success) return parsed.response;

    const { phone, email, bio, address, lat, lng, cliniwebIcalUrl, insuranceIds } = parsed.data;

    await prisma.professional.update({
      where: { id: session.user.professionalId },
      data: {
        phone: phone || null,
        email: email || null,
        bio: bio || null,
        address: address || undefined,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        cliniwebIcalUrl: cliniwebIcalUrl || null,
      },
    });

    // Update insurances if provided
    if (Array.isArray(insuranceIds)) {
      await prisma.professionalInsurance.deleteMany({
        where: { professionalId: session.user.professionalId },
      });
      if (insuranceIds.length > 0) {
        await prisma.professionalInsurance.createMany({
          data: insuranceIds.map((insuranceId) => ({
            professionalId: session.user.professionalId!,
            insuranceId,
          })),
        });
      }
    }

    // Invalidate professionals cache so public listings update
    revalidateTag('professionals', { expire: 0 });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
