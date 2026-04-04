// GET /api/professionals/specialties — List all specialties
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const specialties = await prisma.specialty.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true, icon: true },
    });

    return NextResponse.json({ data: specialties });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    return NextResponse.json(
      { error: 'Error al obtener especialidades' },
      { status: 500 }
    );
  }
}
