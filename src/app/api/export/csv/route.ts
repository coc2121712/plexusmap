// GET /api/export/csv — Export professionals as CSV for WhatsApp campaigns
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function escapeCsvField(value: string): string {
  if (!value) return '';
  // If the field contains commas, quotes, or newlines, wrap in quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Only ADMIN can export all professionals
  const role = (session.user as { role: string }).role;
  if (role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Solo administradores pueden exportar datos' },
      { status: 403 }
    );
  }

  try {
    const professionals = await prisma.professional.findMany({
      include: {
        specialty: { select: { name: true } },
        insurances: {
          include: {
            insurance: { select: { name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'Nombre',
      'Telefono',
      'Email',
      'Especialidad',
      'Direccion',
      'Aseguradoras',
    ];

    const rows = professionals.map((p) => {
      const insuranceNames = p.insurances
        .map((pi) => pi.insurance.name)
        .join('; ');

      return [
        escapeCsvField(p.name),
        escapeCsvField(p.phone || ''),
        escapeCsvField(p.email || ''),
        escapeCsvField(p.specialty.name),
        escapeCsvField(p.address),
        escapeCsvField(insuranceNames),
      ].join(',');
    });

    // UTF-8 BOM for proper Spanish character handling in Excel
    const BOM = '\uFEFF';
    const csv = BOM + headers.join(',') + '\n' + rows.join('\n');

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="plexusmap-profesionales-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { error: 'Error al exportar datos' },
      { status: 500 }
    );
  }
}
