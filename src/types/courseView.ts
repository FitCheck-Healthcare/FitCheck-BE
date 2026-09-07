import type { CourseDto } from './course.js';

/** DB row (snake_case) */
export interface CourseViewRow {
  id: string;
  user_id: string;
  course_id: string;
  watched_at: string;
  progress_pct: number;
  created_at: string;
}

export interface CourseViewDto {
  id: string;
  courseId: string;
  watchedAt: string;
  progressPct: number;
  course?: CourseDto;
}

export interface InterestWeight {
  label: string;
  count: number;
  weight: number;
}

export interface InterestProfile {
  totalViews: number;
  topBodyParts: InterestWeight[];
  topGoals: InterestWeight[];
  primaryLevel: string | null;
}

export interface CourseActivityDto {
  watchHistory: CourseViewDto[];
  interestProfile: InterestProfile;
}

export interface RecordCourseWatchInput {
  userId: string;
  courseId: string;
  progressPct?: number;
}
