import { getSupabase } from '../lib/supabase.js';
import type { CourseDto, CourseRow, ListCoursesQuery } from '../types/course.js';

function toCourseDto(row: CourseRow): CourseDto {
  return {
    id: row.id,
    title: row.title,
    bodyPart: row.body_part,
    goal: row.goal,
    durationMin: row.duration_min,
    level: row.level,
    trainerName: row.trainer_name,
    videoUrl: row.video_url,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listCourses(query: ListCoursesQuery): Promise<{
  data: CourseDto[];
  total: number;
  page: number;
  limit: number;
}> {
  const supabase = getSupabase();
  const { bodyPart, goal, q, page, limit } = query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let builder = supabase
    .from('courses')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (bodyPart) {
    builder = builder.eq('body_part', bodyPart);
  }
  if (goal) {
    builder = builder.eq('goal', goal);
  }
  if (q) {
    builder = builder.ilike('title', `%${q}%`);
  }

  const { data, error, count } = await builder.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    data: ((data ?? []) as CourseRow[]).map(toCourseDto),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getCourseById(id: string): Promise<CourseDto | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;
  return toCourseDto(data as CourseRow);
}
