/** DB row (snake_case) */
export interface MealLogRow {
  id: string;
  user_id: string;
  date: string;
  meal_type: string;
  time: string | null;
  memo: string | null;
  image_url: string | null;
  macros: MealMacrosJson;
  ai_feedback: string | null;
  created_at: string;
}

export const MEAL_TYPES = ['아침', '점심', '저녁', '간식'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface MealMacros {
  carb: number;
  protein: number;
  fat: number;
  kcal: number;
}

export type MealMacrosJson = MealMacros | Record<string, unknown>;

/** API response (camelCase) */
export interface MealLogDto {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  time: string | null;
  memo: string | null;
  imageUrl: string | null;
  macros: MealMacros;
  aiFeedback: string | null;
  createdAt: string;
  /** Gemini 백그라운드 분석 대기 중 */
  aiAnalysisPending?: boolean;
}

export interface CreateMealLogInput {
  date: string;
  mealType: MealType;
  time?: string | null;
  memo?: string | null;
  imageUrl?: string | null;
  macros?: Partial<MealMacros>;
  aiFeedback?: string | null;
}

export interface UpdateMealLogInput {
  date?: string;
  mealType?: MealType;
  time?: string | null;
  memo?: string | null;
  imageUrl?: string | null;
  macros?: Partial<MealMacros>;
  aiFeedback?: string | null;
}

export interface ListMealLogsQuery {
  date?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}
