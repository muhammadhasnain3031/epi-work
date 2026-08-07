// ============================================================
//  loginHelper.ts — v9
//  Logout fix: drawer swipe hataya — direct logout button
// ============================================================

import { LOCATORS, TIMEOUTS, APP_PACKAGE } from '../config/appConfig';
import { logger } from './logger';
import {
  getElement, typeText, tap, tapByText,
  isPresent, waitUntilVisible, hideKeyboard, sleep, getTextOf,
} from './waitHelper';

export type LoginResult = 'success' | 'failed_auth' | 'failed_ui';

export async function performLogin(
  driver: any,
  username: string,
  password: string
): Promise<LoginResult> {
  logger.info(`  → ${username}`);
  try {
    const loginOk = await waitUntilVisible(
      driver, LOCATORS.login.usernameInput, 8000
    );
    if (!loginOk) {
      await resetAppToLoginScreen(driver);
      await sleep(1000);
    }
    await typeText(driver, LOCATORS.login.usernameInput, username);
    await typeText(driver, LOCATORS.login.passwordInput, password);
    await hideKeyboard(driver);
    await tap(driver, LOCATORS.login.loginButton);
    return await waitForLoginResult(driver);
  } catch (err) {
    logger.error(`  ✗ Login: ${(err as Error).message}`);
    return 'failed_ui';
  }
}

async function waitForLoginResult(driver: any): Promise<LoginResult> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await isPresent(driver, LOCATORS.dashboard.recyclerView, 500)) {
      logger.info(`  ✅ LOGIN OK`); return 'success';
    }
    if (await isPresent(driver, LOCATORS.dashboard.welcomeText, 500)) {
      logger.info(`  ✅ LOGIN OK`); return 'success';
    }
    if (await isPresent(driver, LOCATORS.login.errorMessage, 500)) {
      const txt = await getTextOf(driver, LOCATORS.login.errorMessage, 1000);
      logger.warn(`  ✗ Auth: "${txt}"`);
      return 'failed_auth';
    }
    await sleep(400);
  }
  if (await isPresent(driver, LOCATORS.dashboard.recyclerView, 2000)) return 'success';
  logger.warn(`  ✗ Login timeout`);
  return 'failed_ui';
}

export async function performCheckIn(driver: any): Promise<void> {
  logger.info(`  → Check-In...`);
  await tapModuleCard(driver, LOCATORS.checkin.cardTitle);
  await sleep(1200);
  await handleActionScreen(driver, ['CHECK IN', 'CHECKIN', 'SUBMIT', 'Submit', 'OK']);
  logger.info(`  ✅ Check-In done`);
}

export async function performCheckOut(driver: any): Promise<void> {
  logger.info(`  → Check-Out...`);
  await tapModuleCard(driver, LOCATORS.checkout.cardTitle);
  await sleep(1200);
  await handleActionScreen(driver, ['CHECK OUT', 'CHECKOUT', 'SUBMIT', 'Submit', 'OK']);
  logger.info(`  ✅ Check-Out done`);
}

async function tapModuleCard(driver: any, cardTitle: string): Promise<void> {
  await waitUntilVisible(driver, LOCATORS.dashboard.recyclerView, 8000);
  try {
    const card = await driver.$(
      `android=new UiSelector()` +
      `.resourceId("com.hisdu.emr.application:id/cardView")` +
      `.childSelector(new UiSelector()` +
      `.resourceId("com.hisdu.emr.application:id/moduleTitle")` +
      `.text("${cardTitle}"))`
    );
    await card.waitForExist({ timeout: 3000 });
    await card.click();
    logger.info(`    ✓ Card: "${cardTitle}"`);
    return;
  } catch { }
  try {
    const el = await driver.$(
      `android=new UiSelector()` +
      `.resourceId("com.hisdu.emr.application:id/moduleTitle")` +
      `.text("${cardTitle}")`
    );
    await el.waitForExist({ timeout: 3000 });
    await el.click();
    logger.info(`    ✓ Title: "${cardTitle}"`);
    return;
  } catch { }
  const el = await driver.$(`//android.widget.TextView[@text="${cardTitle}"]`);
  await el.waitForExist({ timeout: 3000 });
  await el.click();
}

async function handleActionScreen(driver: any, allowedButtons: string[]): Promise<void> {
  for (const btnText of allowedButtons) {
    try {
      const btn = await driver.$(`android=new UiSelector().text("${btnText}")`);
      if (await btn.isExisting() && await btn.isDisplayed()) {
        await btn.click();
        logger.info(`    ✓ "${btnText}" tapped`);
        await sleep(400);
        break;
      }
    } catch { }
  }
  await sleep(600);
  const onDash = await isPresent(driver, LOCATORS.dashboard.recyclerView, 2000);
  if (!onDash) {
    try { await driver.back(); await sleep(400); } catch { }
  }
}

// ─────────────────────────────────────────────────────────────
//  performLogout — v9
//  ✅ Drawer swipe completely hataya
//  ✅ Direct logout button resource-id se dhundho
//  ✅ Agar nahi mila toh Logout button text se dhundho
//  ✅ Koi swipe nahi = koi 404 nahi = fast logout
// ─────────────────────────────────────────────────────────────
export async function performLogout(driver: any): Promise<void> {
  logger.info(`  → Logout...`);

  // Method 1: Direct resource-id se logout button
  // Yeh sab se fast hai — no swipe needed
  const directLogout = await isPresent(
    driver, LOCATORS.dashboard.logoutButton, 500
  );

  if (directLogout) {
    // Logout button seedha dikh raha hai — tap karo
    await tap(driver, LOCATORS.dashboard.logoutButton);
    logger.info(`    ✓ Direct logout tapped`);
  } else {
    // Method 2: Logout text se dhundho (drawer mein ho sakta hai)
    // Pehle check karo bina swipe ke
    let found = false;
    for (const txt of ['Logout', 'LOGOUT', 'Log Out', 'LOG OUT']) {
      try {
        const btn = await driver.$(`android=new UiSelector().text("${txt}")`);
        if (await btn.isExisting() && await btn.isDisplayed()) {
          await btn.click();
          logger.info(`    ✓ Logout by text: "${txt}"`);
          found = true;
          break;
        }
      } catch { }
    }

    if (!found) {
      // Method 3: Last resort — swipeGesture (Appium v3 compatible)
      logger.info(`    → Trying drawer swipe...`);
      try {
        const { width, height } = await driver.getWindowSize();
        await driver.executeScript('mobile: swipeGesture', [{
          left: 0,
          top: Math.floor(height * 0.4),
          width: Math.floor(width * 0.5),
          height: Math.floor(height * 0.2),
          direction: 'right',
          percent: 0.75,
        }]);
        await sleep(500); // Drawer open hone ka minimum wait
      } catch { }

      // Swipe ke baad dobara dhundho
      for (const txt of ['Logout', 'LOGOUT', 'Log Out']) {
        try {
          const btn = await driver.$(`android=new UiSelector().text("${txt}")`);
          if (await btn.isExisting() && await btn.isDisplayed()) {
            await btn.click();
            logger.info(`    ✓ Logout after swipe: "${txt}"`);
            break;
          }
        } catch { }
      }
    }
  }

  await sleep(300); // Minimum wait — confirm dialog ke liye

  // Confirm dialog — agar aaye
  for (const txt of ['YES', 'Yes', 'OK', 'Ok']) {
    try {
      const btn = await driver.$(`android=new UiSelector().text("${txt}")`);
      if (await btn.isExisting() && await btn.isDisplayed()) {
        await btn.click();
        await sleep(300);
        break;
      }
    } catch { }
  }

  // Login screen wait
  const back = await waitUntilVisible(
    driver, LOCATORS.login.usernameInput, 8000
  );
  if (!back) throw new Error('Login screen nahi aayi');
  logger.info(`  ✅ Logout done`);
}

export async function resetAppToLoginScreen(driver: any): Promise<void> {
  logger.info(`  🔄 Reset...`);
  try {
    await driver.background(-1);
    await sleep(1200);
    await driver.activateApp(APP_PACKAGE);
    await sleep(1200);
    if (await waitUntilVisible(driver, LOCATORS.login.usernameInput, 5000)) return;
    throw new Error('no login screen');
  } catch {
    try {
      await driver.terminateApp(APP_PACKAGE);
      await sleep(1500);
      await driver.activateApp(APP_PACKAGE);
      await sleep(1500);
    } catch (e) {
      logger.error(`  ✗ Reset: ${(e as Error).message}`);
    }
  }
}

export async function clearLoginFields(driver: any): Promise<void> {
  try {
    const u = await getElement(driver, LOCATORS.login.usernameInput, 3000);
    await u.clearValue();
    const p = await getElement(driver, LOCATORS.login.passwordInput, 3000);
    await p.clearValue();
  } catch { }
}