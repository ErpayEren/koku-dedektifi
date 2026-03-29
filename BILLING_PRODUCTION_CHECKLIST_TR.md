# Billing Production Checklist (TR)

Bu dosya, Koku Dedektifi icin production billing kurulumunu hizli tamamlamak icindir.

## 1) Gerekli Env Degiskenleri

Temel:
- `BILLING_PROVIDER=manual` veya `BILLING_PROVIDER=stripe` veya `BILLING_PROVIDER=paddle`
- `BILLING_PRICE_PRO`
- `BILLING_CURRENCY`
- `BILLING_INTERVAL`
- `BILLING_WEBHOOK_SECRET`
- `BILLING_WEBHOOK_SIGNATURE_HEADER` (default: `x-billing-signature`)

Manual provider:
- `BILLING_CHECKOUT_URL_PRO`

Stripe provider:
- `BILLING_PROVIDER=stripe`
- `BILLING_STRIPE_SECRET_KEY`
- `BILLING_STRIPE_PRICE_ID_PRO`
- `BILLING_STRIPE_SUCCESS_URL`
- `BILLING_STRIPE_CANCEL_URL`
- `BILLING_WEBHOOK_STRIPE_TOLERANCE_SEC` (onerilen: `300`)

Paddle provider:
- `BILLING_PROVIDER=paddle`
- `BILLING_PADDLE_API_KEY`
- `BILLING_PADDLE_PRICE_ID_PRO`
- `BILLING_PADDLE_CHECKOUT_URL` (onerilen: `https://koku-dedektifi.vercel.app`)
- `BILLING_WEBHOOK_PADDLE_TOLERANCE_SEC` (onerilen: `300`)

## 2) Webhook Endpoint

- Endpoint: `/api/billing-webhook`
- Desteklenen imzalar:
  - Generic: `x-billing-signature: sha256=<hex>`
  - Stripe: `stripe-signature: t=<unix>,v1=<hex>`
  - Paddle: `paddle-signature: ts=<unix>;h1=<hex>`
- Idempotency: webhook event `id` ile duplicate isleme korunur.

## 3) Stripe Event Map

Asagidaki Stripe eventleri ic billing event tiplerine map edilir:
- `checkout.session.completed` -> `subscription.activated`
- `customer.subscription.created` -> `subscription.activated`
- `customer.subscription.updated` -> `subscription.updated`
- `customer.subscription.deleted` -> `subscription.canceled`
- `invoice.payment_failed` -> `subscription.payment_failed`
- `invoice.paid` -> `subscription.renewed`

## 3.1) Checkout Donus URL Davranisi

- `BILLING_STRIPE_SUCCESS_URL` sayfasina `?billing=success` parametresi ekleyebilirsin.
- `BILLING_STRIPE_CANCEL_URL` sayfasina `?billing=cancel` parametresi ekleyebilirsin.
- Web uygulamasi bu parametreleri algilar, toast gosterir ve plan durumunu otomatik yeniler.

## 4) Canliya Alma Kontrol Listesi

1. Production envleri Vercel uzerinde set et.
2. Stripe dashboard webhook URL'ini `/api/billing-webhook` olarak ekle.
3. Webhook secret'i `BILLING_WEBHOOK_SECRET` olarak set et.
4. `GET /api/billing-health` ile env readiness kontrolunu yap.
5. Test odeme ile `start_checkout` akisini dogrula.
6. Test webhook ile entitlement degisiminin `GET /api/billing` cevabina yansidigini kontrol et.
7. `BILLING_ALLOW_DEV_ACTIVATION=false` oldugundan emin ol.
