"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = getSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
const ws_1 = __importDefault(require("ws"));
let client = null;
/**
 * supabase-js Realtime은 Node 22+ 네이티브 WebSocket을 가정한다.
 * Node 20에서는 `ws`를 넘기지 않으면 createClient() 자체가 throw 한다.
 *
 * `ws` 생성자 오버로드가 supabase-js `WebSocketLikeConstructor`와 맞지 않아 캐스팅한다.
 */
function nodeRealtimeTransport() {
    if (typeof globalThis.WebSocket === 'undefined') {
        globalThis.WebSocket =
            ws_1.default;
    }
    return ws_1.default;
}
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
        realtime: {
            transport: nodeRealtimeTransport(),
        },
    });
    return client;
}
