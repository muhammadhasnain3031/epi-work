// ============================================================
//  waitHelper.ts — mobile: type use karo (supported in this driver)
//  @ # $ % sab work karta hai — no keyboard issue
// ============================================================

import { TIMEOUTS } from '../config/appConfig';
import { logger } from './logger';

export async function getElement(
  driver: any,
  resourceId: string,
  timeout: number = TIMEOUTS.elementWait
) {
  const el = await driver.$(`android=new UiSelector().resourceId("${resourceId}")`);
  await el.waitForExist({ timeout });
  await el.waitForDisplayed({ timeout });
  return el;
}

export async function waitUntilVisible(
  driver: any,
  resourceId: string,
  timeout: number = TIMEOUTS.elementWait
): Promise<boolean> {
  try {
    const el = await getElement(driver, resourceId, timeout);
    return await el.isDisplayed();
  } catch { return false; }
}

export async function isPresent(
  driver: any,
  resourceId: string,
  timeout: number = 2000
): Promise<boolean> {
  try {
    const el = await driver.$(`android=new UiSelector().resourceId("${resourceId}")`);
    await el.waitForExist({ timeout });
    return await el.isDisplayed();
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────
//  typeText — mobile: type (confirmed supported in your driver)
//  Log se confirm: "mobile: type" listed hai available methods mein
//  @ # $ % & sab kuch handle karta hai — no keyboard = no @ issue
// ─────────────────────────────────────────────────────────────
export async function typeText(
  driver: any,
  resourceId: string,
  text: string,
  timeout: number = TIMEOUTS.elementWait
): Promise<void> {

  // Step 1: Element click karo focus ke liye
  const el = await getElement(driver, resourceId, timeout);
  await el.click();
  await sleep(200);

  // Step 2: Clear karo
  await el.clearValue();
  await sleep(150);

  // Method 1: mobile: replaceElementValue (fastest, no keyboard)
  try {
    await driver.executeScript('mobile: replaceElementValue', [{
      elementId: el.elementId,
      text: text,
    }]);
    await sleep(200);
    logger.info(`    ✓ replaceElementValue: "${text.substring(0, 4)}***"`);
    return;
  } catch { }

  // Method 2: mobile: type (confirmed in your driver's list)
  try {
    await driver.executeScript('mobile: type', [{
      text: text,
    }]);
    await sleep(200);
    logger.info(`    ✓ mobile:type: "${text.substring(0, 4)}***"`);
    return;
  } catch { }

  // Method 3: setValue (reliable fallback)
  try {
    await el.setValue(text);
    await sleep(200);
    logger.info(`    ✓ setValue: "${text.substring(0, 4)}***"`);
    return;
  } catch { }

  // Method 4: setClipboard + paste
  try {
    await driver.setClipboard(
      Buffer.from(text).toString('base64'),
      'plaintext'
    );
    await sleep(200);
    // Select all
    await driver.executeScript('mobile: shell', [{
      command: 'input', args: ['keyevent', '277'], // KEYCODE_SELECT_ALL
    }]);
    await sleep(100);
    // Paste
    await driver.executeScript('mobile: shell', [{
      command: 'input', args: ['keyevent', '279'], // KEYCODE_PASTE
    }]);
    await sleep(300);
    logger.info(`    ✓ clipboard paste: "${text.substring(0, 4)}***"`);
    return;
  } catch (e) {
    throw new Error(`All methods failed: ${(e as Error).message}`);
  }
}

export async function tap(
  driver: any,
  resourceId: string,
  timeout: number = TIMEOUTS.elementWait
): Promise<void> {
  const el = await getElement(driver, resourceId, timeout);
  await el.click();
}

export async function tapByText(
  driver: any,
  text: string,
  timeout: number = TIMEOUTS.elementWait
): Promise<void> {
  const el = await driver.$(`android=new UiSelector().text("${text}")`);
  await el.waitForExist({ timeout });
  await el.click();
}

export async function retry<T>(
  action: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000,
  name: string = 'action'
): Promise<T> {
  let last: Error = new Error('Unknown');
  for (let i = 1; i <= maxRetries; i++) {
    try { return await action(); }
    catch (e) {
      last = e as Error;
      if (i < maxRetries) await sleep(delayMs);
    }
  }
  throw new Error(`${name} failed: ${last.message}`);
}

export async function hideKeyboard(driver: any): Promise<void> {
  try {
    const shown = await driver.isKeyboardShown();
    if (shown) { await driver.hideKeyboard(); await sleep(200); }
  } catch { }
}

export async function getTextOf(
  driver: any,
  resourceId: string,
  timeout: number = 1000
): Promise<string> {
  try {
    const el = await getElement(driver, resourceId, timeout);
    return (await el.getText()) || '';
  } catch { return ''; }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
