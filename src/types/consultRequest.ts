/** DB row (snake_case) */
export interface ConsultRequestRow {
  id: string;
  user_id: string | null;
  gym_id: string;
  trainer_id: string | null;
  name: string;
  phone: string;
  phone_hmac?: string | null;
  preferred_date: string;
  preferred_time: string;
  topic: string;
  topic_detail: string;
  memo: string | null;
  share_history_consent: boolean;
  status: ConsultRequestStatus;
  created_at: string;
}

export type ConsultRequestStatus = 'pending' | 'accepted' | 'rejected' | 'done';

export const CONSULT_TOPICS = [
  '벌크업',
  '다이어트',
  '자세 교정',
  '입문',
  '기타',
] as const;

export type ConsultTopic = (typeof CONSULT_TOPICS)[number];

export interface CreateConsultRequestInput {
  gymId: string;
  trainerId?: string | null;
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  topic: ConsultTopic;
  topicDetail?: string;
  memo?: string;
  shareHistoryConsent?: boolean;
}

/** API response (camelCase) */
export interface ConsultRequestDto {
  id: string;
  userId: string | null;
  gymId: string;
  gymName: string;
  trainerId: string | null;
  trainerName: string | null;
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  topic: ConsultTopic;
  topicDetail: string;
  memo: string;
  shareHistoryConsent: boolean;
  status: ConsultRequestStatus;
  createdAt: string;
}

export interface ListMyConsultRequestsQuery {
  status?: ConsultRequestStatus;
  page: number;
  limit: number;
}
