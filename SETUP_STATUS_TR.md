# Koku Dedektifi - Setup Durumu (TR)

Bu dokuman, istenen 5 basligi repo icinde nasil tamamladigimizi ozetler.

## 1) .env.local olusturma

- `.env.local`, `.env.example` ile hizalandi.
- Bu dosya `.gitignore` kapsaminda, repoya commit edilmiyor.
- Doldurulmasi gereken kritik alanlar:
  - `GEMINI_API_KEY`
  - `OPS_PASSWORD`
  - (Cloud persistence isteniyorsa) `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - (Billing secimine gore) `BILLING_*`

## 2) Supabase setup (database + auth)

Repo tarafinda hazir:
- SQL schema: `docs/supabase_schema.sql`
- Sunucu config: `lib/server/supabase-config.js`
- Auth users adapter: `lib/server/supabase-auth-users.js`

Yapilacaklar:
1. Supabase projesi ac.
2. `docs/supabase_schema.sql` dosyasini SQL editor'da calistir.
3. Envleri ekle:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (opsiyonel alias) `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
4. Gerekirse strict moda al:
   - `WARDROBE_REQUIRE_SUPABASE=true`
   - `FEED_REQUIRE_SUPABASE=true`

## 3) Flutter SDK / mobil plugin hazirligi

Repo tarafinda hazir:
- Wrapper script: `flutterw.ps1`, `flutterw.cmd`
- Bootstrap script: `mobile_flutter/bootstrap_flutter.ps1`
- Mobil app: `mobile_flutter/`

Calistirma:
```powershell
cd mobile_flutter
..\flutterw.cmd pub get
..\flutterw.cmd run -d android
```

Not: Yerel `flutter_sdk/flutter/bin/flutter.bat` yoksa sistemde Flutter kurulu olmalidir.

## 4) RevenueCat (opsiyonel)

- Web urun akisi RevenueCat'e bagli degil.
- Mobilde RevenueCat sadece opsiyonel bridge parametresi olarak tanimlandi.
- Gerekiyorsa env:
  - `MOBILE_BILLING_PROVIDER=revenuecat`
  - `MOBILE_REVENUECAT_PUBLIC_SDK_KEY=<key>`

## 5) Billing production checklist

- Dosya mevcut: `BILLING_PRODUCTION_CHECKLIST_TR.md`
- Health endpoint mevcut: `/api/billing-health`

Ek kontrol komutu:
```powershell
npm run check:readiness
```

Bu komut:
- `.env.local`
- Supabase env + schema varligi
- Flutter wrapper/SDK varligi
- RevenueCat opsiyonel durumu
- Billing checklist + provider env eksiklerini tek ciktiyla raporlar.
