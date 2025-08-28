export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'general_user' | 'stadium_owner';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  status: string;
  profile?: {
    dateOfBirth?: Date;
    gender?: string;
    profileImage?: string;
    bio?: string;
    preferredLanguage: string;
    timezone: string;
    notificationPreferences: NotificationPreferences;
  };
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  bookingReminders: boolean;
  promotions: boolean;
}