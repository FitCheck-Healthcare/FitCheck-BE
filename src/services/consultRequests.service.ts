import { getSupabase } from '../lib/supabase.js';
import type {
  ConsultRequestDto,
  ConsultRequestRow,
  ConsultRequestStatus,
  ConsultTopic,
  CreateConsultRequestInput,
  ListMyConsultRequestsQuery,
} from '../types/consultRequest.js';
import { CONSULT_TOPICS } from '../types/consultRequest.js';
import {
  decryptField,
  encryptField,
  hashPhone,
  maskPhone,
} from '../utils/fieldEncryption.js';

type ConsultRequestWithRelations = ConsultRequestRow & {
  gym: { name: string } | null;
  trainer: { name: string } | null;
};

interface ToDtoOptions {
  maskPhone?: boolean;
  /** POST 응답 등 — DB ciphertext 대신 평문 사용 */
  plaintext?: {
    name: string;
    phone: string;
    topic: ConsultTopic;
    topicDetail: string;
    memo: string;
  };
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

function decryptTopic(value: string): ConsultTopic {
  const topic = decryptField(value);
  if (CONSULT_TOPICS.includes(topic as ConsultTopic)) {
    return topic as ConsultTopic;
  }
  return '기타';
}

function decryptRowPii(row: ConsultRequestRow): {
  name: string;
  phone: string;
  topic: ConsultTopic;
  topicDetail: string;
  memo: string;
} {
  return {
    name: decryptField(row.name),
    phone: decryptField(row.phone),
    topic: decryptTopic(row.topic),
    topicDetail: decryptField(row.topic_detail),
    memo: row.memo ? decryptField(row.memo) : '',
  };
}

function toConsultRequestDto(
  row: ConsultRequestWithRelations,
  options: ToDtoOptions = {},
): ConsultRequestDto {
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
    phone: options.maskPhone ? maskPhone(pii.phone) : pii.phone,
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

export async function createConsultRequest(
  input: CreateConsultRequestInput,
  userId?: string,
): Promise<ConsultRequestDto> {
  const supabase = getSupabase();

  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .select('id')
    .eq('id', input.gymId)
    .maybeSingle();

  if (gymError) throw new Error(gymError.message);
  if (!gym) throw new Error('NOT_FOUND');

  if (input.trainerId) {
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, gym_id')
      .eq('id', input.trainerId)
      .maybeSingle();

    if (trainerError) throw new Error(trainerError.message);
    if (!trainer) throw new Error('TRAINER_NOT_FOUND');
    if (trainer.gym_id !== input.gymId) throw new Error('TRAINER_GYM_MISMATCH');
  }

  const { data, error } = await supabase
    .from('consult_requests')
    .insert({
      user_id: userId ?? null,
      gym_id: input.gymId,
      trainer_id: input.trainerId ?? null,
      name: encryptField(input.name),
      phone: encryptField(input.phone),
      phone_hmac: hashPhone(input.phone),
      preferred_date: input.preferredDate,
      preferred_time: normalizeTime(input.preferredTime),
      topic: encryptField(input.topic),
      topic_detail: encryptField(input.topicDetail ?? ''),
      memo: input.memo ? encryptField(input.memo) : null,
      share_history_consent: input.shareHistoryConsent ?? false,
    })
    .select(CONSULT_SELECT)
    .single();

  if (error) throw new Error(error.message);

  return toConsultRequestDto(data as ConsultRequestWithRelations, {
    plaintext: {
      name: input.name,
      phone: input.phone,
      topic: input.topic,
      topicDetail: input.topicDetail ?? '',
      memo: input.memo ?? '',
    },
  });
}

export async function listMyConsultRequests(
  userId: string,
  query: ListMyConsultRequestsQuery,
): Promise<{ data: ConsultRequestDto[]; total: number; page: number; limit: number }> {
  const supabase = getSupabase();
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
  if (error) throw new Error(error.message);

  return {
    data: ((data ?? []) as ConsultRequestWithRelations[]).map((row) =>
      toConsultRequestDto(row, { maskPhone: true }),
    ),
    total: count ?? 0,
    page: query.page,
    limit: query.limit,
  };
}

export async function getConsultRequestByIdForUser(
  userId: string,
  id: string,
): Promise<ConsultRequestDto | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('consult_requests')
    .select(CONSULT_SELECT)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return toConsultRequestDto(data as ConsultRequestWithRelations);
}

export function isConsultRequestStatus(value: string): value is ConsultRequestStatus {
  return ['pending', 'accepted', 'rejected', 'done'].includes(value);
}
