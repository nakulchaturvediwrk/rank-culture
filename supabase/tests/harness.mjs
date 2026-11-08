// Replays supabase/migrations on PGlite with a stub of Supabase's auth/cron/extensions,
// then exposes helpers to run SQL as anon / a signed-in user.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "fs";
import path from "path";

export async function makeDb(migDir, { upTo = 99 } = {}) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema extensions; create schema cron;
    create extension pgcrypto with schema extensions;
    grant usage on schema public, auth, extensions to anon, authenticated, service_role;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
    create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, status text);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select auth.jwt() ->> 'role' $$;
    create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
    -- Supabase default: anon/authenticated get full table grants on new public tables, execute on functions.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  const files = fs.readdirSync(migDir).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort().filter(f => Number(f.slice(0, 4)) <= upTo);
  for (const f of files) {
    let sql = fs.readFileSync(path.join(migDir, f), "utf8").replace(/create extension if not exists pg_cron;?/gi, "");
    try { await db.exec(sql); } catch (e) { throw new Error(`${f}: ${e.message}`); }
  }
  return db;
}

// Run fn's SQL as a role. user = { id, aal } or null for anon.
export async function as(db, user, sql, params = []) {
  const claims = user ? JSON.stringify({ sub: user.id, role: "authenticated", aal: user.aal || "aal1" }) : JSON.stringify({ role: "anon" });
  await db.exec(`reset role; select set_config('request.jwt.claims', '${claims.replace(/'/g, "''")}', false); set role ${user ? "authenticated" : "anon"};`);
  try { return await db.query(sql, params); }
  finally { await db.exec("reset role;"); }
}
export async function newUser(db, name = "Test User", email) {
  const r = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email || `${Math.random().toString(36).slice(2)}@x.in`, { full_name: name }]);
  return { id: r.rows[0].id };
}
