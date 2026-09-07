/** DB row (snake_case) */
export interface CourseRow {
  id: string;
  title: string;
  body_part: string | null;
  goal: string | null;
  duration_min: number | null;
  level: string | null;
  trainer_name: string | null;
  video_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

/** API response (camelCase) */
export interface CourseDto {
  id: string;
  title: string;
  bodyPart: string | null;
  goal: string | null;
  durationMin: number | null;
  level: string | null;
  trainerName: string | null;
  videoUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ListCoursesQuery {
  bodyPart?: string;
  goal?: string;
  q?: string;
  page: number;
  limit: number;
}
