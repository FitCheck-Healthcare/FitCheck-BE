"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConsultRequest = createConsultRequest;
exports.listMyConsultRequests = listMyConsultRequests;
exports.getConsultRequestByIdForUser = getConsultRequestByIdForUser;
exports.isConsultRequestStatus = isConsultRequestStatus;
const supabase_js_1 = require("../lib/supabase.js");
const consultRequest_js_1 = require("../types/consultRequest.js");
const fieldEncryption_js_1 = require("../utils/fieldEncryption.js");
function normalizeTime(value) {
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}$/.test(trimmed))
        return `${trimmed}:00`;
    return trimmed;
}
function decryptTopic(value) {
    const topic = (0, fieldEncryption_js_1.decryptField)(value);
    if (consultRequest_js_1.CONSULT_TOPICS.includes(topic)) {
        return topic;
    }
    return '기타';
}
function decryptRowPii(row) {
    return {
        name: (0, fieldEncryption_js_1.decryptField)(row.name),
        phone: (0, fieldEncryption_js_1.decryptField)(row.phone),
        topic: decryptTopic(row.topic),
        topicDetail: (0, fieldEncryption_js_1.decryptField)(row.topic_detail),
        memo: row.memo ? (0, fieldEncryption_js_1.decryptField)(row.memo) : '',
    };
}
function toConsultRequestDto(row, options = {}) {
    const pii = options.plaintext ?? decryptRowPii(row);
    const preferredTime = row.preferred_time.slice(0, 5);
    return {
        id: row.id,
        userId: row.user_id,
        gymId: row.gym_id,
        gymName: row.gym?.name ?? '',
        trainerId: row.trainer_id,
        trainerName: row.trainer?.name ?? null,
        name: pii.name,
        phone: options.maskPhone ? (0, fieldEncryption_js_1.maskPhone)(pii.phone) : pii.phone,
        preferredDate: row.preferred_date,
        preferredTime,
        topic: pii.topic,
        topicDetail: pii.topicDetail,
        memo: pii.memo,
        shareHistoryConsent: row.share_history_consent,
        status: row.status,
        createdAt: row.created_at,
    };
}
const CONSULT_SELECT = `
  *,
  gym:gyms ( name ),
  trainer:trainers ( name )
`;
async function createConsultRequest(input, userId) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .select('id')
        .eq('id', input.gymId)
        .maybeSingle();
    if (gymError)
        throw new Error(gymError.message);
    if (!gym)
        throw new Error('NOT_FOUND');
    if (input.trainerId) {
        const { data: trainer, error: trainerError } = await supabase
            .from('trainers')
            .select('id, gym_id')
            .eq('id', input.trainerId)
            .maybeSingle();
        if (trainerError)
            throw new Error(trainerError.message);
        if (!trainer)
            throw new Error('TRAINER_NOT_FOUND');
        if (trainer.gym_id !== input.gymId)
            throw new Error('TRAINER_GYM_MISMATCH');
    }
    const { data, error } = await supabase
        .from('consult_requests')
        .insert({
        user_id: userId ?? null,
        gym_id: input.gymId,
        trainer_id: input.trainerId ?? null,
        name: (0, fieldEncryption_js_1.encryptField)(input.name),
        phone: (0, fieldEncryption_js_1.encryptField)(input.phone),
        phone_hmac: (0, fieldEncryption_js_1.hashPhone)(input.phone),
        preferred_date: input.preferredDate,
        preferred_time: normalizeTime(input.preferredTime),
        topic: (0, fieldEncryption_js_1.encryptField)(input.topic),
        topic_detail: (0, fieldEncryption_js_1.encryptField)(input.topicDetail ?? ''),
        memo: input.memo ? (0, fieldEncryption_js_1.encryptField)(input.memo) : null,
        share_history_consent: input.shareHistoryConsent ?? false,
    })
        .select(CONSULT_SELECT)
        .single();
    if (error)
        throw new Error(error.message);
    return toConsultRequestDto(data, {
        plaintext: {
            name: input.name,
            phone: input.phone,
            topic: input.topic,
            topicDetail: input.topicDetail ?? '',
            memo: input.memo ?? '',
        },
    });
}
async function listMyConsultRequests(userId, query) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    let builder = supabase
        .from('consult_requests')
        .select(CONSULT_SELECT, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (query.status) {
        builder = builder.eq('status', query.status);
    }
    const { data, error, count } = await builder.range(from, to);
    if (error)
        throw new Error(error.message);
    return {
        data: (data ?? []).map((row) => toConsultRequestDto(row, { maskPhone: true })),
        total: count ?? 0,
        page: query.page,
        limit: query.limit,
    };
}
async function getConsultRequestByIdForUser(userId, id) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data, error } = await supabase
        .from('consult_requests')
        .select(CONSULT_SELECT)
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (error)
        throw new Error(error.message);
    if (!data)
        return null;
    return toConsultRequestDto(data);
}
function isConsultRequestStatus(value) {
    return ['pending', 'accepted', 'rejected', 'done'].includes(value);
}
