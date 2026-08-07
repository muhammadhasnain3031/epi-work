// ============================================================
//  helpers/screenshotHelper.ts
//  Failure screenshots capture karo
// ============================================================

import { Browser } from 'webdriverio';
import path from 'path';
import fs from 'fs';
import { PATHS } from '../config/appConfig';
import { logger } from './logger';

// Screenshots directory create karo agar nahi hai
if (!fs.existsSync(PATHS.screenshotsDir)) {
  fs.mkdirSync(PATHS.screenshotsDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
//  takeScreenshot — base64 screenshot save karo file mein
//  Return: screenshot file ka path (ya '' agar fail ho)
// ─────────────────────────────────────────────────────────────
export async function takeScreenshot(
  driver: Browser,
  srNo: number,
  username: string,
  stepName: string
): Promise<string> {
  try {
    // Filename: 001_7121_19662_OR_login_fail_2024-01-15T10-30-00.png
    const safeUsername = username.replace(/[^a-zA-Z0-9_]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${String(srNo).padStart(3, '0')}_${safeUsername}_${stepName}_${timestamp}.png`;
    const filepath = path.join(PATHS.screenshotsDir, filename);

    const screenshot = await driver.takeScreenshot(); // base64 string
    fs.writeFileSync(filepath, screenshot, 'base64');

    logger.info(`  📸 Screenshot saved: screenshots/${filename}`);
    return filepath;
  } catch (err) {
    logger.warn(`  ⚠ Screenshot capture failed: ${(err as Error).message}`);
    return '';
  }
}

// ─────────────────────────────────────────────────────────────
//  cleanupOldScreenshots — X days se purane screenshots delete karo
// ─────────────────────────────────────────────────────────────
export function cleanupOldScreenshots(daysOld: number = 7) {
  try {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(PATHS.screenshotsDir);
    let deleted = 0;
    for (const file of files) {
      const filepath = path.join(PATHS.screenshotsDir, file);
      const stat = fs.statSync(filepath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filepath);
        deleted++;
      }
    }
    if (deleted > 0) logger.info(`🧹 Cleaned ${deleted} old screenshots`);
  } catch {
    // Silently ignore cleanup errors
  }
}
