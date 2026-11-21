import { test, expect } from '@playwright/test';

const password = 'a unique test vault password';
const unlock = async (page, value = password) => {
  await page.getByLabel('Master password').fill(value);
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
};
const create = async (page, name, value = password, first = false) => {
  await page.getByRole('button', { name: first ? 'Create your first vault' : 'Create another vault', exact: true }).click();
  await page.getByLabel('Vault name').fill(name);
  await page.getByLabel('New vault password').fill(value);
  await page.getByLabel('Confirm vault password').fill(value);
  await page.getByRole('button', { name: 'Create vault', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
};
const lock = async (page) => {
  await page.getByRole('button', { name: 'Lock and switch vaults', exact: true }).click();
  await expect(page.getByLabel('Master password')).toBeVisible();
};
const cache = (page) => page.evaluate(async () => (await import('/src/utils/localStore.js')).getOfflineSnapshot());

test('light theme creation, verified unlock, encrypted CRUD cache and logout', async ({ page }) => {
  await page.goto('/tests/ui/vault.html?theme=light');
  await page.getByRole('button', { name: 'Create your first vault', exact: true }).click();
  await page.getByLabel('Vault name').fill('Personal');
  await page.getByLabel('New vault password').fill(password);
  await page.getByLabel('Confirm vault password').fill('different long password');
  await page.getByRole('button', { name: 'Create vault', exact: true }).click();
  await expect(page.getByText('The passwords do not match. Please try again.')).toBeVisible();
  expect(await page.evaluate(() => window.__vaultFixture.vaults.length)).toBe(0);
  await expect(page.locator('.MuiDialog-container')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: '../Artifacts/VaultAccessUI/light-create.png', fullPage: true });
  await page.getByLabel('Confirm vault password').fill(password);
  await page.getByRole('button', { name: 'Create vault', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Personal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save sample note' }).click();
  await expect(page.getByText('Synthetic private content', { exact: true })).toBeVisible();
  const sealedCache = JSON.stringify(await cache(page));
  expect(sealedCache).not.toContain('Synthetic private');
  expect(sealedCache).not.toContain(password);
  expect(sealedCache).not.toContain('Personal');
  await page.getByRole('button', { name: 'Edit sample' }).click();
  await expect(page.getByText('Updated synthetic private content', { exact: true })).toBeVisible();
  await lock(page);
  await unlock(page, 'mistyped password');
  await expect(page.getByText('Password not recognized', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.__vaultFixture.vaults.length)).toBe(1);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await unlock(page);
  await expect(page.getByText('Updated synthetic private content', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete sample' }).click();
  await expect(page.getByText('Updated synthetic private content', { exact: true })).toHaveCount(0);
  expect((await cache(page)).notes).toHaveLength(0);
  await page.getByRole('button', { name: 'Sign out fixture' }).click();
  await expect(page.getByText('Fixture signed out')).toBeVisible();
  expect(await cache(page)).toEqual({ userId: null, vaults: [], notes: [] });
  const requests = await page.evaluate(() => JSON.stringify(window.__vaultFixture.requests));
  expect(requests).not.toContain(password);
  expect(requests).not.toContain('Synthetic private');
});

test('dark mobile vaults remain separate and identical passwords offer an explicit choice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/ui/vault.html');
  await create(page, 'Personal', password, true);
  await page.getByRole('button', { name: 'Save sample note' }).click();
  await expect(page.getByText('Synthetic private content', { exact: true })).toBeVisible();
  await lock(page);
  await create(page, 'Work');
  await expect(page.getByText('Synthetic private content', { exact: true })).toHaveCount(0);
  await lock(page);
  await expect(page.locator('.MuiDialog-container')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('dialog')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: '../Artifacts/VaultAccessUI/dark-mobile-unlock.png', fullPage: true });
  await unlock(page);
  await expect(page.getByText('Choose your vault', { exact: true })).toBeVisible();
  await expect(page.locator('.MuiDialog-container')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '../Artifacts/VaultAccessUI/dark-mobile-choice.png', fullPage: true });
  await page.getByRole('button', { name: 'Personal', exact: true }).click();
  await expect(page.getByText('Synthetic private content', { exact: true })).toBeVisible();
  await lock(page);
  await create(page, 'Separate', 'a completely different password');
  await lock(page);
  await unlock(page, 'a completely different password');
  await expect(page.getByRole('heading', { name: 'Separate', exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic private content', { exact: true })).toHaveCount(0);
  expect((await cache(page)).vaults).toHaveLength(3);
});

test('legacy recovery registers only authenticated matching records without changing ciphertext', async ({ page }) => {
  await page.goto('/tests/ui/vault.html?legacy=1');
  await unlock(page, 'wrong password');
  await expect(page.getByText('Password not recognized', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__vaultFixture.vaults.length)).toBe(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await unlock(page, 'old-pass');
  await expect(page.getByText('Historic content 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Historic content 2', { exact: true })).toHaveCount(0);
  const unchanged = await page.evaluate(() => window.__vaultFixture.notes.every((note, index) => ['name', 'content', 'category'].every((field) => note[field] === window.__vaultFixture.originalNotes[index][field])));
  expect(unchanged).toBe(true);
  expect(await page.evaluate(() => window.__vaultFixture.notes.filter((note) => !note.vaultId).length)).toBe(1);
  await lock(page);
  await unlock(page, 'other-old-pass');
  await expect(page.getByText('Historic content 2', { exact: true })).toBeVisible();
  await expect(page.getByText('Historic content 1', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__vaultFixture.vaults.length)).toBe(2);
});

test('catalog failures never offer vault creation until a successful retry', async ({ page }) => {
  await page.goto('/tests/ui/vault.html?fail=1');
  await expect(page.getByText('Encrypted vault service is unavailable.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Create/ })).toHaveCount(0);
  await page.evaluate(() => { window.__vaultFixture.failCatalog = false; });
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByRole('button', { name: 'Create your first vault', exact: true })).toBeVisible();
});

test('cached wrapped-key vaults unlock read-only offline with the same password', async ({ page }) => {
  await page.goto('/tests/ui/vault.html?theme=light');
  await create(page, 'Cached', password, true);
  await page.getByRole('button', { name: 'Save sample note' }).click();
  await expect(page.getByText('Synthetic private content', { exact: true })).toBeVisible();
  await page.goto('/tests/ui/vault.html?theme=light&view=offline');
  await unlock(page, 'wrong');
  await expect(page.getByText('Password not recognized', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Create/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await unlock(page);
  await expect(page.getByText('Offline: Cached')).toBeVisible();
  await expect(page.getByText('Synthetic private title', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lock Vault', exact: true }).click();
  await expect(page.getByLabel('Master password')).toBeVisible();
});

test('an interrupted creation retries the same encrypted envelope', async ({ page }) => {
  await page.goto('/tests/ui/vault.html?interrupt=1');
  await page.getByRole('button', { name: 'Create your first vault', exact: true }).click();
  await page.getByLabel('Vault name').fill('Retryable');
  await page.getByLabel('New vault password').fill(password);
  await page.getByLabel('Confirm vault password').fill(password);
  await page.getByRole('button', { name: 'Create vault', exact: true }).click();
  await expect(page.getByText('The response was interrupted. Retry this vault.')).toBeVisible();
  await page.getByRole('button', { name: 'Retryable', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Retryable', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__vaultFixture.vaults.length)).toBe(1);
});

test('changing accounts cancels an in-flight unlock before plaintext or cache activation', async ({ page }) => {
  await page.goto('/tests/ui/vault.html');
  await create(page, 'Personal', password, true);
  await page.getByRole('button', { name: 'Save sample note' }).click();
  await expect(page.getByText('Synthetic private content', { exact: true })).toBeVisible();
  await lock(page);
  await page.evaluate(() => { window.__vaultFixture.delayNotes = true; });
  await unlock(page);
  await expect.poll(() => page.evaluate(() => typeof window.__vaultFixture.releaseNotes)).toBe('function');
  await page.evaluate(() => { window.__setFixtureUser(null); window.__vaultFixture.releaseNotes(); });
  await expect(page.getByText('Fixture signed out')).toBeVisible();
  await expect(page.getByText('Synthetic private content', { exact: true })).toHaveCount(0);
  await expect.poll(async () => (await cache(page)).notes.length).toBe(0);
});
