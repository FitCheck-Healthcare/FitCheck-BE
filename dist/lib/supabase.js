"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = getSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
let client = null;
function getSupabase() {
    if (client)
        return client;
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
        throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. backend/.env 를 확인하세요.');
    }
    client = (0, supabase_js_1.createClient)(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    return client;
}
