# 🎯 KOKU DEDEKTİFİ — LANSMAN HAZIRLIK MASTER PLANI

> Bu dosya projenin tüm lansman planını içerir. Her faz konuşması bu dosyayı okuyarak başlar.
> Billing **hariç** tüm lansman blokerlerini kapsar.

---

## 0. MİSYON

Koku Dedektifi projesini **Play Store üzerinden yayınlanmaya** ve **web lansmanına** hazır hâle getir. Billing akışı kapsam dışıdır (sahibi sonradan halledecek). Bunun dışında analiz doğruluğu, çıktı kararlılığı, auth, UX, mobil kalite, SEO ve teknik borç dahil **her şey** bu görevin içinde.

---

## 1. KAPSAM DIŞI (Bunlara Dokunma)

- ❌ Paddle/Stripe webhook doğrulaması
- ❌ Yeni ödeme sağlayıcısına geçiş
- ❌ Yıllık plan fiyatlandırması
- ❌ Checkout akışının end-to-end testi
- ❌ Gerçek ödeme alınan flow'un doğrulanması

> **NOT:** Pro özelliklerin **UI tarafı**, lock state'leri, upsell CTA'ları, entitlement okuma tarafı serbest — sadece webhook/ödeme mantığına dokunma.

---

## 2. TEMEL PRENSİPLER (Her görevde uygulanır)

### 2.1 Veri Doğruluğu ve Çıktı Kararlılığı (EN KRİTİK)
Bu ürünün kalbi parfüm analizi. Gemini'den gelen çıktı **her seferinde tutarlı, doğrulanmış ve güven seviyesi ölçülmüş** olmalı.

- **Structured output zorunlu:** Gemini'ye `responseSchema` ile strict JSON şeması ver. Free-form text yasak.
- **Zod ile runtime validation:** LLM çıktısını `api_internal/schemas/` altında tanımlı şemaya göre `safeParse` et. Şemaya uymayan çıktı → retry (max 2) → fallback.
- **Temperature düşük:** Analiz çağrılarında `temperature: 0.2` max, tutarlılık için.
- **Deterministik fallback:** LLM başarısızlığında pgvector RAG tabanlı "nota/molekül eşleştirmesi" ile en yakın tahmini ver — asla boş veya "bilinmiyor" gösterme.
- **Kanıt seviyeleri şeffaf:** Her molekül/nota için `evidence_level` (verified_component | note_match | inferred | unverified) üret ve UI'da göster.
- **Confidence score matematiksel:** Subjektif değil — (eşleşen molekül sayısı × kanıt ağırlığı) / toplam beklenen gibi somut bir formülle hesapla. Formülü `docs/confidence_formula.md` olarak belgele.
- **Idempotency:** Aynı fotoğraf + aynı kullanıcı → aynı hash → cache'den dön. Duplicate analiz olmasın.

### 2.2 Mobile-First (Play Store Kalitesi)
Web ikincil, uygulama birincil çıkış. Her değişiklik önce **Android (Capacitor)** üzerinde test edilecek.

- Tüm sayfalar `safe-area-inset-*` kullanmalı (notch, gesture bar).
- Touch target minimum 44×44dp.
- Haptic feedback kritik aksiyonlarda (analiz başlat, Pro satın al, favori).
- Offline state her sayfada handle edilmeli — network yoksa anlamlı mesaj.
- Splash screen siyah arka planlı, flash yok.
- Deep link desteği (`app.kokudedektifi.mobile://analiz/[slug]`).
- Play Store politikası gereği: Gizlilik Politikası + Kullanım Koşulları linkleri footer'da ve Hesap sayfasında.

### 2.3 Production-Grade Kalite
- Her yeni API endpoint'i Zod input validation ile başlar.
- Her yeni UI komponenti loading + error + empty state'leri içerir.
- Hiçbir değişiklik `console.log`/`alert` ile bitmez — Sentry/benzeri logger kullan.
- Her faz sonunda `npm run build` temiz geçmeli. TypeScript hatası yok, lint warning yok.

---

## 3. FAZ 1 — KRİTİK BLOKERLER (Lansman şartı)

### 3.1 Auth UI (Supabase)
**Hedef:** Kullanıcı e-posta ile hesap açabilmeli, cihaz değiştirdiğinde geçmişi yüklenmeli.

- `/giris` ve `/kayit` sayfaları oluştur. Magic link + e-posta/şifre her ikisini destekle.
- Sosyal giriş: Google OAuth zorunlu (Play Store kullanıcı beklentisi). Apple Sign-In hazır altyapı bırak (sonra iOS için).
- Anonim `app_user_id` → gerçek user'a **migrate** et: kullanıcı giriş yaptığında tüm `analyses`, `wardrobe`, `preferences` satırlarını yeni `auth.uid()`'ye transfer et (atomik RPC).
- `/hesap` sayfası: profil, e-posta değiştir, şifre sıfırla, hesabı sil (GDPR/KVKK gereği kritik).
- Middleware: korumalı rotalar için `supabase.auth.getUser()` kontrolü, redirect logic.
- Session persist: Capacitor için `@capacitor/preferences` ile secure storage.

**Acceptance:**
- Telefonu sıfırlayıp yeniden giriş yap → tüm analiz geçmişi geri geliyor.
- Magic link Gmail/iCloud/Outlook'ta spam'e düşmüyor (SPF/DKIM hazırla, `docs/email_setup.md` yaz).

### 3.2 Onboarding Persist
**Hedef:** Kullanıcı onboarding'de verdiği tercihleri (sezon, yoğunluk, cinsiyet, sevdiği notalar) kaybetmesin.

- `app_users` tablosuna `preferences JSONB` kolonu ekle (migration yaz).
- Zustand store'a persist layer ekle (`persist` middleware + Capacitor Preferences).
- Her onboarding step değişiminde autosave (debounced 500ms).
- `/hesap/tercihler` sayfasında sonradan düzenleme.
- Analiz sonuçlarında tercihlere göre "Sana Uygun mu?" rozeti göster (örn: yazlık tercih edene ağır oryantal gelirse uyarı).

### 3.3 Rate Limiting (Gerçek)
**Hedef:** LLM maliyeti patlaması riskini kapat.

- Upstash Redis veya Supabase `rate_limits` tablosu ile:
  - Per-user: 10 istek/dakika (analiz)
  - Per-IP: 30 istek/dakika (anonim)
  - Global kill switch: `FEATURE_FLAGS.analyze_enabled`
- 429 response'unda `Retry-After` header'ı ile UI'da anlamlı mesaj.

---

## 4. FAZ 2 — VERİ DOĞRULUĞU VE LLM KARARLILIĞI

### 4.1 Zod Şema Katmanı
- `api_internal/schemas/analysis.ts` oluştur:
  - `AnalysisInputSchema` (foto/metin/nota)
  - `LLMRawOutputSchema` (Gemini'nin vermesi beklenen JSON)
  - `AnalysisResultSchema` (normalize edilmiş son çıktı, client'a giden)
  - `MoleculeSchema` (name, evidence_level, confidence, source)
- Her API endpoint'i `schema.safeParse(input)` ile başlasın. Fail → 400 + readable error.
- LLM response'u parse edemiyorsa → 1 kez retry (farklı prompt ile) → hâlâ başarısız → RAG fallback.

### 4.2 LLM Prompt Engineering
- `api_internal/prompts/` klasörü oluştur, her prompt'u versiyonlu tut (`analyze_v3.md`).
- Gemini'ye:
  - System instruction'da strict JSON schema
  - Few-shot: 3 örnek (doğru parfüm, yanlış tahmin düzeltme, belirsiz durum)
  - Chain-of-thought'ı **internal** tut, user'a sadece final JSON gitsin (`thought` field'ı response'dan strip et).
- Her analiz için `prompt_version`, `model_version`, `latency_ms` telemetrisi kaydet (`analysis_telemetry` tablosu).

### 4.3 RAG Kalitesi
- pgvector similarity threshold'u (şu an muhtemelen default) **empirik olarak** ayarla: 50 örnek test analiziyle precision/recall ölç, optimum threshold'u `docs/rag_tuning.md`'ye yaz.
- Embedding modeli: hangisi kullanılıyorsa, input text'i **normalize** et (küçük harf, fragrantica-style formatting).
- "Benzer parfümler" listesi 10 aday getir, LLM ile re-rank (veya cross-encoder ile).

### 4.4 Idempotency + Cache
- Input hash (foto için perceptual hash + metin için SHA256) → `analysis_cache` tablosunda 7 gün tut.
- Cache hit'te LLM çağrısı yapma, direkt dön. Response'a `cached: true` ekle (debug için).

### 4.5 Offline / Başarısızlık Davranışı
- LLM down → RAG-only mode (banner: "Sınırlı modda çalışıyor, doğruluk düşebilir").
- Network yok → son analizleri IndexedDB'den göster + "Yeniden dene" butonu.

---

## 5. FAZ 3 — FONKSİYONEL BOŞLUKLAR

### 5.1 Keşfet / Arama Sayfası (`/kesfet`)
- Full-text search (`pg_trgm` üzerinden) + filtre: cinsiyet, sezon, marka, yoğunluk, fiyat aralığı.
- Trending: son 7 gün en çok analiz edilen 20 parfüm (materialized view, günlük refresh).
- Yeni: son eklenen parfümler.
- Sen için (giriş yapmış kullanıcı): preferences'e göre recommendation.
- Virtualized list (react-window veya @tanstack/virtual) — binlerce parfüm için.
- Her kartta: ürün görseli, marka, isim, confidence ortalaması, "Analiz Et" kısayolu.

### 5.2 Barkod Tarama UI
- `/tara` sayfası veya hero input'ta "Barkod" modu olarak ekle.
- @zxing/browser ile kamera feed.
- Bulundu → `/api/barcode` → parfüm bulunduysa direkt analysis sayfasına, bulunamadıysa "Manuel ara" fallback.
- Native Capacitor'da MLKit Barcode plugin'ini tercih et (daha hızlı, daha doğru).
- Torch (flaş) butonu, odaklama tap'ı.

### 5.3 Molekül Kanıt Seviyeleri UI
- Her molekül kartında badge:
  - 🟢 **Doğrulanmış** (verified_component)
  - 🟡 **Nota Eşleşmesi** (note_match)
  - ⚪ **Tahmini** (inferred)
- Tooltip: "Bu molekül resmi parfüm notalarıyla eşleşti" / "Bu molekül benzer parfümlerden çıkarıldı, kesin değil".
- Info modalı: "Kanıt seviyeleri ne demek?" — 3 seviyeyi açıklayan görsel.

### 5.4 Paylaşılabilir Analiz URL'leri
- Her başarılı analiz `analyses` tablosuna `slug` (marka-isim-kısa-hash) ile yazılsın.
- `/analiz/[slug]` sayfası:
  - SSG/ISR (Next.js) ile generate — SEO için kritik.
  - Meta tags: OG image (dinamik, `@vercel/og` ile), title, description.
  - JSON-LD Product + Review schema.
  - "Kendi Analizini Yap" CTA.
- `/api/analyses/[slug]/og` endpoint'i: parfüm + confidence + nota piramidi görseli üret.
- Share sheet (native `@capacitor/share` + web `navigator.share`).

---

## 6. FAZ 4 — TASARIM / UX İYİLEŞTİRMELERİ

### 6.1 Hero Input Hiyerarşisi
- Fotoğraf modu **primary** (büyük, ortalanmış, altın accent, "En doğru sonuç" etiketi).
- Metin + Nota modları "Başka yöntemler" altında ikincil linkler.
- İlk kez gelen kullanıcıya 1 kez gösterilen coach-mark: "Şişe fotoğrafını çek, 5 saniyede analiz edelim."

### 6.2 Analiz Sonuçları — Progressive Disclosure
Yeni yapı (tek sayfa, scroll-driven):

1. **Hero (fold üstü):** Parfüm kimliği + marka logosu + confidence ring + 3 ana nota chip'i + "Paylaş / Kaydet".
2. **Piramit:** Üst/Kalp/Dip notalar (mevcut WheelPanel'i simplify et, ilk görünüşte sade).
3. **Moleküler Profil (accordion kapalı):** Açıldığında molekül listesi + evidence level'lar.
4. **Benzer Parfümler:** 3 kart (Pro değilse 3, Pro ise 10) + "Daha Fazla Gör" (Pro upsell).
5. **Nereden Aldın? / Gardıroba Ekle** CTA.
6. **Detaylı İnceleme** (accordion): uzun açıklama, sillage/longevity, mevsim uygunluk.

### 6.3 Confidence Skoru Görselleştirmesi
- Sayı + ring (SVG, 0-100 arası dolu yay).
- Renk kuşakları: 0-40 kırmızımsı, 40-70 kehribar, 70-100 altın.
- Etiket: "Düşük güven — yeniden çek önerilir" / "Orta güven" / "Yüksek güven".
- Tooltip: "Bu skor nasıl hesaplanıyor?" → formül sayfasına link.

### 6.4 Pro Upsell (UI-only, Billing hariç)
- Analiz sonucu geldiğinde contextual CTA: "Bu parfümün 7 benzeri daha var. Pro'da tamamını gör."
- Blur + lock icon yerine: tease preview (2-3 saniye göster → fade to blur).
- Pricing sayfasında karşılaştırma tablosu (ücretsiz vs pro), özellik bazlı, concrete değerler.
- **Not:** Checkout butonu mevcut billing akışına bağlansın (ona dokunma), ama UX'i temiz olsun.

### 6.5 Mikro-etkileşimler
- Analiz loading: skeleton + "Notaları tanımlıyorum..." gibi dinamik mesajlar (spinner yerine).
- Başarılı analiz: confetti mi, haptic success mi — premium hissiyatı bozmadan kutla.
- Hata durumu: sarsıntılı input değil, empatik mesaj ("Fotoğraf biraz bulanık görünüyor, tekrar deneyelim mi?").

### 6.6 Accessibility
- WCAG AA minimum: kontrast, aria-label, keyboard nav.
- Dark mode zaten default, light mode **eklenmesin** (brand identity).
- Dinamik font size desteği (Capacitor `@capacitor/device` + respects OS setting).
- Reduce motion preference'e uyum (Framer Motion `useReducedMotion`).

---

## 7. FAZ 5 — MOBİL UYGULAMA (Play Store)

### 7.1 Capacitor Optimizasyonu
- `capacitor.config.ts`:
  - `backgroundColor: '#0A0A0A'` (splash flash'ı önle)
  - Android `webContentsDebuggingEnabled: false` (prod)
  - `allowMixedContent: false`
- Splash screen: dark background, ortada logo, `launch_showDuration: 1500`, `launch_autoHide: false`, programatik hide (uygulama ready olunca).
- Status bar: dark theme, style `DARK`.

### 7.2 Native Plugin'ler
- `@capacitor/camera` — fotoğraf çekme (HEIC handle)
- `@capacitor/share` — analiz paylaşımı
- `@capacitor/haptics` — feedback
- `@capacitor/preferences` — secure storage
- `@capacitor/push-notifications` — altyapı kur (henüz kullanma, sonra Pro upsell için)
- `@capacitor-community/barcode-scanner` veya MLKit — native barkod

### 7.3 Permissions (Android)
- `CAMERA` — barkod + parfüm fotoğrafı
- `INTERNET`, `ACCESS_NETWORK_STATE`
- Rationale diyalogları: kullanıcıya **neden** istendiğini anlatan custom bottom sheet (sistem dialog'undan önce).

### 7.4 Play Store Hazırlığı
- **Keystore:** `keystore.jks` oluştur (SHA alı ayrı not al, **asla** repo'ya commit etme, `.gitignore` doğrula).
- `docs/play_store_submission.md`:
  - App name, short description (80 char), full description (4000 char)
  - Screenshot listesi (Pixel 7 Pro boyutu, min 2 / max 8)
  - Feature graphic (1024×500)
  - App icon (512×512 PNG, adaptive icon için foreground+background XML)
  - Privacy Policy URL (zorunlu)
  - Content rating questionnaire cevapları
  - Data safety formu (hangi veriler toplanıyor, nereye gidiyor)
- `android/app/build.gradle`:
  - `versionCode`, `versionName` semantik.
  - `minSdkVersion: 24`, `targetSdkVersion: 34` (2026 için geçerli güncel hedef).
  - ProGuard/R8 minify + shrink resources.
- Internal testing track'e yükle, 3 test cihazında smoke test yap.

### 7.5 Crashlytics / Telemetry
- Sentry (veya Firebase Crashlytics) kur — native + web layer.
- Core events: `analysis_started`, `analysis_completed`, `analysis_failed`, `pro_clicked`, `share_clicked`, `barcode_scanned`.

---

## 8. FAZ 6 — SEO VE GROWTH

### 8.1 SEO Temeli
- `robots.txt`, `sitemap.xml` (dinamik, analyses + perfumes).
- Her sayfa: unique title, meta description, canonical, OG + Twitter card.
- `/analiz/[slug]` ISR ile, `revalidate: 3600`.
- JSON-LD:
  - Home: `Organization`
  - Parfüm sayfaları: `Product` + `AggregateRating`
  - Analizler: `Article` + `Review`

### 8.2 Referral Altyapısı (Billing bağlamayı bırak)
- `referrals` tablosu + unique `referral_code`.
- `/davet/[code]` landing sayfası.
- **UI'yi hazırla, reward logic'i şimdilik no-op** — "14 gün Pro kazanacaksın" metni ama gerçek entitlement mutation'u billing bitince bağlanacak. TODO comment'i ile işaretle.

### 8.3 Content Sayfaları
- `/hakkinda` — ürünü anlatan manifesto-style sayfa.
- `/nasil-calisir` — teknolojiyi anlatan (Gemini vision + molekül DB).
- `/blog` — infra hazır bırak (MDX), ilk 3 yazı placeholder.

---

## 9. FAZ 7 — TEKNİK BORÇ

### 9.1 analyze.js Refactor
`api_internal/analyze.js` şu yapıya bölünsün:

```
api_internal/
├── analyze.ts (orchestrator, <150 satır)
├── services/
│   ├── QuotaService.ts
│   ├── LLMRouter.ts (Gemini + fallback provider)
│   ├── ResultNormalizer.ts (Zod ile validate + transform)
│   ├── PersistenceService.ts (DB write)
│   ├── CacheService.ts (idempotency)
│   └── TelemetryService.ts
├── schemas/
│   └── analysis.ts
└── prompts/
    └── analyze_v3.md
```

Her service pure, unit test edilebilir, dependency injection ile.

### 9.2 TypeScript Migration (Selektif)
- `api_internal/analyze.js` → `.ts` **zorunlu**
- `api_internal/billing.js` → **dokunma** (kapsam dışı)
- Yeni yazılan her şey `.ts`
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`

### 9.3 Test Altyapısı
- Vitest kur.
- Minimum test coverage:
  - `ResultNormalizer`: 10 fixture (farklı LLM çıktıları) → doğru parse.
  - `QuotaService`: 5 senaryo (free/pro/abuse).
  - `RAG search`: 5 gerçek parfüm query → expected top-3 eşleşme.
- `npm test` CI'da koşsun (GitHub Actions workflow'u ekle).

### 9.4 Environment ve Secrets
- `.env.example` güncelle (tüm değişkenler listeli).
- Vercel/Netlify prod env'leri: `docs/deployment.md`'de checklist.
- Secret rotation prosedürü yaz.

---

## 10. KALİTE KAPILARI (Her Faz Sonunda)

Her faz bitmeden aşağıdaki checklist geçilmeli:

- [ ] `npm run build` hatasız geçiyor.
- [ ] `npm run lint` 0 warning.
- [ ] `npm test` yeşil.
- [ ] `npm run mobile:build:web && npm run mobile:sync` başarılı.
- [ ] Android emülatörde smoke test (5 dk kullanım, crash yok).
- [ ] Lighthouse mobile: Performance >90, Accessibility >95, SEO >95.
- [ ] Değişikliklerin özeti `CHANGELOG.md`'ye yazıldı.

---

## 11. TESLİM ÇIKTILARI (Görev sonunda hazır olması gerekenler)

1. **Çalışan uygulama:** `npm run dev` + Android emulator'de tüm flow'lar hatasız.
2. **Release APK:** `android/app/release/app-release.aab` Play Store'a yüklenebilir.
3. **Dokümantasyon:**
   - `docs/architecture.md` — genel yapı
   - `docs/confidence_formula.md` — skor hesabı
   - `docs/rag_tuning.md` — RAG parametreleri
   - `docs/play_store_submission.md` — store assets + metin
   - `docs/deployment.md` — prod deploy adımları
   - `docs/email_setup.md` — SPF/DKIM
   - `CHANGELOG.md` — tüm değişikliklerin özeti
4. **Test suite:** Minimum coverage yukarıdaki gibi.
5. **TODO listesi:** Billing bağlanınca yapılacakları tek dosyada topla (`TODO_BILLING.md`) — referral reward, pro entitlement hook'ları vs.

---

## 12. ÇALIŞMA METODU

1. **Önce analiz:** Her fazın başında ilgili kod tabanını oku, varsayımları doğrula.
2. **Sonra plan:** O fazın alt görevlerini TODO olarak çıkar, onay bekleme, ilerle.
3. **Küçük commit'ler:** Her alt görev kendi commit'i (`feat(auth): add login page`, `fix(llm): add zod validation`).
4. **Her fazın sonunda:** Kalite kapısını geç, kısa özet ver, bir sonraki faza geç.
5. **Takıldığında:** Tahmin etme — grep/read ile araştır. Hâlâ bilinmezlik varsa **açık soru sor** (sadece gerçekten blocker olduğunda).

---

## 13. ÖNCELİK SIRASI

Faz 1 → Faz 2 → Faz 3 → Faz 5 (mobil) → Faz 4 (tasarım) → Faz 6 (SEO) → Faz 7 (teknik borç).

**Rationale:** Blokerlar önce. Sonra veri doğruluğu (ürünün kalbi). Sonra fonksiyonel boşluklar. Mobil lansman için paralel olarak Faz 5'e geç — tasarım iyileştirmesi mobil polish ile birlikte yapılsın. SEO ve teknik borç son, çünkü büyümeyi/sürdürülebilirliği etkiler ama lansmana engel değil.
