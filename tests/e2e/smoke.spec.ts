import { expect, test } from '@playwright/test';

const ONBOARDING_KEY = 'kd:onboarding:v1';

function onboardingPayload() {
  return {
    season: 'Sonbahar',
    stance: 'Sakin',
    intensity: 'Orta',
    completedAt: '2026-04-03T00:00:00.000Z',
  };
}

test.describe('Koku Dedektifi smoke', () => {
  test('ilk ziyaret onboarding tercihlerinin kaydedilmesini saglar', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, ONBOARDING_KEY);

    await page.goto('/');

    await expect(page.getByTestId('onboarding-wizard')).toBeVisible();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByRole('button', { name: /Sonbahar/i }).click();
    await page.getByRole('button', { name: /Sakin/i }).click();
    await page.getByRole('button', { name: /Orta/i }).click();
    await page.getByTestId('onboarding-finish').click();

    await expect(page.getByTestId('onboarding-wizard')).toHaveCount(0);

    const stored = await page.evaluate((key) => window.localStorage.getItem(key), ONBOARDING_KEY);
    expect(stored).toContain('Sonbahar');
    expect(stored).toContain('Sakin');
    expect(stored).toContain('Orta');
  });

  test('ana sayfa hero ve molekul onizleme ile yuklenir', async ({ page }) => {
    await page.addInitScript(
      ({ key, payload }) => {
        window.localStorage.setItem(key, JSON.stringify(payload));
      },
      { key: ONBOARDING_KEY, payload: onboardingPayload() },
    );

    await page.goto('/');

    await expect(page.getByText(/Bir koku anlat/i)).toBeVisible();
    await expect(page.getByTestId('molecule-preview-strip')).toBeVisible();
    await expect(page.getByTestId('molecule-preview-card')).toHaveCount(3);
  });

  test('molekul detay sayfasi ambroxide icin acilir', async ({ page }) => {
    await page.goto('/molekuller/ambroxide');

    await expect(page.getByRole('heading', { name: /Ambroxide/i })).toBeVisible();
    await expect(page.getByText(/CAS:/i)).toBeVisible();
  });

  test('notalar sayfasinda arama ile molekuller filtrelenir', async ({ page }) => {
    await page.goto('/notalar');

    const searchInput = page.getByTestId('molecule-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('rose');

    await expect(page.getByTestId('molecule-results-count')).not.toHaveText('0');
    await expect(
      page.getByRole('heading', { name: /Geraniol|Citronellol|Phenethyl alcohol|Rose oxide/i }).first(),
    ).toBeVisible();
  });

  test('paketler sayfasi free ve pro planlarini gosterir', async ({ page }) => {
    await page.goto('/paketler');

    await expect(page.getByText(/Moleküler keşfi|Molekuler kesfi/i)).toBeVisible();
    await expect(page.getByText(/Ucretsiz|Ücretsiz/i)).toBeVisible();
    await expect(page.getByText(/^Pro$/)).toBeVisible();
  });
});
