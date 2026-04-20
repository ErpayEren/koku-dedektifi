# Changelog

All notable changes to Koku Dedektifi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (Faz 4 — Tasarım / UX İyileştirmeleri)
- `components/analysis-results/primitives.tsx` — `ConfidenceRing`: 56px → 72px, renk bantlı (kırmızı/kehribar/altın), sayısal skor, Yüksek/Orta/Düşük Güven etiketi, hover tooltip
- `components/analysis-results/utils.ts` — `ANALYSIS_STEPS` 4 → 6 adım, daha etkileyici loading mesajları
- `components/analysis-results/AnalysisLoadingState.tsx` — adım ikonları, `StepDots` progress göstergesi, `aria-live`, gecikmeli skeleton
- `components/analysis-results/panels.tsx` — `TeaseSimilarUpsell`: 2.2s tease-then-blur, CTA overlay animasyonu
- `components/HeroInput.tsx` — foto tab primary (flex-1, "En doğru sonuç" badge), secondary Metin/Nota blok, ilk-kez coach-mark (localStorage + 800ms gecikme)
- `app/paketler/page.tsx` — `ComparisonTable`: 9 satır ücretsiz vs pro karşılaştırması

### Added (Faz 5 — Mobil Uygulama / Play Store)
- `lib/native/` — platform, storage, haptics, share, network, permissions, splash, zustand-storage: Capacitor ↔ web unified native abstraction layer
- `lib/analytics/events.ts` — Sentry üzerinden core event tracking (analysis_started/completed/failed, pro_clicked, share_clicked, barcode_scanned)
- `components/native/NativeAppInit.tsx` — app ready event: splash hide (300ms fade), StatusBar DARK, push notification token register
- `components/native/PermissionRationaleSheet.tsx` — camera/notification izin gerekçe bottom sheet (Portal, Escape/backdrop dismiss, safe-area uyumlu)
- `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` — Sentry Next.js konfigürasyonu
- `app/global-error.tsx` — React render error → Sentry.captureException
- `docs/play_store_submission.md` — Play Store gönderim kılavuzu: app name/description (TR), screenshot listesi, content rating, data safety formu, keystore komutları, checklist
- `@capacitor/preferences`, `@capacitor/share`, `@sentry/nextjs`, `@zxing/library` bağımlılıkları eklendi

### Changed (Faz 5)
- `capacitor.config.ts` — backgroundColor `#0A0A0A`, launchShowDuration `1500`, launchAutoHide `false`, StatusBar `DARK`, `webContentsDebuggingEnabled: !isProd`, `allowMixedContent: false`
- `android/app/src/main/AndroidManifest.xml` — CAMERA, ACCESS_NETWORK_STATE, VIBRATE, POST_NOTIFICATIONS izinleri; deep link intent-filter (https + custom scheme)
- `android/app/build.gradle` — versionCode `5`, versionName `1.0.0`, ProGuard/R8 aktif (`minifyEnabled true`, `shrinkResources true`), env-based signing config
- `android/app/proguard-rules.pro` — Capacitor bridge, Kotlin, OkHttp kuralları, satır numarası koruması
- `.gitignore` — `*.jks`, `android/keystore/`, `keystore.properties` eklendi
- `lib/store/userStore.ts` — Capacitor Preferences persist storage (session persist, Faz 1'den ertelenmişti)
- `components/AppShell.tsx` — `NativeAppInit` eklendi
- `next.config.js` — `withSentryConfig` sarmalı

### Added (Faz 3 — Fonksiyonel Boşluklar)
- `supabase/migrations/20260420_phase3_functional_gaps.sql` — `analyses.slug`, `analyses.is_public`, `analyses_read_public` RLS policy, `pg_trgm` full-text index on perfumes, trending_perfumes materialized view, `generate_analysis_slug()` + `refresh_trending_perfumes()` SQL fonksiyonları
- `api_internal/perfumes.js` — Perfüm search (q, gender, brand, price_tier, sayfalama) ve trending endpoint
- `app/kesfet/` — Yeni Keşfet sayfası: full-text search, Trend/Sen İçin/Arama tabları, gender + fiyat filtreleri, lazy loading
- `app/analiz/[slug]/` — Paylaşılabilir analiz URL sayfası: ISR (revalidate=3600), generateMetadata (OG+Twitter), JSON-LD Article, native share API + clipboard fallback, "Kendi Analizini Yap" CTA
- `app/api/analyses/[slug]/og/route.tsx` — Dinamik OG image: parfüm adı, brand, confidence ring (renk kuşakları), top notalar
- `components/analysis-results/panels.tsx`: `EvidenceInfoModal` (3 kanıt seviyesi açıklaması, portal), `EvidenceDot` helper, MoleculePanel başlığına ℹ butonu
- `lib/client/api.ts`: `searchPerfumes()`, `getTrendingPerfumes()`, `getAnalysisBySlug()`, `PerfumeSearchResult` tipi

### Changed (Faz 3)
- `lib/server/core-analysis.ts` — `persistAnalysisRecord` artık `slug` yazıyor ve döndürüyor; `getAnalysisBySlug()`, `searchPerfumes()`, `getTrendingPerfumes()` eklendi
- `api_internal/analyses.js` — `?slug=` parametresi ile slug bazlı public lookup desteği
- `api_internal/analyze.js` — Tüm persist yanıtlarına `slug` alanı eklendi
- `api/ops.js` — `perfumes` route'u eklendi
- `vercel.json` — `/api/perfumes → /api/ops?r=perfumes` rewrite eklendi
- `lib/client/types.ts` — `AnalysisResult.slug?: string | null` eklendi
- `components/analysis-results/panels.tsx` — Molekül liste satırlarına renkli `EvidenceDot` eklendi
- `components/analysis-results/useAnalysisResultsModel.ts` — `copyResultLink()` slug varsa `/analiz/[slug]` URL kullanıyor
- `components/MobileNav.tsx` — `/kesfet` linki `Compass` ikonu ile eklendi
- `app/barkod/page.tsx` — Torch toggle butonu, scan guide overlay, kamera stream ref, `toggleTorch()` fonksiyonu

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
