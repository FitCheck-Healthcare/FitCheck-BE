import { getSupabase } from '../lib/supabase.js';
import { getCourseById } from './courses.service.js';
import type {
  CourseActivityDto,
  CourseViewDto,
  CourseViewRow,
  InterestProfile,
  InterestWeight,
  RecordCourseWatchInput,
} from '../types/courseView.js';
import type { CourseRow } from '../types/course.js';

const RECENT_VIEW_LIMIT = 30;

function toCourseViewDto(
  row: CourseViewRow,
  course?: CourseRow,
): CourseViewDto {
  return {
    id: row.id,
    courseId: row.course_id,
    watchedAt: row.watched_at,
    progressPct: Number(row.progress_pct),
    ...(course
      ? {
          course: {
            id: course.id,
            title: course.title,
            bodyPart: course.body_part,
            goal: course.goal,
            durationMin: course.duration_min,
            level: course.level,
            trainerName: course.trainer_name,
            videoUrl: course.video_url,
            description: course.description,
            isActive: course.is_active,
            createdAt: course.created_at,
          },
        }
      : {}),
  };
}

function buildWeights(values: Array<string | null | undefined>): InterestWeight[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      weight: Math.round((count / total) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildInterestProfile(courses: CourseRow[]): InterestProfile {
  const levels = courses
    .map((course) => course.level)
    .filter((level): level is string => Boolean(level));

  const levelWeights = buildWeights(levels);

  return {
    totalViews: courses.length,
    topBodyParts: buildWeights(courses.map((course) => course.body_part)),
    topGoals: buildWeights(courses.map((course) => course.goal)),
    primaryLevel: levelWeights[0]?.label ?? null,
  };
}

export async function recordCourseWatch(
  input: RecordCourseWatchInput,
): Promise<CourseViewDto> {
  const course = await getCourseById(input.courseId);
  if (!course) {
    throw new Error('NOT_FOUND');
  }

  const supabase = getSupabase();
  const progressPct =
    input.progressPct !== undefined
      ? Math.min(100, Math.max(0, input.progressPct))
      : 0;

  const { data, error } = await supabase
    .from('course_views')
    .upsert(
      {
        user_id: input.userId,
        course_id: input.courseId,
        watched_at: new Date().toISOString(),
        progress_pct: progressPct,
      },
      { onConflict: 'user_id,course_id' },
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return toCourseViewDto(data as CourseViewRow, {
    id: course.id,
    title: course.title,
    body_part: course.bodyPart,
    goal: course.goal,
    duration_min: course.durationMin,
    level: course.level,
    trainer_name: course.trainerName,
    video_url: course.videoUrl,
    description: course.description,
    is_active: course.isActive,
    created_at: course.createdAt,
  });
}

export async function getCourseActivity(userId: string): Promise<CourseActivityDto> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('course_views')
    .select('*, courses(*)')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(RECENT_VIEW_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<CourseViewRow & { courses: CourseRow | null }>;
  const watchHistory = rows.map((row) =>
    toCourseViewDto(row, row.courses ?? undefined),
  );
  const courses = rows
    .map((row) => row.courses)
    .filter((course): course is CourseRow => course !== null);

  return {
    watchHistory,
    interestProfile: buildInterestProfile(courses),
  };
}

export function emptyInterestProfile(): InterestProfile {
  return {
    totalViews: 0,
    topBodyParts: [],
    topGoals: [],
    primaryLevel: null,
  };
}
