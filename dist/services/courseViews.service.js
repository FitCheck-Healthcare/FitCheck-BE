"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordCourseWatch = recordCourseWatch;
exports.getCourseActivity = getCourseActivity;
exports.emptyInterestProfile = emptyInterestProfile;
const supabase_js_1 = require("../lib/supabase.js");
const courses_service_js_1 = require("./courses.service.js");
const RECENT_VIEW_LIMIT = 30;
function toCourseViewDto(row, course) {
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
function buildWeights(values) {
    const counts = new Map();
    for (const value of values) {
        const label = value?.trim();
        if (!label)
            continue;
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    if (total === 0)
        return [];
    return [...counts.entries()]
        .map(([label, count]) => ({
        label,
        count,
        weight: Math.round((count / total) * 100) / 100,
    }))
        .sort((a, b) => b.count - a.count);
}
function buildInterestProfile(courses) {
    const levels = courses
        .map((course) => course.level)
        .filter((level) => Boolean(level));
    const levelWeights = buildWeights(levels);
    return {
        totalViews: courses.length,
        topBodyParts: buildWeights(courses.map((course) => course.body_part)),
        topGoals: buildWeights(courses.map((course) => course.goal)),
        primaryLevel: levelWeights[0]?.label ?? null,
    };
}
async function recordCourseWatch(input) {
    const course = await (0, courses_service_js_1.getCourseById)(input.courseId);
    if (!course) {
        throw new Error('NOT_FOUND');
    }
    const supabase = (0, supabase_js_1.getSupabase)();
    const progressPct = input.progressPct !== undefined
        ? Math.min(100, Math.max(0, input.progressPct))
        : 0;
    const { data, error } = await supabase
        .from('course_views')
        .upsert({
        user_id: input.userId,
        course_id: input.courseId,
        watched_at: new Date().toISOString(),
        progress_pct: progressPct,
    }, { onConflict: 'user_id,course_id' })
        .select('*')
        .single();
    if (error) {
        throw new Error(error.message);
    }
    return toCourseViewDto(data, {
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
async function getCourseActivity(userId) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data, error } = await supabase
        .from('course_views')
        .select('*, courses(*)')
        .eq('user_id', userId)
        .order('watched_at', { ascending: false })
        .limit(RECENT_VIEW_LIMIT);
    if (error) {
        throw new Error(error.message);
    }
    const rows = (data ?? []);
    const watchHistory = rows.map((row) => toCourseViewDto(row, row.courses ?? undefined));
    const courses = rows
        .map((row) => row.courses)
        .filter((course) => course !== null);
    return {
        watchHistory,
        interestProfile: buildInterestProfile(courses),
    };
}
function emptyInterestProfile() {
    return {
        totalViews: 0,
        topBodyParts: [],
        topGoals: [],
        primaryLevel: null,
    };
}
