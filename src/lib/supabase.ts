import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

let client: SupabaseClient | null = null;

/**
 * supabase-js Realtime은 Node 22+ 네이티브 WebSocket을 가정한다.
 * Node 20에서는 `ws`를 넘기지 않으면 createClient() 자체가 throw 한다.
 */
function nodeRealtimeTransport() {
  if (typeof globalThis.WebSocket === 'undefined') {
    (globalThis as typeof globalThis & { WebSocket: typeof WebSocket }).WebSocket =
      WebSocket as unknown as typeof globalThis.WebSocket;
  }
  return WebSocket;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. backend/.env 를 확인하세요.',
    );
  }

  client = createClient(url, serviceRoleKey, {
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
