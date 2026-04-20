# TODO — Billing Bağlandığında Yapılacaklar

> Bu dosya, billing provider (Paddle/Stripe) entegrasyonu tamamlandıktan sonra
> bağlanması gereken tüm UI ve logic parçalarını içerir.
> Her faz çalışmasında bulunan billing hook'ları buraya not edilir.

---

## Referral Reward Logic

- `/davet/[code]` landing sayfası hazır (Faz 6'da yapılacak) ancak reward logic no-op
- `referrals` tablosunda `reward_granted_at` kolonu boş kalacak
- Billing bağlanınca: kullanıcı ilk ödeme yaptığında referral sahibine 14 gün Pro grant et
- İlgili dosyalar: `app/davet/[code]/page.tsx`, `api_internal/referrals.ts` (oluşturulacak)
- TODO marker: `// TODO_BILLING: grant referral reward after first payment`

---

## Pro Entitlement Hooks

- `useUserStore.setPro(true)` şu an webhook'tan çağrılıyor (`api_internal/billing-webhook.js`)
- UI tarafı hazır: Pro flag'i doğru okunuyor, lock state'ler çalışıyor
- Billing bağlanınca doğrulanacak: webhook tetiklendiğinde Supabase `users.is_pro` güncelleniyor mu?
- İlgili dosyalar: `api_internal/billing-webhook.js` (dokunma!), `lib/store/userStore.ts`

---

## Checkout Flow Tests

- `/paketler` sayfasındaki "Satın Al" butonları mevcut checkout flow'a bağlı
- Billing bağlanınca: gerçek ödeme → webhook → Pro aktivasyon → UI güncelleme akışı test edilmeli
- Test senaryoları:
  - [ ] Başarılı ödeme → is_pro=true → sınırsız analiz
  - [ ] Başarısız ödeme → is_pro=false kalır
  - [ ] Abonelik iptali → is_pro=false → degraded gracefully
  - [ ] Ödeme retry → duplicate Pro grant olmamalı

---

## Webhook Verification

- `api_internal/billing-webhook.js` — dokunma, kapsam dışı
- Billing bağlanınca: Paddle/Stripe signature doğrulaması eklenmeli
- Güvenlik notu: webhook endpoint'i rate limit ve signature check olmadan prod'da çalışmamalı

---

## Notlar

- Bu dosyaya her faz sonunda ilgili TODO'lar eklenir
- Billing çalışmalarına başlamadan önce bu dosyayı tüm geliştirici ekibiyle paylaş
- `api_internal/billing.js` ve `api_internal/billing-webhook.js` dosyalarına
  lansman öncesi **dokunulmayacak**
