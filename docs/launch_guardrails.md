# Koku Dedektifi - Launch Guardrails

## 1) Frontend Build

```bash
npm install
npm run build
```

## 2) Production Smoke

```bash
npm run smoke:web
```

## 3) Release Gate (Budget + Health + Observability)

```bash
npm run guardrail
```

Bu komutlar aşağıdakileri bloklar:

- `app.js` boyutu budget aşımı
- İlk yüklenen JS toplamının budget aşımı
- `/api/health`, `/api/wardrobe-health`, `/api/feed-health` readiness hatası
- `sentryConfigured !== true` olması

## 4) Zorunlu ENV (Vercel Production)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_USERS_TABLE=app_users`
- `SUPABASE_WARDROBE_TABLE=scent_wardrobe`
- `SUPABASE_FEED_TABLE=community_feed`
- `WARDROBE_REQUIRE_SUPABASE=true`
- `FEED_REQUIRE_SUPABASE=true`
- `WARDROBE_ALLOW_RUNTIME_FALLBACK=false`
- `FEED_ALLOW_RUNTIME_FALLBACK=false`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_RELEASE` (opsiyonel, yoksa `VERCEL_GIT_COMMIT_SHA`)

## 5) Supabase RLS

`docs/supabase_schema.sql` dosyasındaki RLS bölümü üretimde çalıştırılmalı.
