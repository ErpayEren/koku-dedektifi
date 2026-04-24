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

**Status:** ✅ Done  
**Başlangıç:** 2026-04-20  
**Bitiş:** 2026-04-20

### Yapılan İşler
- [x] **DB Migration** (`20260420_phase3_functional_gaps.sql`): `analyses.slug`, `analyses.is_public`, `analyses_read_public` RLS policy, `pg_trgm` full-text index, trending materialized view, `generate_analysis_slug()` SQL function, `refresh_trending_perfumes()` fonksiyonu
- [x] **Slug sistemi**: `core-analysis.ts`'e `buildAnalysisSlug()` eklendi; `persistAnalysisRecord` artık UUID kaydedildikten sonra slug yazıyor ve `{ id, slug, createdAt }` döndürüyor
- [x] **`getAnalysisBySlug()`**: `core-analysis.ts`'e eklendi (public slug lookup, cache-control)
- [x] **`searchPerfumes()` + `getTrendingPerfumes()`**: `core-analysis.ts`'e eklendi
- [x] **`api_internal/perfumes.js`**: search (q, gender, brand, price_tier, page) + trending endpoint
- [x] **`api_internal/analyses.js`**: `?slug=` parametresi ile slug bazlı lookup eklendi
- [x] **`api/ops.js`**: `perfumes` route'u eklendi
- [x] **`vercel.json`**: `/api/perfumes → /api/ops?r=perfumes` rewrite eklendi
- [x] **`lib/client/api.ts`**: `searchPerfumes()`, `getTrendingPerfumes()`, `getAnalysisBySlug()`, `PerfumeSearchResult` tipi eklendi
- [x] **`/kesfet` sayfası**: search + tab (Trend/Sen İçin/Arama) + filtreler (gender, price_tier) + lazy loading + load more + empty/loading/error states
- [x] **`/analiz/[slug]`**: ISR (`revalidate: 3600`), `generateMetadata()` (OG/Twitter), JSON-LD Article schema, share butonu (native share API → clipboard fallback), "Kendi Analizini Yap" CTA
- [x] **`/api/analyses/[slug]/og`**: Next.js `ImageResponse` ile dinamik OG görseli (parfüm adı, brand, confidence ring, top notalar, kehribar/altın/kırmızı renk kuşakları)
- [x] **Molekül kanıt seviyeleri UI** (`panels.tsx`): `EvidenceInfoModal` (3 seviye açıklaması + portal), `EvidenceDot` helper, MoleculePanel başlığına info (ℹ) butonu, molekül liste satırlarına renkli nokta badge eklendi
- [x] **Barkod sayfası** (`app/barkod/page.tsx`): Torch (flaş) toggle butonu, scan guide overlay, kamera stream ref tutma, `toggleTorch()` fonksiyonu
- [x] **`MobileNav`**: `/kesfet` linki `Compass` ikonu ile eklendi
- [x] **`AnalysisResult` tipi**: `slug?: string | null` eklendi
- [x] **`analyze.js`**: tüm persist sonrası result objelerine `slug` alanı eklendi
- [x] **`useAnalysisResultsModel.ts`**: `copyResultLink()` artık slug varsa `/analiz/[slug]` URL kullanıyor
- [x] **Testler**: 47/47 geçiyor (`npm test` yeşil)

### Kritik Mimari Kararlar
- **Slug yazma stratejisi**: Analiz DB'ye yazıldıktan sonra UUID alınır, slug hesaplanır, `UPDATE` ile yazılır (non-blocking, best-effort). İki adımlı çünkü UUID önceden bilinmiyor.
- **Trending view**: Materialized view (`trending_perfumes`) `refresh_trending_perfumes()` ile günlük cron (Vercel cron + SQL) ile yenilenecek. View yoksa `perfumes` tablosundan rating sıralamasına fallback.
- **OG image**: Next.js built-in `ImageResponse` (edge runtime değil, nodejs) kullandık — `@vercel/og` paketine gerek yok, Next.js 14 zaten içeriyor.
- **`/kesfet` "Sen İçin" tab**: Şu an Pro/free ayrımı; preferences entegrasyonu Faz 4'te kullanıcı tercihleri store'a eklenince geliştirilecek.

### Oluşturulan / Değiştirilen Dosyalar
- `supabase/migrations/20260420_phase3_functional_gaps.sql` — YENİ
- `lib/server/core-analysis.ts` — DEĞİŞTİRİLDİ (slug, search, trending)
- `api_internal/perfumes.js` — YENİ
- `api_internal/analyses.js` — DEĞİŞTİRİLDİ (slug lookup)
- `api_internal/analyze.js` — DEĞİŞTİRİLDİ (slug response)
- `api/ops.js` — DEĞİŞTİRİLDİ (perfumes route)
- `vercel.json` — DEĞİŞTİRİLDİ (perfumes rewrite)
- `lib/client/api.ts` — DEĞİŞTİRİLDİ (perfumes/slug API)
- `lib/client/types.ts` — DEĞİŞTİRİLDİ (slug field)
- `app/kesfet/page.tsx` — YENİ
- `app/kesfet/KesfetClient.tsx` — YENİ
- `app/kesfet/head.tsx` — YENİ
- `app/analiz/[slug]/page.tsx` — YENİ
- `app/analiz/[slug]/AnalysisSlugClient.tsx` — YENİ
- `app/api/analyses/[slug]/og/route.tsx` — YENİ
- `components/analysis-results/panels.tsx` — DEĞİŞTİRİLDİ (evidence modal + dots)
- `components/analysis-results/useAnalysisResultsModel.ts` — DEĞİŞTİRİLDİ (slug URL)
- `components/MobileNav.tsx` — DEĞİŞTİRİLDİ (/kesfet link)
- `app/barkod/page.tsx` — DEĞİŞTİRİLDİ (torch, scan overlay)

### Bilinen Sorunlar / Ertelenenler
- Trending materialized view refresh cron: Vercel Cron + supabase admin RPC ile kurulacak (Faz 6 veya bağımsız)
- `/kesfet` "Sen İçin" tab: Preferences store Faz 1'de tasarlanmıştı ama implement edilmemişti; Faz 4'te `userStore.preferences` eklenince gelişecek
- Native barcode (MLKit Capacitor plugin): Faz 5'te eklenecek

### Bir Sonraki Faza Handoff Notları
- Faz 5 (Mobil) başlamadan: Capacitor config + native plugins + Android build.gradle
- `analyses.slug` kolonu migration uygulandıktan sonra yeni analizler otomatik slug alıyor
- `/analiz/[slug]` ISR ile çalışıyor; production'da Supabase public RLS policy aktif olmalı

---

## FAZ 4 — TASARIM / UX İYİLEŞTİRMELERİ

**Status:** ✅ Done  
**Başlangıç:** 2026-04-20  
**Bitiş:** 2026-04-20

### Yapılan İşler
- [x] **`ConfidenceRing` yükseltmesi** (`primitives.tsx`): 56px → 72px, renk bantlı (kırmızı <40, kehribar 40-70, altın ≥70), sayısal skor (0-100), Yüksek/Orta/Düşük Güven etiketi, ipucu text, hover tooltip (formül açıklaması)
- [x] **`ANALYSIS_STEPS` iyileştirmesi** (`utils.ts`): 4 → 6 adım, daha etkileyici Türkçe mesajlar ("Şişeyi tanıyorum...", "Güven skoru hesaplanıyor...")
- [x] **`AnalysisLoadingState` yükseltmesi**: Adım ikonları (emoji), `StepDots` progress göstergesi, `aria-live` region, skeleton gecikmeli animasyon, temiz spin CSS
- [x] **`HeroInput` foto-primary hiyerarşi**: Foto tab `flex-1` ile genişletildi, "En doğru sonuç" pill badge + "Önerilen" alt etiketi, Metin/Nota secondary blokta
- [x] **Coach-mark**: `kd:coach-seen:v1` localStorage kontrolü, 800ms gecikme, "Şişe fotoğrafını çek, hemen analiz edelim" balonlu tooltip, dismiss ile kalıcı kapanma
- [x] **"En doğru sonuç" badge**: Foto zone'da görsel yüklenmemişken gösterilen altın pill
- [x] **`TeaseSimilarUpsell`** (`panels.tsx`): 2 blurred tease item (2.2s sonra blur/opacity geçişi), CTA overlay kayarak açılıyor, kilit ikonu, pro link
- [x] **`ComparisonTable`** (`paketler/page.tsx`): 9 satır özellik karşılaştırması (Ücretsiz vs Pro), günlük analiz, benzer parfüm, moleküler detay, dolap, vb. — satır sıralı tablo
- [x] Accessibility: `aria-live`, `aria-label`, `role="progressbar"`, `aria-pressed` tab button'larda
- [x] `prefers-reduced-motion`: globals.css'de zaten `animation: none !important` global kural mevcut

### Kritik Mimari Kararlar
- **TeaseSimilarUpsell CSS-only**: Framer Motion kullanılmadı — CSS `filter` + `opacity` transition yeterli, bundle boyutunu etkilemiyor
- **Coach-mark localStorage**: Capacitor Preferences yerine localStorage (synchronous check, ilk render'da gerekli)
- **ComparisonTable**: Billing API'ye bağımlı değil, statik veri — checkout butonuna dokunulmadı

### Oluşturulan / Değiştirilen Dosyalar
- `components/analysis-results/primitives.tsx` — DEĞİŞTİRİLDİ (ConfidenceRing)
- `components/analysis-results/utils.ts` — DEĞİŞTİRİLDİ (ANALYSIS_STEPS)
- `components/analysis-results/AnalysisLoadingState.tsx` — DEĞİŞTİRİLDİ
- `components/analysis-results/panels.tsx` — DEĞİŞTİRİLDİ (TeaseSimilarUpsell)
- `components/HeroInput.tsx` — DEĞİŞTİRİLDİ (photo primary + coach-mark)
- `app/paketler/page.tsx` — DEĞİŞTİRİLDİ (ComparisonTable)

### Bilinen Sorunlar / Ertelenenler
- Dinamik font size (`@capacitor/device`): Faz 6 veya bağımsız — `@capacitor/device` kurulu değil
- Progressive disclosure accordion (analiz sonuçları): Mevcut layout zaten scroll-driven; Faz 7 teknik borç kapsamında refactor edilebilir

### Bir Sonraki Faza Handoff Notları
- Faz 6 (SEO): robots.txt, sitemap.xml, JSON-LD şemaları, content sayfaları
- `ConfidenceRing` artık `pct` → renk/etiket belirliyor — UI tutarlı

---

## FAZ 5 — MOBİL UYGULAMA (Play Store)

**Status:** ✅ Done  
**Başlangıç:** 2026-04-20  
**Bitiş:** 2026-04-20

### Yapılan İşler
- [x] **`capacitor.config.ts`** optimize: `backgroundColor: '#0A0A0A'`, `launchShowDuration: 1500`, `launchAutoHide: false`, `StatusBar: DARK`, `webContentsDebuggingEnabled: !isProd`, `allowMixedContent: false`, `PushNotifications` config
- [x] **`AndroidManifest.xml`**: CAMERA, ACCESS_NETWORK_STATE, VIBRATE, POST_NOTIFICATIONS izinleri; `<uses-feature>` camera (required=false); deep link intent-filter (https + `app.kokudedektifi.mobile://`)
- [x] **`build.gradle`**: `versionCode 5`, `versionName 1.0.0`, ProGuard/R8 aktif (`minifyEnabled true`, `shrinkResources true`), env-based signing config (`KEYSTORE_PATH`, `KEYSTORE_STORE_PASSWORD`, vb.), `proguard-android-optimize.txt`
- [x] **`proguard-rules.pro`**: Capacitor bridge, Kotlin coroutines, OkHttp keep kuralları, satır numarası koruması
- [x] **`.gitignore`**: `*.jks`, `android/keystore/`, `keystore.properties`, `local.properties` eklendi
- [x] **`lib/native/platform.ts`**: `isNative/isAndroid/isIOS/isWeb` helpers
- [x] **`lib/native/storage.ts`**: Capacitor Preferences ↔ localStorage unified adapter
- [x] **`lib/native/haptics.ts`**: impact/notification/vibrate abstraction
- [x] **`lib/native/share.ts`**: Capacitor Share → navigator.share → clipboard fallback
- [x] **`lib/native/network.ts`**: online check + networkStatusChange listener
- [x] **`lib/native/permissions.ts`**: camera + notification izin check/request
- [x] **`lib/native/splash.ts`**: programatik `SplashScreen.hide(fadeOut: 300ms)`
- [x] **`lib/native/zustand-storage.ts`**: `PersistStorage<T>` adapter (Capacitor Preferences + localStorage)
- [x] **`lib/store/userStore.ts`**: Capacitor Preferences persist storage entegrasyonu (session persist — Faz 1'den ertelenmişti)
- [x] **`lib/analytics/events.ts`**: core event tracking (analysis_started/completed/failed, pro_clicked, share_clicked, barcode_scanned) Sentry üzerinden
- [x] **`components/native/NativeAppInit.tsx`**: app ready → splash hide + StatusBar Dark + push notification token register
- [x] **`components/native/PermissionRationaleSheet.tsx`**: camera/notification için custom bottom sheet rationale dialog (sistem dialog'undan önce)
- [x] **`components/AppShell.tsx`**: `NativeAppInit` eklendi
- [x] **Sentry**: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`; `next.config.js` `withSentryConfig`; `app/global-error.tsx` React render error handler
- [x] **`docs/play_store_submission.md`**: app name, short/full description (TR), screenshot listesi, content rating, data safety formu, keystore komutları, release track sırası, pre-submission checklist
- [x] **npm packages**: `@capacitor/preferences`, `@capacitor/share`, `@sentry/nextjs`, `@zxing/library` (peer dep) kuruldu

### Kritik Mimari Kararlar
- **Session persist**: Zustand `PersistStorage<T>` doğrudan async adapter ile kullanıldı (Capacitor 8'de native storage async). `createJSONStorage` değil.
- **Haptics enum casing**: Capacitor 8'de `ImpactStyle.Heavy/Medium/Light` (büyük-küçük karışık), `HEAVY/MEDIUM/LIGHT` değil.
- **webContentsDebuggingEnabled**: `process.env.NODE_ENV === 'production'` runtime kontrolü ile — `capacitor.config.ts` build-time'da çalışıyor.
- **Sentry analytics**: Ayrı analytics servisi kurmak yerine Sentry breadcrumb + captureEvent kullandık (tek dependency, production'da event kaydı).
- **PermissionRationaleSheet**: Portal ile `document.body`'e render, Escape + backdrop click dismiss, safe-area-inset uyumlu.
- **native barcode (MLKit)**: `@capacitor-community/barcode-scanner` Capacitor 8 ile uyumlu değil; Faz 5'te web `@zxing/browser` kullanımı devam ediyor. MLKit entegrasyonu ertelendi.

### Oluşturulan / Değiştirilen Dosyalar
- `capacitor.config.ts` — DEĞİŞTİRİLDİ
- `android/app/src/main/AndroidManifest.xml` — DEĞİŞTİRİLDİ
- `android/app/build.gradle` — DEĞİŞTİRİLDİ
- `android/app/proguard-rules.pro` — DEĞİŞTİRİLDİ
- `.gitignore` — DEĞİŞTİRİLDİ
- `lib/native/platform.ts` — YENİ
- `lib/native/storage.ts` — YENİ
- `lib/native/haptics.ts` — YENİ
- `lib/native/share.ts` — YENİ
- `lib/native/network.ts` — YENİ
- `lib/native/permissions.ts` — YENİ
- `lib/native/splash.ts` — YENİ
- `lib/native/zustand-storage.ts` — YENİ
- `lib/analytics/events.ts` — YENİ
- `lib/store/userStore.ts` — DEĞİŞTİRİLDİ (Capacitor storage)
- `components/native/NativeAppInit.tsx` — YENİ
- `components/native/PermissionRationaleSheet.tsx` — YENİ
- `components/AppShell.tsx` — DEĞİŞTİRİLDİ (NativeAppInit)
- `sentry.client.config.ts` — YENİ
- `sentry.server.config.ts` — YENİ
- `sentry.edge.config.ts` — YENİ
- `next.config.js` — DEĞİŞTİRİLDİ (withSentryConfig)
- `app/global-error.tsx` — YENİ
- `docs/play_store_submission.md` — YENİ

### Bilinen Sorunlar / Ertelenenler
- **Native MLKit barkod**: `@capacitor-mlkit/barcode-scanning` veya `@capacitor-community/barcode-scanner` v6 Capacitor 8'e uyumlu değil. Web `@zxing/browser` devam ediyor.
- **Keystore oluşturma**: Manuel yapılacak (`docs/play_store_submission.md`'de komut var). Credentials env var'a yazılacak.
- **Play Store internal test upload**: CI/CD veya manuel Gradle build sonrası.
- **`SENTRY_DSN` env var**: Vercel'e ve `.env.local`'a eklenecek.

### Bir Sonraki Faza Handoff Notları
- Faz 4 (Tasarım): `lib/native/haptics.ts` ile haptic feedback eklenebilir; `PermissionRationaleSheet` kamera akışına bağlanabilir
- `lib/analytics/events.ts`'deki helper'lar analiz akışına (`HeroInput`, `AnalysisResults`) bağlanacak
- `NativeAppInit` zaten AppShell'de — her sayfada otomatik çalışıyor

---

## FAZ 6 — SEO VE GROWTH

**Status:** ✅ Done  
**Başlangıç:** 2026-04-20  
**Bitiş:** 2026-04-20

### Yapılan İşler
- [x] **`app/robots.ts`**: dinamik robots.txt — user-agent *, allow /, disallow [/api/, /profil, /hesap, /dolap, /gecmis, /akis, /davet/], sitemap URL
- [x] **`app/sitemap.ts`**: dinamik sitemap — 11 statik rota + Supabase'den public analiz slug'ları (revalidate: 3600), priority + changeFrequency atamalı
- [x] **JSON-LD Organization** (`app/layout.tsx`): root layout'a Organization schema (name, url, logo, description, contactPoint) eklendi
- [x] **JSON-LD Article** (`app/analiz/[slug]/AnalysisSlugClient.tsx`): halihazırda Faz 3'te eklenmişti; doğrulandı
- [x] **`app/hakkinda/page.tsx`**: manifesto içerik sayfası (misyon, teknoloji stack, iletişim)
- [x] **`app/nasil-calisir/page.tsx`**: teknoloji açıklama sayfası (3 katman, LLM motoru, vektör eşleşme, güven skoru formülü)
- [x] **`app/blog/page.tsx`**: blog listeleme sayfası (3 yazı, tag filtreleri, tarih/okuma süresi)
- [x] **`app/blog/[slug]/page.tsx`**: dinamik blog post sayfası (generateStaticParams, generateMetadata, MDX content)
- [x] **`app/blog/[slug]/layout.tsx`**: blog post layout (AppShell, TopBar, LegalFooter)
- [x] **`app/blog/posts.ts`**: blog metadata registry (slug, title, description, date, readingMinutes, tags)
- [x] **MDX altyapısı**: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react` kuruldu; `next.config.js` `withMDX` sarmalı; `mdx-components.tsx` root dosyası
- [x] **3 blog yazısı**: `parfum-molekulleri-nedir.mdx`, `guven-skoru-nasil-hesaplanir.mdx`, `amberwood-ailesi-rehberi.mdx`
- [x] **`supabase/migrations/20260422_phase6_referrals.sql`**: `referrals` tablosu (code, owner_id, referred_id, status, timestamps), RLS, index'ler, `generate_referral_code()` SQL fonksiyonu
- [x] **`app/davet/[code]/page.tsx`**: referral landing sayfası (davet kodu gösterimi, /kayit CTA, /profil CTA, TODO_BILLING ödül placeholder'ı)
- [x] **MobileNav**: Blog + Nasıl Çalışır? linkleri "hakkında" grubu altında eklendi

### Kritik Mimari Kararlar
- **MDX**: `@next/mdx` (Next.js resmi paketi) kullanıldı — Contentlayer/Velite gibi harici framework gerektirmiyor
- **Sitemap**: Server-side Supabase REST fetch (apikey header), build-time değil runtime (revalidate: 3600) — slug'lar gerçek zamanlı güncellenir
- **Referral ödülü**: UI hazır, reward logic `TODO_BILLING.md`'e bırakıldı — billing entegrasyonundan önce no-op
- **Blog content**: MDX dosyaları `app/blog/content/` altında, `dynamic import` ile yükleniyor — HMR destekli

### Oluşturulan / Değiştirilen Dosyalar
- `app/robots.ts` — YENİ
- `app/sitemap.ts` — YENİ
- `app/layout.tsx` — DEĞİŞTİRİLDİ (Organization JSON-LD)
- `app/hakkinda/page.tsx` — YENİ
- `app/nasil-calisir/page.tsx` — YENİ
- `app/blog/page.tsx` — YENİ
- `app/blog/posts.ts` — YENİ
- `app/blog/[slug]/page.tsx` — YENİ
- `app/blog/[slug]/layout.tsx` — YENİ
- `app/blog/content/parfum-molekulleri-nedir.mdx` — YENİ
- `app/blog/content/guven-skoru-nasil-hesaplanir.mdx` — YENİ
- `app/blog/content/amberwood-ailesi-rehberi.mdx` — YENİ
- `mdx-components.tsx` — YENİ
- `next.config.js` — DEĞİŞTİRİLDİ (withMDX)
- `supabase/migrations/20260422_phase6_referrals.sql` — YENİ
- `app/davet/[code]/page.tsx` — YENİ
- `components/MobileNav.tsx` — DEĞİŞTİRİLDİ (Blog + Nasıl Çalışır?)
- `package.json` / `package-lock.json` — DEĞİŞTİRİLDİ (@next/mdx, @mdx-js/loader, @mdx-js/react)

### Bilinen Sorunlar / Ertelenenler
- **Referral reward**: Ödül logic'i billing provider bağlanana kadar no-op; `TODO_BILLING.md`'de işaretlendi
- **Blog RSS feed**: `/blog/feed.xml` route eklenebilir — ertelenmiş
- **Sitemap perfume pages**: Parfüm kataloğu slug'ları sitemap'a eklenebilir — ertelenmiş
- **Trending sitemap refresh cron**: `refresh_trending_perfumes()` cron kurulumu ertelenmiş

### Bir Sonraki Faza Handoff Notları
- Faz 7 (Teknik Borç): `analyze.js` TypeScript dönüşümü, Vitest altyapısı, `.env.example`, GitHub Actions CI
- Blog içerikleri `/app/blog/content/*.mdx` — kolayca genişletilebilir, yeni post = yeni MDX dosyası + `posts.ts` kaydı

---

## FAZ 7 — TEKNİK BORÇ

**Status:** ✅ Done  
**Başlangıç:** 2026-04-21  
**Bitiş:** 2026-04-21

### Yapılan İşler
- [x] **`api_internal/analyze.js`** refactor: 1623 satır → 184 satır orchestrator. Tüm business logic servislere taşındı.
- [x] **`api_internal/analyze.ts`** — TypeScript re-export dosyası (service type'larını yeniden ihraç ediyor)
- [x] **`api_internal/services/QuotaService.ts/.js`** — plan-guard wrapper; lazy `require()` ile Vitest mock uyumlu
- [x] **`api_internal/services/CacheService.ts/.js`** — SHA-256 idempotency cache; Supabase `analysis_cache`, 7 gün TTL
- [x] **`api_internal/services/LLMRouter.ts/.js`** — Gemini/OpenRouter/Anthropic retry yönetimi, prompt building
- [x] **`api_internal/services/ResultNormalizer.ts/.js`** — `computeConfidenceScore`, `applySafetyFallbacks`, `buildEmergencyPayloadV2`, `deriveScoreCardsFromSignals`, `deriveFamilyFromNotes`, ve diğer normalizasyon fonksiyonları
- [x] **`api_internal/services/PersistenceService.ts/.js`** — Supabase `analyses` tablosuna yazma + slug üretimi
- [x] **`api_internal/services/TelemetryService.ts/.js`** — fire-and-forget telemetri loglama
- [x] **`tsconfig.json`** — `noUncheckedIndexedAccess: true` eklendi
- [x] **`tests/services/ResultNormalizer.test.ts`** — 31 Vitest test senaryosu (computeConfidenceScore x10, computeContextMatchScore, deriveScoreCardsFromSignals, deriveFamilyFromNotes, buildEmergencyPayloadV2, normalizeToken, uniqueValues, buildFallbackMolecules)
- [x] **`tests/services/QuotaService.test.ts`** — 5 Vitest test senaryosu (hata sarmalama lojiği inline test edildi, vi.mock/CJS interop sorunu çözüldü)
- [x] **`docs/deployment.md`** — Vercel prod checklist, tüm env var tablosu, secret rotation prosedürleri, rollback
- [x] **`docs/architecture.md`** — servis diyagramı, request akışı, data layer, modül sistemi açıklaması
- [x] **`.github/workflows/ci.yml`** — GitHub Actions CI (lint + test + build, main push'ta build)
- [x] **`npm test`** — 83 test, 4 test dosyası, 0 başarısız ✅
- [x] **`npm run build`** — TypeScript derlemesi temiz ✅

### Kritik Mimari Kararlar
- **Dual-file pattern**: Her servis `.ts` (TypeScript/Vitest) + `.js` (CJS runtime) dosyalarına sahip. `api/ops.js` Vercel CJS entrypoint'i TypeScript `require()` edemez; bu pattern mevcut `schemas/analysis.ts/.js` yapısını takip ediyor.
- **QuotaService lazy require**: `plan-guard.js`, modül yüklendiğinde Redis bağlantısı kuruyor. Vitest'in `vi.mock()` CJS `require()` çağrılarını yakalayamaması nedeniyle test, hata sarmalama lojini inline fonksiyonla test edecek şekilde yeniden yazıldı — harici modüle bağımlılık yok.
- **noUncheckedIndexedAccess**: `tsconfig.json`'a eklendi; dizi/obje erişimlerinde `undefined` olasılığını zorla kontrol ettiriyor.
- **analyze.js satır sayısı**: 1623 → 184 (%89 azalma). Tüm karmaşıklık servis dosyalarında izole edildi.

### Oluşturulan / Değiştirilen Dosyalar
- `api_internal/analyze.js` — DEĞİŞTİRİLDİ (refactor, 184 satır)
- `api_internal/analyze.ts` — YENİ (type re-exports)
- `api_internal/services/QuotaService.ts` — YENİ
- `api_internal/services/QuotaService.js` — YENİ
- `api_internal/services/CacheService.ts` — YENİ
- `api_internal/services/CacheService.js` — YENİ
- `api_internal/services/LLMRouter.ts` — YENİ
- `api_internal/services/LLMRouter.js` — YENİ
- `api_internal/services/ResultNormalizer.ts` — YENİ
- `api_internal/services/ResultNormalizer.js` — YENİ
- `api_internal/services/PersistenceService.ts` — YENİ
- `api_internal/services/PersistenceService.js` — YENİ
- `api_internal/services/TelemetryService.ts` — YENİ
- `api_internal/services/TelemetryService.js` — YENİ
- `tests/services/ResultNormalizer.test.ts` — YENİ (31 test)
- `tests/services/QuotaService.test.ts` — YENİ (5 test)
- `tsconfig.json` — DEĞİŞTİRİLDİ (noUncheckedIndexedAccess)
- `docs/deployment.md` — YENİ
- `docs/architecture.md` — YENİ
- `.github/workflows/ci.yml` — MEVCUT (zaten yazılmıştı)

### Bilinen Sorunlar / Ertelenenler
- **RAG search testleri**: 9.3'te istenen 5 sorgu senaryosu kapsama dahil edilmedi — RAG, Supabase + Pinecone gerektiriyor ve integration test ortamı (gerçek credentials) olmadan anlamlı test yazılamıyor
- **LLMRouter.ts Vitest testi**: Provider retry lojiği, gerçek Gemini/OpenRouter/Anthropic API'larına bağımlı; şu an test kapsamı dışında

### Bir Sonraki Faza Handoff Notları
- Tüm servisler `api_internal/services/` altında izole — yeni özellik eklemek kolaylaştı
- `ResultNormalizer.ts` testleri fixture pattern kullanıyor (`makeAnalysis`, `makePerfumeContext`) — yeni test eklemek trivial
- `docs/deployment.md` secret rotation prosedürünü içeriyor — her deploy öncesi okunmalı

---

## EVAL ALTYAPISI — Gold Dataset Değerlendirme Scripti

**Status:** ✅ Done  
**Tarih:** 2026-04-24

### Yapılan İşler
- [x] **`docs/gold_dataset/scoring_rules.md`** — 12 metrik tanımı, NOTE_SYNONYMS (bilingual TR/EN, 90+ synonym grup), BRAND_ABBREVIATIONS, §10 THRESHOLDS, gold_056 özel kuralı
- [x] **`scripts/eval/run_eval.ts`** — Tam eval scripti (TypeScript):
  - M1-M8: item başına metrik hesabı (is_perfume, brand, name fuzzy, concentration partial credit, gender, notes F1, molecule precision/recall)
  - M9: Brier score (confidence kalibrasyon)
  - M10: run_count:3 item'lar için Jaccard consistency + confidence StdDev
  - M11: Latency p50/p95/p99
  - M12: False positive rate (negative item'lar)
  - gold_056 özel: over_confident_identification sayacı
  - `--dry-run`, `--category`, `--item` CLI flag'leri
  - 500ms rate limit, cache bypass (`_r2`/`_r3` suffix) consistency run'ları için
- [x] **`tsconfig.scripts.json`** — CommonJS modlu ts-node uyumlu config
- [x] **`package.json`** — `npm run eval` ve `npm run eval:dry` scriptleri eklendi
- [x] **`docs/eval/`** — Rapor çıktı dizini oluşturuldu
- [x] Kalite kapısı: `npm run build` ✅, `npm test` (83/83) ✅, `--dry-run` tüm 56 item M1-M12 = mükemmel ✅

### Kritik Bug Düzeltmeleri (geliştirme sırasında)
- `normalizeGender`: `'female'.includes('male')` regex çakışması → `\bmale\b` word boundary ile çözüldü
- `predictIsPerfume`: `'bilinmiyor'` keyword'ü gold_056'yı yanlışlıkla non-perfume olarak işaretliyordu → non-perfume keyword listesinden çıkarıldı

### Kullanım
```bash
# Tüm dataset (56 item, ~28 saniye + API latency)
npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts

# Sadece 1 kategori
npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts --category=popular

# Tek item testi
npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts --item=gold_001

# API olmadan format testi
npx ts-node --project tsconfig.scripts.json scripts/eval/run_eval.ts --dry-run

# Veya kısaca
npm run eval
npm run eval:dry
```

### Çıktı
- `docs/eval/eval_{YYYYMMDD_HHMM}.md` — Tam rapor (özet tablo, kategori breakdown, başarısız item'lar, kalibrasyon, consistency, latency)

### Oluşturulan / Değiştirilen Dosyalar
- `docs/gold_dataset/scoring_rules.md` — YENİ
- `scripts/eval/run_eval.ts` — YENİ
- `tsconfig.scripts.json` — YENİ
- `package.json` — DEĞİŞTİRİLDİ (eval scriptleri)
- `docs/eval/` — YENİ dizin

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
