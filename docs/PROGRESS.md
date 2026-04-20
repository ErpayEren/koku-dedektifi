# 📊 KOKU DEDEKTİFİ — FAZ PROGRESS TAKİBİ

> ⚠️ **ÖNEMLİ:** Her faz sonunda bu dosyayı GÜNCELLE. Bir sonraki faz bu dosyayı okuyarak başlayacak.
> Yeni konuşma başlamadan önce bu dosyayı ve `CHANGELOG.md`'yi oku.

---

## FAZ 1 — KRİTİK BLOKERLER

**Status:** ✅ Done  
**Başlangıç:** 2026-04-20  
**Bitiş:** 2026-04-20

### Yapılan İşler
- [x] `/giris` sayfası oluşturuldu (GirisClient.tsx)
- [x] `/kayit` sayfası oluşturuldu (KayitClient.tsx)
- [x] `/sifre-sifirla` sayfası oluşturuldu
- [x] `/hesap` sayfası genişletildi: şifre değiştir, hesap sil, yasal linkler
- [x] `AuthCard`, `AuthInput`, `AuthButton` shared bileşenleri oluşturuldu
- [x] `auth.js`: `change-password`, `delete-account`, `forgot-password` action'ları eklendi
- [x] `supabase-auth-users.js`: `deleteSupabaseUser` eklendi
- [x] Middleware: `/profil` yerine `/giris` yönlendirmesi, per-user analyze rate limit (10/dk)
- [x] Supabase migration: `preferences JSONB`, `rate_limits`, `feature_flags`, `analysis_cache` tabloları
- [x] `docs/email_setup.md` oluşturuldu (Resend kurulum kılavuzu)
- [ ] Google OAuth — UI stub hazır (YAKINDA badge), backend Supabase Auth OAuth gerektirir
- [ ] Session persist (Capacitor Preferences) — Faz 5'e ertelendi
- [ ] Anonim → gerçek user migration RPC — wardrobe zaten merge oluyor; analyses için migration Faz 3.4'e bırakıldı

### Kritik Mimari Kararlar
- **Auth sistemi:** Mevcut custom token sistemi (`kd_token` cookie) korunuyor.
  Google OAuth için Supabase Auth entegrasyonu **ayrı** yapılacak (çakışma yok).
- **Anonim user migration:** `app_user_id` → `auth.uid()` RPC ile atomik transfer.
- **Preferences:** `app_users` tablosuna `preferences JSONB` kolonu ekleniyor.

### Mevcut Kod Durumu (Başlangıç)
- `api_internal/auth.js` — register/login/logout/patch, token tabanlı, çalışıyor
- `lib/server/auth-session.js` — PBKDF2 şifreleme, session store, çalışıyor
- `app/profil/page.tsx` + `ProfileRouteClient.tsx` — auth UI buraya gömülü
- `middleware.ts` — `/wear`, `/gecmis` korumalı, Upstash Redis rate limit mevcut
- `lib/store/userStore.ts` — Zustand persist (localStorage), çalışıyor
- **Eksikler:** /giris, /kayit sayfaları yok. Google OAuth yok. Preferences kolonu yok.

### Oluşturulan / Değiştirilen Dosyalar
- `docs/MASTER_PLAN.md` — oluşturuldu
- `docs/PROGRESS.md` — oluşturuldu (bu dosya)
- `CHANGELOG.md` — oluşturuldu
- `TODO_BILLING.md` — oluşturuldu

### Bilinen Sorunlar / Ertelenenler
- Google OAuth: Supabase'de OAuth app kurulumu gerektirir (credentials gerekli)
- Apple Sign-In: iOS için ertelenmiş (sadece altyapı)
- Magic link: Supabase SMTP ayarı gerektirir

### Bir Sonraki Faza Handoff Notları
- Faz 2 başlamadan önce: `npm run build` temiz geçmeli
- Faz 2 odağı: LLM structured output + Zod validation + RAG kalitesi

---

## FAZ 2 — VERİ DOĞRULUĞU VE LLM KARARLILIĞI

**Status:** ✅ Done  
**Başlangıç:** 2026-04-20  
**Bitiş:** 2026-04-20

### Yapılan İşler
- [x] `api_internal/schemas/analysis.ts` — TypeScript Zod şemaları (AnalysisInputSchema, LLMRawOutputSchema, MoleculeSchema, SimilarFragranceSchema)
- [x] `api_internal/schemas/analysis.js` — CJS runtime validator (validateLLMOutput, validateAnalysisInput, formatZodError)
- [x] LLM structured output: Gemini responseJsonSchema zaten aktifti; doğrulandı
- [x] Prompt versiyonlama: `api_internal/prompts/analyze_v3.md` (few-shot örnekler, kurallar, versiyon geçmişi)
- [x] Temperature 0.35 → **0.2** (Gemini, OpenRouter, Anthropic — tüm analiz çağrıları)
- [x] `analyze.js` — Zod input validation (400 + readable error)
- [x] `analyze.js` — LLM output Zod validation + **1 kez retry** (farklı prompt ile)
- [x] `analyze.js` — **Idempotency cache**: SHA256(mode+input) → `analysis_cache` tablosu, 7 gün TTL
- [x] `analyze.js` — **confidenceScore** hesabı (0-100): identity + pyramid + molecule + mode bonusları
- [x] `analyze.js` — **Telemetri loglama** (fire-and-forget): `analysis_telemetry` tablosu
- [x] `supabase/migrations/20260421_phase2_analysis_telemetry.sql` — telemetri tablosu
- [x] `docs/confidence_formula.md` — formül dokümantasyonu
- [x] `docs/rag_tuning.md` — RAG threshold, embedding normalizasyonu, tuning rehberi
- [x] `tests/schemas.test.js` — 16 test senaryosu (hepsi geçiyor)

### Kritik Mimari Kararlar
- **Zod v4 kullanıldı** (`zod@4.3.6`): `safeParse` yanıtında `error.errors` yerine `error.issues` kullanılıyor.
- **TS şema + CJS runtime**: `analysis.ts` IDE/type-check için, `analysis.js` runtime validation için. İkili yaklaşım çünkü `api_internal/*.js` Next.js dışında CJS ortamında çalışıyor.
- **Cache granülaritesi**: mode+input bazında (userId bağımsız) — aynı parfümü farklı kullanıcılar sorguladığında da cache'den döner. Pro/free farkı cache'lenmez, her zaman hesaplanır.
- **Retry stratejisi**: 1 kez, farklı (correction) prompt ile. İkinci retry yok (maliyet kontrolü).
- **Telemetri**: non-blocking (fire-and-forget), fail silently. Üretim metrikleri için temel.

### Oluşturulan / Değiştirilen Dosyalar
- `api_internal/schemas/analysis.ts` — YENİ
- `api_internal/schemas/analysis.js` — YENİ
- `api_internal/prompts/analyze_v3.md` — YENİ
- `api_internal/analyze.js` — DEĞİŞTİRİLDİ (cache, validation, telemetri, confidenceScore)
- `lib/server/provider-router.js` — DEĞİŞTİRİLDİ (temperature 0.2)
- `supabase/migrations/20260421_phase2_analysis_telemetry.sql` — YENİ
- `docs/confidence_formula.md` — YENİ
- `docs/rag_tuning.md` — YENİ
- `tests/schemas.test.js` — YENİ
- `package.json` / `package-lock.json` — DEĞİŞTİRİLDİ (zod eklendi)

### Bilinen Sorunlar / Ertelenenler
- RAG similarity threshold empirik ölçümü (50 parfüm test seti): Faz 3 veya bağımsız görev
- LLM re-rank (cross-encoder): Faz 3'e ertelendi
- `perceptual hash` (görsel için tam idempotency): Şu an imageBase64'ün ilk 256 karakteri hash'leniyor; tam perceptual hash kütüphane gerektiriyor
- IndexedDB offline cache (client-side): Faz 4 (UI) ile birlikte yapılacak

### Bir Sonraki Faza Handoff Notları
- Faz 3 başlamadan önce: `npm run build` temiz, `npm test` yeşil ✅
- Faz 3 odağı: /kesfet sayfası, barkod tarama, paylaşılabilir URL'ler, slug sistemi
- `confidenceScore` alanı artık tüm analiz yanıtlarında mevcut — UI'da ring görselleştirmesi Faz 4'te

---

## FAZ 3 — FONKSİYONEL BOŞLUKLAR

**Status:** ⬜ Todo  
**Başlangıç:** —  
**Bitiş:** —

### Yapılacaklar
- [ ] `/kesfet` sayfası (search + filtreler + trending)
- [ ] Barkod tarama UI (`/tara`)
- [ ] Molekül kanıt seviyeleri UI (badge'ler)
- [ ] Paylaşılabilir analiz URL'leri (`/analiz/[slug]`)
- [ ] OG image generation (`@vercel/og`)
- [ ] Share sheet entegrasyonu

---

## FAZ 4 — TASARIM / UX İYİLEŞTİRMELERİ

**Status:** ⬜ Todo  
**Başlangıç:** —  
**Bitiş:** —

### Yapılacaklar
- [ ] Hero input hiyerarşisi (foto primary)
- [ ] Analiz sonuçları progressive disclosure
- [ ] Confidence ring görselleştirmesi
- [ ] Pro upsell UI (tease preview)
- [ ] Mikro-etkileşimler (loading states, haptic)
- [ ] Accessibility (WCAG AA)

---

## FAZ 5 — MOBİL UYGULAMA (Play Store)

**Status:** ⬜ Todo  
**Başlangıç:** —  
**Bitiş:** —

### Yapılacaklar
- [ ] Capacitor config optimizasyonu
- [ ] Native plugin'ler entegrasyonu
- [ ] Android permissions + rationale dialoglar
- [ ] Play Store hazırlık (`docs/play_store_submission.md`)
- [ ] ProGuard/R8 + build.gradle ayarları
- [ ] Sentry/Crashlytics kurulumu

---

## FAZ 6 — SEO VE GROWTH

**Status:** ⬜ Todo  
**Başlangıç:** —  
**Bitiş:** —

### Yapılacaklar
- [ ] robots.txt + sitemap.xml (dinamik)
- [ ] JSON-LD şemaları
- [ ] Referral altyapısı (UI-only, billing bağlamadan)
- [ ] Content sayfaları (/hakkinda, /nasil-calisir, /blog)

---

## FAZ 7 — TEKNİK BORÇ

**Status:** ⬜ Todo  
**Başlangıç:** —  
**Bitiş:** —

### Yapılacaklar
- [ ] `analyze.js` refactor → TypeScript services
- [ ] Vitest test altyapısı
- [ ] `.env.example` güncellemesi
- [ ] `docs/deployment.md` + `docs/architecture.md`
- [ ] GitHub Actions CI workflow

---

## GENEL NOTLAR

### Billing Dosyaları — DOKUNULMAYANLAR
Aşağıdaki dosyalar hiçbir faz sonunda değiştirilmemeli:
- `api_internal/billing.js`
- `api_internal/billing-webhook.js`
- Paddle/Stripe ile ilgili herhangi bir dosya

Billing ile ilgili yapılacaklar → `TODO_BILLING.md`

### Önemli Bağımlılıklar
- Node: Mevcut versiyona sadık kal
- Next.js: 14.2.33 (upgrade etme, lansman öncesi risk)
- Supabase JS: 2.100.1
- Zustand: 5.0.12
- Capacitor: Mevcut versiyon (breaking change riski)
