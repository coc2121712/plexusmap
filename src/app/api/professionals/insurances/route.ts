// GET /api/professionals/insurances — List all insurance companies
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const insurances = await prisma.insurance.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      data: insurances,
    });
  } catch (error) {
    console.error('Error fetching insurances:', error);
    return NextResponse.json(
      { error: 'Error al obtener aseguradoras' },
      { status: 500 }
    );
  }
}
