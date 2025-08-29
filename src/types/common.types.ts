import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: ValidationError[];
  pagination?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    email: string;
  };
}

export type UserRole = 'superadmin' | 'stadium_owner' | 'general_user';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Coordinates {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  specialRate?: number;
}
