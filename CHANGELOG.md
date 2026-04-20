# Changelog

All notable changes to Koku Dedektifi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
