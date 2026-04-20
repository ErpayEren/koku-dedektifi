# 📊 KOKU DEDEKTİFİ — FAZ PROGRESS TAKİBİ

> ⚠️ **ÖNEMLİ:** Her faz sonunda bu dosyayı GÜNCELLE. Bir sonraki faz bu dosyayı okuyarak başlayacak.
> Yeni konuşma başlamadan önce bu dosyayı ve `CHANGELOG.md`'yi oku.

---

## FAZ 1 — KRİTİK BLOKERLER

**Status:** 🟡 In Progress  
**Başlangıç:** 2026-04-20  
**Bitiş:** —

### Yapılan İşler
- [ ] `/giris` sayfası oluşturuldu
- [ ] `/kayit` sayfası oluşturuldu
- [ ] Google OAuth entegrasyonu
- [ ] Anonim → gerçek user migration RPC
- [ ] `/hesap` sayfası (profil, şifre sıfırla, hesap sil)
- [ ] Middleware güncelleme (korumalı rotalar)
- [ ] Session persist (Capacitor Preferences)
- [ ] Onboarding persist (`preferences` JSONB migration)
- [ ] Rate limiting (per-user analiz limiti)
- [ ] `docs/email_setup.md` oluşturuldu

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

**Status:** ⬜ Todo  
**Başlangıç:** —  
**Bitiş:** —

### Yapılacaklar
- [ ] `api_internal/schemas/analysis.ts` Zod şema katmanı
- [ ] LLM structured output (responseSchema)
- [ ] Prompt versiyonlama (`api_internal/prompts/`)
- [ ] RAG similarity threshold tuning
- [ ] Idempotency + cache (`analysis_cache` tablosu)
- [ ] Offline/failure davranışı
- [ ] `docs/confidence_formula.md`
- [ ] `analysis_telemetry` tablosu + migration

### Kritik Mimari Kararlar
_Henüz başlanmadı_

### Oluşturulan / Değiştirilen Dosyalar
_Henüz başlanmadı_

### Bilinen Sorunlar / Ertelenenler
_Henüz başlanmadı_

### Bir Sonraki Faza Handoff Notları
_Henüz başlanmadı_

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
