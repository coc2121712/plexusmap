import { z } from 'zod';

// ═══════════════════════════════════════════
// Claim
// ═══════════════════════════════════════════

export const claimRequestSchema = z.object({
  professionalId: z.string().uuid('ID de profesional inválido'),
  name: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo').trim(),
  email: z.string().email('Email inválido').transform((e) => e.toLowerCase().trim()),
  phone: z.string().min(7, 'Teléfono inválido').max(20, 'Teléfono inválido').trim(),
  message: z.string().max(500, 'Mensaje muy largo').trim().optional(),
});

export const claimCompleteSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// ═══════════════════════════════════════════
// Dashboard — Profile
// ═══════════════════════════════════════════

export const profileUpdateSchema = z.object({
  phone: z.string().max(20).trim().optional().nullable(),
  email: z.string().email('Email inválido').trim().optional().nullable().or(z.literal('')),
  bio: z.string().max(500, 'Biografía muy larga').trim().optional().nullable(),
  address: z.string().min(1, 'Dirección requerida').max(200).trim().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  cliniwebIcalUrl: z.string().url('URL inválida').trim().optional().nullable().or(z.literal('')),
  insuranceIds: z.array(z.string().uuid()).optional(),
});

// ═══════════════════════════════════════════
// Dashboard — Schedule
// ═══════════════════════════════════════════

const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  slotDuration: z.number().int().min(5).max(120).default(30),
  isActive: z.boolean(),
});

export const scheduleUpdateSchema = z.object({
  schedules: z.array(scheduleItemSchema).min(1).max(7),
});

// ═══════════════════════════════════════════
// Dashboard — Review Reply
// ═══════════════════════════════════════════

export const reviewReplySchema = z.object({
  reply: z.string().min(1, 'Respuesta requerida').max(500, 'Respuesta muy larga').trim(),
});

// ═══════════════════════════════════════════
// Public Review
// ═══════════════════════════════════════════

export const publicReviewSchema = z.object({
  patientName: z.string().min(2, 'Nombre muy corto').max(50, 'Nombre muy largo').trim(),
  rating: z.number().int().min(1, 'Calificación mínima es 1').max(5, 'Calificación máxima es 5'),
  comment: z.string().max(500, 'Comentario muy largo').trim().optional(),
});

// ═══════════════════════════════════════════
// Appointments
// ═══════════════════════════════════════════

export const createAppointmentSchema = z.object({
  professionalId: z.string().uuid('ID de profesional inválido'),
  slot: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM requerido'),
  patientName: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo').trim(),
  patientPhone: z.string().min(7, 'Teléfono inválido').max(20, 'Teléfono inválido').trim(),
});

// ═══════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').transform((e) => e.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// ═══════════════════════════════════════════
// Helper: parse body with Zod, return error response if invalid
// ═══════════════════════════════════════════

import { NextResponse } from 'next/server';

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown):
  | { success: true; data: T }
  | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues?.[0];
    return {
      success: false,
      response: NextResponse.json(
        { error: firstIssue?.message || result.error.message || 'Datos inválidos' },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}
