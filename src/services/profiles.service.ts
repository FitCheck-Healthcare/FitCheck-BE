import { getSupabase } from '../lib/supabase.js';
import type { ProfileDto, ProfileRow, UpdateProfileInput } from '../types/profile.js';

function toProfileDto(row: ProfileRow): ProfileDto {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

async function getAuthUserMetadata(userId: string): Promise<{ name: string | null; phone: string | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);

  const meta = data.user?.user_metadata ?? {};
  const name =
    typeof meta.name === 'string'
      ? meta.name
      : typeof meta.full_name === 'string'
        ? meta.full_name
        : null;
  const phone = typeof meta.phone === 'string' ? meta.phone : null;

  return { name, phone };
}

async function ensureProfile(userId: string): Promise<ProfileRow> {
  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (existing) return existing as ProfileRow;

  const { name, phone } = await getAuthUserMetadata(userId);

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      role: 'user',
      name,
      phone,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function getProfileForUser(userId: string): Promise<ProfileDto> {
  const row = await ensureProfile(userId);
  return toProfileDto(row);
}

export async function updateProfileForUser(
  userId: string,
  input: UpdateProfileInput,
): Promise<ProfileDto> {
  await ensureProfile(userId);

  const supabase = getSupabase();
  const patch: Record<string, unknown> = {};

  if (input.name !== undefined) {
    patch.name = input.name?.trim() || null;
  }
  if (input.phone !== undefined) {
    patch.phone = input.phone?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return getProfileForUser(userId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return toProfileDto(data as ProfileRow);
}
