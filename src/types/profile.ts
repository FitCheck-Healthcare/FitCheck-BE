/** DB row (snake_case) */
export interface ProfileRow {
  id: string;
  role: ProfileRole;
  name: string | null;
  phone: string | null;
  created_at: string;
}

export type ProfileRole = 'user' | 'trainer' | 'gym_owner';

/** API response (camelCase) */
export interface ProfileDto {
  id: string;
  role: ProfileRole;
  name: string | null;
  phone: string | null;
  createdAt: string;
}

export interface UpdateProfileInput {
  name?: string | null;
  phone?: string | null;
}
