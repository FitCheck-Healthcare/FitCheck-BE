import { randomUUID } from 'node:crypto';
import { getSupabase } from '../lib/supabase.js';

const BUCKET = 'meal-images';

export const MEAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const MEAL_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type MealImageMimeType = (typeof MEAL_IMAGE_MIME_TYPES)[number];

const EXT_BY_MIME: Record<MealImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isMealImageMimeType(value: string): value is MealImageMimeType {
  return MEAL_IMAGE_MIME_TYPES.includes(value as MealImageMimeType);
}

export async function uploadMealImage(
  userId: string,
  buffer: Buffer,
  mimeType: MealImageMimeType,
): Promise<string> {
  const supabase = getSupabase();
  const ext = EXT_BY_MIME[mimeType];
  const path = `meals/${userId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
