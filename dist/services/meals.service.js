"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldQueueMealAiAnalysis = shouldQueueMealAiAnalysis;
exports.queueMealAiAnalysis = queueMealAiAnalysis;
exports.ensureProfile = ensureProfile;
exports.listMealLogs = listMealLogs;
exports.createMealLog = createMealLog;
exports.updateMealLogForUser = updateMealLogForUser;
exports.isMealType = isMealType;
const supabase_js_1 = require("../lib/supabase.js");
const mealAi_service_js_1 = require("./mealAi.service.js");
const mealLog_js_1 = require("../types/mealLog.js");
const DEFAULT_MACROS = { carb: 0, protein: 0, fat: 0, kcal: 0 };
function normalizeMacros(value) {
    if (!value || typeof value !== 'object')
        return { ...DEFAULT_MACROS };
    const raw = value;
    return {
        carb: Number(raw.carb) || 0,
        protein: Number(raw.protein) || 0,
        fat: Number(raw.fat) || 0,
        kcal: Number(raw.kcal) || 0,
    };
}
function mergeMacros(existing, patch) {
    const base = normalizeMacros(existing);
    if (!patch)
        return base;
    return {
        carb: patch.carb !== undefined ? patch.carb : base.carb,
        protein: patch.protein !== undefined ? patch.protein : base.protein,
        fat: patch.fat !== undefined ? patch.fat : base.fat,
        kcal: patch.kcal !== undefined ? patch.kcal : base.kcal,
    };
}
function shouldQueueMealAiAnalysis(input) {
    if (!(0, mealAi_service_js_1.isGeminiConfigured)())
        return false;
    const clientMacros = (0, mealAi_service_js_1.hasExplicitMacros)(input.macros);
    const needsFeedback = !input.aiFeedback?.trim();
    const hasImage = Boolean(input.imageUrl?.trim());
    const memo = input.memo?.trim() ?? '';
    if (!needsFeedback && clientMacros)
        return false;
    if (!hasImage && !needsFeedback)
        return false;
    if (!hasImage && !memo)
        return false;
    return needsFeedback || (hasImage && !clientMacros);
}
function isMealAiAnalysisPending(row) {
    if (!(0, mealAi_service_js_1.isGeminiConfigured)())
        return false;
    if (row.ai_feedback?.trim())
        return false;
    return shouldQueueMealAiAnalysis({
        mealType: row.meal_type,
        memo: row.memo,
        imageUrl: row.image_url,
        macros: normalizeMacros(row.macros),
        aiFeedback: row.ai_feedback,
    });
}
function toMealLogDto(row) {
    return {
        id: row.id,
        userId: row.user_id,
        date: row.date,
        mealType: row.meal_type,
        time: row.time,
        memo: row.memo,
        imageUrl: row.image_url,
        macros: normalizeMacros(row.macros),
        aiFeedback: row.ai_feedback,
        createdAt: row.created_at,
        aiAnalysisPending: isMealAiAnalysisPending(row),
    };
}
async function runMealAiAnalysis(userId, mealId, job) {
    try {
        const analysis = await (0, mealAi_service_js_1.analyzeMealWithGemini)({
            mealType: job.mealType,
            memo: job.memo,
            imageUrl: job.imageUrl,
            estimateMacros: job.estimateMacros,
        });
        if (!analysis) {
            await updateMealLogForUser(userId, mealId, {
                aiFeedback: 'AI 분석 결과를 가져오지 못했습니다.',
            });
            return;
        }
        const { data: existing, error } = await (0, supabase_js_1.getSupabase)()
            .from('meal_logs')
            .select('*')
            .eq('id', mealId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error)
            throw new Error(error.message);
        if (!existing)
            return;
        const row = existing;
        const currentMacros = normalizeMacros(row.macros);
        const keepClientMacros = (0, mealAi_service_js_1.hasExplicitMacros)(currentMacros);
        await updateMealLogForUser(userId, mealId, {
            macros: keepClientMacros ? currentMacros : analysis.macros,
            aiFeedback: analysis.aiFeedback,
        });
    }
    catch (err) {
        console.error('[mealAi] background analysis failed:', err);
        try {
            await updateMealLogForUser(userId, mealId, {
                aiFeedback: 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
            });
        }
        catch (updateErr) {
            console.error('[mealAi] failed to write analysis error state:', updateErr);
        }
    }
}
function queueMealAiAnalysis(userId, mealId, input) {
    const clientMacros = (0, mealAi_service_js_1.hasExplicitMacros)(input.macros);
    const job = {
        mealType: input.mealType,
        memo: input.memo ?? '',
        imageUrl: input.imageUrl,
        estimateMacros: Boolean(input.imageUrl?.trim()) && !clientMacros,
    };
    void runMealAiAnalysis(userId, mealId, job);
}
/** Ensures a profiles row exists for FK on meal_logs (fallback when auth trigger missed). */
async function ensureProfile(userId) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (data)
        return;
    const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        role: 'user',
    });
    if (insertError)
        throw new Error(insertError.message);
}
async function listMealLogs(userId, query) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    let builder = supabase
        .from('meal_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('time', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
    if (query.date) {
        builder = builder.eq('date', query.date);
    }
    else {
        if (query.from)
            builder = builder.gte('date', query.from);
        if (query.to)
            builder = builder.lte('date', query.to);
    }
    const { data, error, count } = await builder.range(from, to);
    if (error)
        throw new Error(error.message);
    return {
        data: (data ?? []).map(toMealLogDto),
        total: count ?? 0,
        page: query.page,
        limit: query.limit,
    };
}
async function createMealLog(userId, input) {
    await ensureProfile(userId);
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data, error } = await supabase
        .from('meal_logs')
        .insert({
        user_id: userId,
        date: input.date,
        meal_type: input.mealType,
        time: input.time ?? null,
        memo: input.memo ?? null,
        image_url: input.imageUrl ?? null,
        macros: mergeMacros(undefined, input.macros),
        ai_feedback: input.aiFeedback ?? null,
    })
        .select('*')
        .single();
    if (error)
        throw new Error(error.message);
    const row = data;
    const dto = toMealLogDto(row);
    if (shouldQueueMealAiAnalysis(input)) {
        queueMealAiAnalysis(userId, row.id, input);
    }
    return dto;
}
async function updateMealLogForUser(userId, id, input) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data: existing, error: fetchError } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (fetchError)
        throw new Error(fetchError.message);
    if (!existing)
        return null;
    const row = existing;
    const patch = {};
    if (input.date !== undefined)
        patch.date = input.date;
    if (input.mealType !== undefined)
        patch.meal_type = input.mealType;
    if (input.time !== undefined)
        patch.time = input.time;
    if (input.memo !== undefined)
        patch.memo = input.memo;
    if (input.imageUrl !== undefined)
        patch.image_url = input.imageUrl;
    if (input.aiFeedback !== undefined)
        patch.ai_feedback = input.aiFeedback;
    if (input.macros !== undefined) {
        patch.macros = mergeMacros(row.macros, input.macros);
    }
    if (Object.keys(patch).length === 0) {
        return toMealLogDto(row);
    }
    const { data, error } = await supabase
        .from('meal_logs')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
    if (error)
        throw new Error(error.message);
    return toMealLogDto(data);
}
function isMealType(value) {
    return mealLog_js_1.MEAL_TYPES.includes(value);
}
