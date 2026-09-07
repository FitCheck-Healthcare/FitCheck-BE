/**
 * Supabase 마이그레이션 SQL 적용 스크립트
 *
 * 사용법:
 *   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" \
 *     node scripts/apply-migrations.mjs
 *
 * DATABASE_URL은 Supabase Dashboard → Project Settings → Database → Connection string (URI)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });

const MIGRATION_FILES = [
  '20260716062310_init_base_schema.sql',
  '20260716064100_seed_courses.sql',
  '20260716064200_seed_gyms_trainers.sql',
  '20260720000000_extend_gyms_naver.sql',
  '20260720000100_fix_gyms_naver_unique.sql',
  '20260720000200_remove_extra_seed_gyms.sql',
  '20260721000000_add_consult_share_history_consent.sql',
  '20260721010000_consult_pii_encryption.sql',
  '20260723000000_course_views.sql',
];

async function markMigrationApplied(client, filename) {
  await client.query(
    'INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
    [filename],
  );
}

async function bootstrapExistingMigrations(client) {
  const checks = [
    {
      filename: '20260716062310_init_base_schema.sql',
      sql: `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles'`,
    },
    {
      filename: '20260716064100_seed_courses.sql',
      sql: `SELECT 1 FROM public.courses LIMIT 1`,
    },
    {
      filename: '20260716064200_seed_gyms_trainers.sql',
      sql: `SELECT 1 FROM public.gyms LIMIT 1`,
    },
  ];

  for (const check of checks) {
    try {
      const { rows } = await client.query(check.sql);
      if (rows.length > 0) {
        await markMigrationApplied(client, check.filename);
        console.log(`📌 detected existing schema/data → marked applied: ${check.filename}`);
      }
    } catch {
      // table may not exist yet
    }
  }
}

function buildPgConfig() {
  const projectRef = 'wtfiiqmgtgtahmflxcoh';
  const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();

  if (dbPassword) {
    return {
      user: `postgres.${projectRef}`,
      password: dbPassword,
      host: process.env.SUPABASE_DB_HOST?.trim() || 'aws-1-ap-northeast-2.pooler.supabase.com',
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      'DATABASE_URL 또는 SUPABASE_DB_PASSWORD가 필요합니다.\n' +
        'Supabase Dashboard → Connect → Session pooler URI 를 DATABASE_URL에 넣거나,\n' +
        'SUPABASE_DB_PASSWORD=... 를 backend/.env 에 추가하세요.',
    );
    process.exit(1);
  }

  try {
    const url = new URL(databaseUrl);
    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: Number(url.port || 5432),
      database: url.pathname.replace(/^\//, '') || 'postgres',
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return {
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    };
  }
}

async function main() {
  const client = new pg.Client(buildPgConfig());

  await client.connect();
  console.log('✅ Postgres 연결 성공');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await bootstrapExistingMigrations(client);

  const migrationsDir = path.join(root, 'supabase', 'migrations');

  for (const filename of MIGRATION_FILES) {
    const { rows } = await client.query(
      'SELECT 1 FROM public.schema_migrations WHERE filename = $1',
      [filename],
    );
    if (rows.length > 0) {
      console.log(`⏭  skip (already applied): ${filename}`);
      continue;
    }

    const sqlPath = path.join(migrationsDir, filename);
    if (!fs.existsSync(sqlPath)) {
      console.warn(`⚠  missing file: ${filename}`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`▶  applying: ${filename}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO public.schema_migrations (filename) VALUES ($1)',
        [filename],
      );
      await client.query('COMMIT');
      console.log(`✅ applied: ${filename}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  const { rows: gymCount } = await client.query(
    'SELECT count(*)::int AS n FROM public.gyms',
  );
  const { rows: colCheck } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gyms' AND column_name = 'naver_place_id'
  `);

  console.log(`\n📊 gyms: ${gymCount[0]?.n ?? 0} rows`);
  console.log(`📊 naver_place_id column: ${colCheck.length > 0 ? 'yes' : 'no'}`);

  await client.end();
  console.log('\n🎉 마이그레이션 완료');
}

main().catch((err) => {
  console.error('❌ 마이그레이션 실패:', err.message);
  process.exit(1);
});
