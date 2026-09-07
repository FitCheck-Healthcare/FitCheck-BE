"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileForUser = getProfileForUser;
exports.updateProfileForUser = updateProfileForUser;
const supabase_js_1 = require("../lib/supabase.js");
function toProfileDto(row) {
    return {
        id: row.id,
        role: row.role,
        name: row.name,
        phone: row.phone,
        createdAt: row.created_at,
    };
}
async function getAuthUserMetadata(userId) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error)
        throw new Error(error.message);
    const meta = data.user?.user_metadata ?? {};
    const name = typeof meta.name === 'string'
        ? meta.name
        : typeof meta.full_name === 'string'
            ? meta.full_name
            : null;
    const phone = typeof meta.phone === 'string' ? meta.phone : null;
    return { name, phone };
}
async function ensureProfile(userId) {
    const supabase = (0, supabase_js_1.getSupabase)();
    const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
    if (fetchError)
        throw new Error(fetchError.message);
    if (existing)
        return existing;
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
    if (error)
        throw new Error(error.message);
    return data;
}
async function getProfileForUser(userId) {
    const row = await ensureProfile(userId);
    return toProfileDto(row);
}
async function updateProfileForUser(userId, input) {
    await ensureProfile(userId);
    const supabase = (0, supabase_js_1.getSupabase)();
    const patch = {};
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
    if (error)
        throw new Error(error.message);
    return toProfileDto(data);
}
