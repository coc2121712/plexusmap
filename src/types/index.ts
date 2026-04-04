// ═══════════════════════════════════════════
// PlexusMap — Shared Types
// ═══════════════════════════════════════════

export interface SpecialtySummary {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
}

export interface ProfessionalSummary {
  id: string;
  slug: string;
  name: string;
  specialty: SpecialtySummary;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  photos: string[];
  insurances: string[];
  distance?: number; // km, calculated client-side
  nextAvailableSlot?: string; // ISO datetime
}

export interface ProfessionalDetail extends ProfessionalSummary {
  email: string | null;
  bio: string | null;
  isClaimed: boolean;
  kairosEnabled: boolean;
  reviews: ReviewSummary[];
  schedules: ScheduleSlot[];
}

export interface ReviewSummary {
  id: string;
  patientName: string | null;
  rating: number;
  comment: string | null;
  reply: string | null;
  source: 'PLEXUSMAP' | 'WHATSAPP';
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export interface TimeSlot {
  time: string; // "09:00"
  available: boolean;
}

export interface BookingRequest {
  professionalId: string;
  dateTime: string;
  patientName: string;
  patientPhone: string;
  source: 'PLEXUSMAP' | 'WHATSAPP' | 'PHONE';
}

export interface SearchFilters {
  query?: string;
  specialty?: string; // specialty slug
  insurance?: string;
  lat?: number;
  lng?: number;
  radius?: number; // km
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
