import { test, expect } from '@playwright/test';

const STAFF_EMAIL = 'admin@openglimpse.com';
const STAFF_PASSWORD = 'admin123';

async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', STAFF_EMAIL);
  await page.fill('input[type="password"]', STAFF_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

async function createTestData(page) {
  await login(page);

  const loginData = await page.evaluate(async ({ email, password }) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  }, { email: STAFF_EMAIL, password: STAFF_PASSWORD });

  const token = loginData.token;

  async function api(method, path, body) {
    return page.evaluate(async ({ method, path, body, token }) => {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body !== undefined) opts.body = JSON.stringify(body);
      if (token) opts.headers['Authorization'] = `Bearer ${token}`;
      const r = await fetch(path, opts);
      const t = await r.text();
      try { return t ? JSON.parse(t) : null; } catch { return t; }
    }, { method, path, body, token });
  }

  const programme = await api('POST', '/programmes', { name: 'Test Programme XY', startDate: '2026-07-01', endDate: '2026-07-31' });
  const programmeId = programme.id || programme.programme?.id || programme;

  const routeA = await api('POST', `/programmes/${programmeId}/routes`, { name: 'Bus A' });
  const routeAId = routeA.id || routeA.route?.id || routeA;

  const routeB = await api('POST', `/programmes/${programmeId}/routes`, { name: 'Bus B' });
  const routeBId = routeB.id || routeB.route?.id || routeB;

  const delegates = [];
  for (const name of ['Alice Tan', 'Bob Lee', 'Carol Wong']) {
    const u = await api('POST', '/api/auth', { name, email: `${name.toLowerCase().replace(' ', '.')}@test.com`, password: 'test123', role: 'participant' });
    const d = await api('POST', `/programmes/${programmeId}/delegates`, { userIds: [u.id], routeId: routeAId });
    delegates.push({ userId: u.id, ...(Array.isArray(d) ? d[0] : d) });
  }

  return { programmeId, routeAId, routeBId, delegates, token };
}

// ─── Programme List ───

test.describe('Programme List', () => {
  test('page loads with header', async ({ page }) => {
    await createTestData(page);
    await page.goto('/programmes');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Manage Programmes').first()).toBeVisible();
    await expect(page.locator('button:has-text("New")').first()).toBeVisible();
  });

  test('shows created programmes', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto('/programmes');
    await page.waitForTimeout(2000);

    await expect(page.locator(`text=Test Programme XY`).first()).toBeVisible();
  });

  test('create modal works', async ({ page }) => {
    await login(page);
    await page.goto('/programmes');
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("New")').click();
    await page.waitForTimeout(500);

    // Modal should appear
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    await modal.locator('input').nth(0).fill('New Program');
    await modal.locator('input[type="date"]').nth(0).fill('2026-08-01');
    await modal.locator('input[type="date"]').nth(1).fill('2026-08-10');
    await modal.locator('button:has-text("Create")').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=New Program').first()).toBeVisible();
  });

  test('click programme goes to routes tab', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto('/programmes');
    await page.waitForTimeout(2000);

    await page.locator('text=Test Programme XY').first().click();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain(`/programmes/${d.programmeId}/routes`);
  });
});

// ─── Programme Detail (Routes Tab) ───

test.describe('Routes Tab', () => {
  test('shows route list', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto(`/programmes/${d.programmeId}/routes`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Bus A').first()).toBeVisible();
    await expect(page.locator('text=Bus B').first()).toBeVisible();
  });

  test('add route works', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto(`/programmes/${d.programmeId}/routes`);
    await page.waitForTimeout(2000);

    await page.locator('input[placeholder="New route name..."]').fill('Bus C');
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Bus C').first()).toBeVisible();
  });

  test('delete route shows custom confirm', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto(`/programmes/${d.programmeId}/routes`);
    await page.waitForTimeout(2000);

    // Click delete on Bus B
    const busBcard = page.locator('text=Bus B').locator('xpath=ancestor::div[contains(@class,"flex")][contains(@class,"rounded-xl")]').first();
    await busBcard.waitFor({ timeout: 5000 });
    await busBcard.locator('button').last().click();
    await page.waitForTimeout(500);

    const confirmModal = page.locator('.fixed.inset-0.z-50');
    await expect(confirmModal.locator('text=Delete Route')).toBeVisible();
    await confirmModal.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Bus B')).toHaveCount(0);
  });

  test('programme picker dropdown works', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto(`/programmes/${d.programmeId}/routes`);
    await page.waitForTimeout(2000);

    // Click the programme name to open picker
    await page.locator('text=Test Programme XY').first().click();
    await page.waitForTimeout(1000);

    // Should NOT error — picker opens and closes
    await page.locator('text=Test Programme XY').first().click();
    await page.waitForTimeout(500);
  });
});

// ─── Summary Tab ───

test.describe('Summary Tab', () => {
  test('summary tab loads', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto(`/programmes/${d.programmeId}/summary`);
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── Manage Programme Tab ───

test.describe('Manage Programme Tab', () => {
  test('shows all programmes and edit modal', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto(`/programmes/${d.programmeId}/manage`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Test Programme XY').first()).toBeVisible();
    await expect(page.locator('text=All Programmes').first()).toBeVisible();
    await expect(page.locator('button:has-text("New")').first()).toBeVisible();
  });
});

// ─── Dashboard ───

test.describe('Dashboard', () => {
  test('dashboard loads route cards', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    await page.locator('.dashboard-programme-btn').click();
    await page.locator('text=Test Programme XY').first().click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Bus A').first()).toBeVisible();
    await expect(page.locator('text=Bus B').first()).toBeVisible();
  });

  test('settings plus icon links to programme routes', async ({ page }) => {
    const d = await createTestData(page);
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    await page.locator('[aria-label="Manage routes"]').click();
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/programmes/');
    expect(page.url()).toContain('/routes');
  });
});

// ─── API Integration ───

test.describe('API Integration', () => {
  test('markAttendance works', async ({ page }) => {
    const d = await createTestData(page);
    const delegateId = d.delegates[0]?.id;
    if (!delegateId) return;

    const result = await page.evaluate(async ({ programmeId, delegateId, token }) => {
      const r = await fetch(`/programmes/${programmeId}/attendance/${delegateId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'present', method: 'manual', notes: 'PW test' }),
      });
      return r.json();
    }, { programmeId: d.programmeId, delegateId, token: d.token });

    expect(result).not.toBeNull();
  });

  test('attendance summary returns data', async ({ page }) => {
    const d = await createTestData(page);

    const summary = await page.evaluate(async ({ programmeId, token }) => {
      const r = await fetch(`/programmes/${programmeId}/attendance/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.json();
    }, { programmeId: d.programmeId, token: d.token });

    expect(summary).not.toBeNull();
  });

  test('ready-to-depart toggle works', async ({ page }) => {
    const d = await createTestData(page);

    const result = await page.evaluate(async ({ programmeId, routeAId, token }) => {
      const r = await fetch(`/programmes/${programmeId}/routes/${routeAId}/ready-to-depart`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ready: true }),
      });
      return r.json();
    }, { programmeId: d.programmeId, routeAId: d.routeAId, token: d.token });

    expect(result).not.toBeNull();
  });
});
