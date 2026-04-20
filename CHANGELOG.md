# Changelog

All notable changes to Koku Dedektifi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (Faz 2 — Veri Doğruluğu ve LLM Kararlılığı)
- `api_internal/schemas/analysis.ts` — TypeScript Zod şemaları: AnalysisInputSchema, LLMRawOutputSchema, MoleculeSchema, SimilarFragranceSchema
- `api_internal/schemas/analysis.js` — CJS runtime Zod validatörü: validateLLMOutput, validateAnalysisInput, formatZodError
- `api_internal/prompts/analyze_v3.md` — Versiyonlu analiz promptu (few-shot örnekler, kurallar, versiyon geçmişi)
- `supabase/migrations/20260421_phase2_analysis_telemetry.sql` — analysis_telemetry tablosu (latency_ms, model_version, prompt_version, confidence_score)
- `docs/confidence_formula.md` — confidenceScore formülü: identityBonus + pyramidBonus + moleculeBonus + modeBonus (0-100)
- `docs/rag_tuning.md` — RAG similarity threshold rehberi, embedding normalizasyonu, pgvector index konfigürasyonu
- `tests/schemas.test.js` — 16 Zod şema test senaryosu
- `zod@4.3.6` bağımlılığı eklendi

### Changed (Faz 2)
- `lib/server/provider-router.js` — Analysis temperature 0.35 → **0.2** (Gemini, OpenRouter, Anthropic)
- `api_internal/analyze.js` — Zod input validation (400 + readable error)
- `api_internal/analyze.js` — LLM output Zod validation + 1 kez retry (correction prompt ile)
- `api_internal/analyze.js` — Idempotency cache: SHA256(mode+input) → analysis_cache tablosu (7 gün TTL)
- `api_internal/analyze.js` — confidenceScore hesabı ve tüm yanıtlara eklenmesi
- `api_internal/analyze.js` — Telemetri: analysis_telemetry tablosuna fire-and-forget loglama (latency, cache hit, degraded, retry count)

### Added
- `docs/MASTER_PLAN.md` — full launch readiness plan (Faz 1-7)
- `docs/PROGRESS.md` — phase-by-phase progress tracker with handoff notes
- `TODO_BILLING.md` — billing-related TODOs deferred until payment provider is wired up
- `docs/email_setup.md` — SPF/DKIM setup guide + Resend integration instructions
- `/giris` dedicated login page with email/password + Google OAuth stub
- `/kayit` dedicated register page with validation + terms consent
- `/sifre-sifirla` password reset request page (no-op until email provider configured)
- `/hesap` expanded account management: display name edit, password change, account deletion
- `components/auth/AuthCard.tsx` — shared auth page components (AuthCard, AuthInput, AuthButton)
- Supabase migration `20260420_phase12`: `preferences JSONB` on users, `rate_limits`, `feature_flags`, `analysis_cache` tables

### Changed
- `middleware.ts` — protected routes now redirect to `/giris` instead of `/profil`; added per-user analyze rate limit (10 req/min)
- `api_internal/auth.js` — added `change-password`, `delete-account`, `forgot-password` actions
- `lib/server/supabase-auth-users.js` — added `deleteSupabaseUser` function
