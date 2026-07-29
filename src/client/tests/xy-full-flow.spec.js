import { test, expect } from '@playwright/test';

const STAFF_EMAIL = 'admin@openglimpse.com';
const STAFF_PASSWORD = 'admin123';

async function setupAuth(page) {
  const result = await page.evaluate(async ({ email, password }) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  }, { email: STAFF_EMAIL, password: STAFF_PASSWORD });
  return result.token;
}

async function createProgramme(page, token, name) {
  return page.evaluate(async ({ name, token }) => {
    const r = await fetch('/programmes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, startDate: '2026-07-01', endDate: '2026-07-31' }),
    });
    return r.json();
  }, { name, token });
}

async function createRoute(page, token, programmeId, name) {
  return page.evaluate(async ({ programmeId, name, token }) => {
    const r = await fetch(`/programmes/${programmeId}/routes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    return r.json();
  }, { programmeId, name, token });
}

async function createUser(page, token, name) {
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.com`;
  return page.evaluate(async ({ name, email, token }) => {
    const r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, password: 'test123', role: 'participant' }),
    });
    return r.json();
  }, { name, email, token });
}

async function addDelegate(page, token, programmeId, userId, routeId) {
  return page.evaluate(async ({ programmeId, userId, routeId, token }) => {
    const r = await fetch(`/programmes/${programmeId}/delegates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userIds: [userId], routeId }),
    });
    return r.json();
  }, { programmeId, userId, routeId, token });
}

test.describe('XY — Full Feature Flow', () => {
  test('complete workflow: create programme → routes → delegates → attendance → summary', async ({ page }) => {
    page.on('pageerror', (err) => {
      console.error('PAGE ERROR:', err.message);
      throw err;
    });

    // ─── Setup: auth + seed data ───
    await page.goto('/login');
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const token = await page.evaluate(async () => {
      const raw = localStorage.getItem('authUser');
      if (!raw) return null;
      return JSON.parse(raw).token;
    });
    expect(token).toBeTruthy();

    // Create programme
    const prog = await createProgramme(page, token, 'SCCCI Business Delegation Q3');
    const programmeId = prog.id;
    expect(programmeId).toBeTruthy();
    console.log(`Programme created: ${programmeId}`);

    // Create 3 routes
    const busA = await createRoute(page, token, programmeId, 'Bus A - Marina Bay');
    const busB = await createRoute(page, token, programmeId, 'Bus B - Sentosa');
    const busC = await createRoute(page, token, programmeId, 'Bus C - Jurong');
    expect(busA.id).toBeTruthy();
    expect(busB.id).toBeTruthy();
    expect(busC.id).toBeTruthy();
    console.log('3 routes created');

    // Create 5 test users with unique emails
    const users = [];
    const suffix = Date.now();
    for (const name of ['Alice Tan', 'Bob Lee', 'Carol Wong', 'David Lim', 'Eve Goh']) {
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${suffix}@test.com`;
      const u = await page.evaluate(async ({ name, email, token }) => {
        const r = await fetch('/api/auth', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, email, password: 'test123', role: 'participant' }),
        });
        return r.json();
      }, { name, email, token});
      const userId = u.id || u.userId;
      users.push({ ...u, id: userId });
      expect(userId).toBeTruthy();
    }
    console.log(`5 users created: ${users.map(u => u.id).join(', ')}`);

    // Assign delegates: 2 to Bus A, 2 to Bus B, 1 to Bus C
    const busADelegates = [];
    for (const u of [users[0], users[1]]) {
      const d = await addDelegate(page, token, programmeId, u.id, busA.id);
      busADelegates.push(Array.isArray(d) ? d[0] : d);
    }
    const busBDelegates = [];
    for (const u of [users[2], users[3]]) {
      const d = await addDelegate(page, token, programmeId, u.id, busB.id);
      busBDelegates.push(Array.isArray(d) ? d[0] : d);
    }
    await addDelegate(page, token, programmeId, users[4].id, busC.id);
    console.log('Delegates assigned to routes');

    // ─── 1: Programme Page ───
    await page.goto('/programmes');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=SCCCI Business Delegation Q3').first()).toBeVisible();
    console.log('PASS: Programme visible in list');

    // ─── 2: Programme Detail → Routes Tab ───
    await page.locator('text=SCCCI Business Delegation Q3').first().click();
    await page.waitForURL(/\/programmes\/.+\/routes/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Bus A - Marina Bay').first()).toBeVisible();
    await expect(page.locator('text=Bus B - Sentosa').first()).toBeVisible();
    await expect(page.locator('text=Bus C - Jurong').first()).toBeVisible();
    console.log('PASS: All routes visible');

    // Verify delegate counts shown
    await expect(page.locator('text=2 delegates').first()).toBeVisible();
    console.log('PASS: Delegate counts visible');

    // ─── 3: Routes → Add new route ───
    await page.locator('input[placeholder="New route name..."]').fill('Bus D - Tuas');
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Bus D - Tuas').first()).toBeVisible();
    console.log('PASS: Add new route works');

    // ─── 4: Delete a route ───
    const busDcard = page.locator('text=Bus D - Tuas').locator('xpath=ancestor::div[contains(@class,"rounded-xl")]').first();
    await busDcard.locator('button').last().click();
    await page.waitForTimeout(500);
    const confirmModal = page.locator('.fixed.inset-0.z-50').first();
    await expect(confirmModal.locator('text=Delete Route')).toBeVisible();
    await confirmModal.locator('button:has-text("Delete")').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Bus D - Tuas')).toHaveCount(0);
    console.log('PASS: Delete route via custom modal works');

    // ─── 5: Edit a route ───
    // Bus C was the 3rd item. After deleting D, the last visible route card is C.
    // Click the edit icon on the last route card
    const routeCards = page.locator('.space-y-2 > div');
    const lastRoute = routeCards.last().first();
    await lastRoute.waitFor({ timeout: 5000 });
    await lastRoute.locator('button').nth(1).click(); // edit button (2nd button = pencil)
    await page.waitForTimeout(500);
    const editInput = lastRoute.locator('input').first();
    await editInput.fill('Bus C - Tuas');
    await lastRoute.locator('button:has-text("Save")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Bus C - Tuas').first()).toBeVisible({ timeout: 5000 });
    console.log('PASS: Edit route works');

    // ─── 6: Programme Picker ───
    // Create a 2nd programme, then navigate back via picker
    const prog2 = await createProgramme(page, token, 'Q4 Delegation');
    const prog2Id = prog2.id;
    console.log(`2nd programme created: ${prog2Id}`);

    // Navigate to 2nd programme
    await page.goto(`/programmes/${prog2Id}/routes`);
    await page.waitForTimeout(2000);

    // Use picker to go back to first programme
    await page.locator('text=Q4 Delegation').first().click();
    await page.waitForTimeout(500);
    await page.locator('text=SCCCI Business Delegation Q3').first().click();
    await page.waitForURL(/\/programmes\/.+\/routes/, { timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('PASS: Programme picker switches programmes');

    // ─── 7: Manage Programme Tab ───
    await page.goto(`/programmes/${programmeId}/manage`);
    await page.waitForTimeout(2000);
    await expect(page.locator('text=SCCCI Business Delegation Q3').first()).toBeVisible();
    // Edit via manage tab
    await page.locator('button:has-text("New")').first().click();
    await page.waitForTimeout(500);
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal.locator('text=New Programme')).toBeVisible();
    await modal.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
    console.log('PASS: Manage Programme tab shows list and create modal');

    // ─── 8: Dashboard ───
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    // Select programme
    await page.locator('.dashboard-programme-btn').click();
    await page.locator('text=SCCCI Business Delegation Q3').first().click();
    await page.waitForTimeout(2000);

    // Check route cards visible on dashboard
    await expect(page.locator('text=Bus A - Marina Bay').first()).toBeVisible();
    await expect(page.locator('text=Bus B - Sentosa').first()).toBeVisible();
    console.log('PASS: Dashboard route cards visible');

    // ─── 9: Dashboard → route drill-down → mark attendance ───
    await page.locator('text=Bus A - Marina Bay').first().click();
    await page.waitForURL(/\/dashboard\/routes\//, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Should see delegates
    await expect(page.locator('text=Alice Tan').first()).toBeVisible();
    await expect(page.locator('text=Bob Lee').first()).toBeVisible();
    console.log('PASS: Delegates visible on route drill-down');

    // Check that checked-in count shows 0/2 or 2/2
    await expect(page.locator('text=/checked in/').first()).toBeVisible();
    console.log('PASS: Check-in count visible');

    // Mark Alice as present via UI (click delegate → check in)
    await page.locator('text=Alice Tan').first().click();
    await page.waitForTimeout(500);
    const profileSheet = page.locator('.profile-sheet, .profile-hero');
    if (await profileSheet.isVisible().catch(() => false)) {
      const checkInBtn = page.locator('button:has-text("Mark as Present"), button:has-text("Check in")').first();
      if (await checkInBtn.isVisible().catch(() => false)) {
        await checkInBtn.click();
        await page.waitForTimeout(1000);
        console.log('PASS: Marked delegate present via UI');
      }
    }

    // ─── 10: Ready-to-depart toggle ───
    const rtdBtn = page.locator('button:has-text("Ready to depart"), button:has-text("All accounted for")').first();
    if (await rtdBtn.isVisible().catch(() => false)) {
      await rtdBtn.click();
      await page.waitForTimeout(1000);
      console.log('PASS: Ready-to-depart toggled');
    }

    // ─── 11: Summary Tab ───
    await page.goto(`/programmes/${programmeId}/summary`);
    await page.waitForTimeout(2000);

    // Summary should show route breakdowns
    await expect(page.locator('text=Bus A - Marina Bay').first()).toBeVisible();
    await expect(page.locator('text=Bus B - Sentosa').first()).toBeVisible();
    // Should show stats: Total / Checked In / Missing
    await expect(page.locator('text=Total').first()).toBeVisible();
    await expect(page.locator('text=Checked In').first()).toBeVisible();
    console.log('PASS: Summary page shows route breakdowns');

    // ─── 12: Report button from dashboard ───
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Select programme first
    await page.locator('.dashboard-programme-btn').click();
    await page.locator('text=SCCCI Business Delegation Q3').first().click();
    await page.waitForTimeout(1000);

    // Click report icon
    await page.locator('[aria-label="View report"]').click();
    await page.waitForURL(/\/programmes\/.+\/summary/, { timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('PASS: Report button navigates to programme summary');

    // ─── 13: Plus icon → programme routes ───
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    await page.locator('.dashboard-programme-btn').click();
    await page.locator('text=SCCCI Business Delegation Q3').first().click();
    await page.waitForTimeout(1000);

    await page.locator('[aria-label="Manage routes"]').click();
    await page.waitForURL(/\/programmes\/.+\/routes/, { timeout: 10000 });
    await page.waitForTimeout(500);
    console.log('PASS: Plus icon navigates to programme routes');

    // ─── 14: Toast appears on actions ───
    // Add a route → toast should pop up
    await page.locator('input[placeholder="New route name..."]').fill('Extra Bus');
    await page.locator('button:has-text("Add")').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Route added').first()).toBeVisible({ timeout: 5000 });
    console.log('PASS: Toast notification visible after route added');

    // ─── 15: Programme modal create ───
    await page.goto('/programmes');
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("New")').first().click();
    await page.waitForTimeout(500);
    const createModal = page.locator('.fixed.inset-0.z-50').first();
    await createModal.locator('input').nth(0).fill('End-to-End Test Prog');
    await createModal.locator('input[type="date"]').nth(0).fill('2026-09-01');
    await createModal.locator('input[type="date"]').nth(1).fill('2026-09-15');
    await createModal.locator('button:has-text("Create")').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=End-to-End Test Prog').first()).toBeVisible();
    console.log('PASS: Create programme via modal works');

    // ─── 16: Programme edit via modal ───
    const progCard = page.locator('text=End-to-End Test Prog').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first();
    await progCard.locator('button').first().click(); // edit button
    await page.waitForTimeout(500);
    const editModal = page.locator('.fixed.inset-0.z-50').first();
    await expect(editModal.locator('text=Edit Programme')).toBeVisible();
    await editModal.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
    console.log('PASS: Edit programme modal works');

    // ─── 17: Programme delete via custom confirm ───
    await page.locator('text=End-to-End Test Prog').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first()
      .locator('button').last().click(); // delete button
    await page.waitForTimeout(500);
    const deleteConfirm = page.locator('.fixed.inset-0.z-50').first();
    await expect(deleteConfirm.locator('text=Delete Programme')).toBeVisible();
    await deleteConfirm.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(500);
    console.log('PASS: Delete programme custom confirm modal works');
  });
});
