// ============================================================
//  main.ts — Checkin/Checkout separate tracking
//  
//  DAILY WORKFLOW:
//  Subah:   npm run checkin
//  Shaam:   npm run checkout
//  Agla din: npm run reset → phir checkin/checkout
//
//  Status column meanings:
//  CHECKIN_OK  = subah checkin hua
//  CHECKOUT_OK = shaam checkout hua  
//  FAILED_LOGIN = password galat
//  FAILED_STEP  = koi aur error
// ============================================================

import { remote } from 'webdriverio';
import dayjs from 'dayjs';
import fs from 'fs';

import { APPIUM_CONFIG, CAPABILITIES } from './config/appConfig';
import { UserRow, RunResult, SessionSummary } from './types';
import {
  logger, logSessionStart, logSessionEnd,
  logUserStart, logUserResult,
} from './helpers/logger';
import { readUsers, updateUserResult } from './helpers/excelHelper';
import { takeScreenshot, cleanupOldScreenshots } from './helpers/screenshotHelper';
import { writeJsonReport, writeCsvReport, printConsoleSummary } from './helpers/reportWriter';
import {
  performLogin, performCheckIn, performCheckOut,
  performLogout, resetAppToLoginScreen, clearLoginFields,
} from './helpers/loginHelper';
import { sleep } from './helpers/waitHelper';

['./screenshots', './logs', './reports'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Args ──────────────────────────────────────────────────────
const args = process.argv;
const modeIdx = args.indexOf('--mode');
const MODE = modeIdx !== -1 ? args[modeIdx + 1] : 'checkin';
const fromIdx = args.indexOf('--from');
const START_FROM = fromIdx !== -1 ? parseInt(args[fromIdx + 1]) : 1;

logger.info(`🎯 MODE: ${MODE.toUpperCase()} | SrNo se: ${START_FROM}`);

// ─────────────────────────────────────────────────────────────
//  shouldSkip — mode ke hisaab se decide karo
// ─────────────────────────────────────────────────────────────
function shouldSkip(user: UserRow): boolean {
  const status = (user.Status || '').trim();
  const step   = (user.Step   || '').trim();

  if (MODE === 'checkin') {
    // Sirf woh skip karo jo aaj checkin ho chuke hain
    if (status === 'CHECKIN_OK' || status === 'SUCCESS') return true;
    return false;
  }

  if (MODE === 'checkout') {
    // Checkout mode:
    // - CHECKOUT_OK = already checkout hua → skip
    // - FAILED_LOGIN = password galat tha → skip
    // - Baaki sab process karo (checkin_ok, empty, failed_step)
    if (status === 'CHECKOUT_OK') return true;
    if (status === 'FAILED_LOGIN') return true;
    return false;
  }

  if (MODE === 'both') {
    if (status === 'CHECKOUT_OK') return true;
    return false;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
//  processUser
// ─────────────────────────────────────────────────────────────
async function processUser(
  driver: any,
  user: UserRow,
  index: number,
  total: number,
): Promise<RunResult> {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  let screenshotPath = '';

  logUserStart(user.SrNo, user.VaccinatorName, user.Username);
  logger.info(`  [${index + 1}/${total}] UC: ${user.UnionCouncil}`);

  // ── LOGIN ─────────────────────────────────────────────────
  let loginResult: 'success' | 'failed_auth' | 'failed_ui';
  try {
    loginResult = await performLogin(driver, user.Username, user.Password);
  } catch { loginResult = 'failed_ui'; }

  if (loginResult === 'failed_auth') {
    screenshotPath = await takeScreenshot(driver, user.SrNo, user.Username, 'login_fail');
    await clearLoginFields(driver);
    const r: RunResult = {
      srNo: user.SrNo, vaccinatorName: user.VaccinatorName,
      username: user.Username, status: 'FAILED_LOGIN',
      step: 'LOGIN', errorMessage: 'Invalid credentials',
      timestamp, screenshot: screenshotPath,
    };
    logUserResult(user.SrNo, 'FAILED_LOGIN', 'LOGIN', 'Invalid credentials');
    await updateUserResult(r, user.excelRowNumber!);
    return r;
  }

  if (loginResult === 'failed_ui') {
    screenshotPath = await takeScreenshot(driver, user.SrNo, user.Username, 'ui_fail');
    await resetAppToLoginScreen(driver);
    const r: RunResult = {
      srNo: user.SrNo, vaccinatorName: user.VaccinatorName,
      username: user.Username, status: 'FAILED_STEP',
      step: 'LOGIN', errorMessage: 'Login timeout',
      timestamp, screenshot: screenshotPath,
    };
    logUserResult(user.SrNo, 'FAILED_STEP', 'LOGIN', r.errorMessage);
    await updateUserResult(r, user.excelRowNumber!);
    return r;
  }

  // ── CHECK-IN ─────────────────────────────────────────────
  if (MODE === 'checkin' || MODE === 'both') {
    try {
      await performCheckIn(driver);
    } catch (err) {
      screenshotPath = await takeScreenshot(driver, user.SrNo, user.Username, 'checkin_fail');
      const msg = (err as Error).message;
      await resetAppToLoginScreen(driver);
      const r: RunResult = {
        srNo: user.SrNo, vaccinatorName: user.VaccinatorName,
        username: user.Username, status: 'FAILED_STEP',
        step: 'CHECK_IN', errorMessage: msg,
        timestamp, screenshot: screenshotPath,
      };
      logUserResult(user.SrNo, 'FAILED_STEP', 'CHECK_IN', msg);
      await updateUserResult(r, user.excelRowNumber!);
      return r;
    }
  }

  // ── CHECK-OUT ────────────────────────────────────────────
  if (MODE === 'checkout' || MODE === 'both') {
    try {
      await performCheckOut(driver);
    } catch (err) {
      const msg = (err as Error).message;
      logger.warn(`  ⚠ CheckOut fail: ${msg}`);
      screenshotPath = await takeScreenshot(
        driver, user.SrNo, user.Username, 'checkout_fail'
      );
    }
  }

  // ── LOGOUT ───────────────────────────────────────────────
  try {
    await performLogout(driver);
  } catch (err) {
    logger.warn(`  ⚠ Logout: ${(err as Error).message}`);
    await resetAppToLoginScreen(driver);
  }

  // ── SUCCESS ──────────────────────────────────────────────
  // Status alag rakho taake checkout distinguish ho sake
  const statusLabel =
    MODE === 'checkin'  ? 'CHECKIN_OK'  :
    MODE === 'checkout' ? 'CHECKOUT_OK' : 'CHECKOUT_OK';

  const stepLabel =
    MODE === 'checkin'  ? 'CHECKIN_DONE'  :
    MODE === 'checkout' ? 'CHECKOUT_DONE' : 'BOTH_DONE';

  const r: RunResult = {
    srNo: user.SrNo, vaccinatorName: user.VaccinatorName,
    username: user.Username, status: statusLabel,
    step: stepLabel, errorMessage: '', timestamp, screenshot: '',
  };
  logUserResult(user.SrNo, statusLabel, stepLabel);
  await updateUserResult(r, user.excelRowNumber!);
  return r;
}

// ─────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  cleanupOldScreenshots(7);

  let allUsers: UserRow[];
  try {
    allUsers = await readUsers();
  } catch (err) {
    logger.error(`❌ Excel: ${(err as Error).message}`);
    process.exit(1);
  }

  const toProcess = allUsers.filter(u => {
    if (u.SrNo < START_FROM) return false;
    if (shouldSkip(u)) {
      logger.info(`  ⏭ [${u.SrNo}] ${u.VaccinatorName} — skip (${u.Status})`);
      return false;
    }
    return true;
  });

  if (toProcess.length === 0) {
    logger.info(`\n✅ Sab users process ho chuke hain!`);
    if (MODE === 'checkin') {
      logger.info(`   Shaam ko: npm run checkout`);
    } else if (MODE === 'checkout') {
      logger.info(`   Kal subah: npm run reset → phir npm run checkin`);
    }
    return;
  }

  logSessionStart(toProcess.length);
  logger.info(`⚠ Phone pe app LOGIN screen pe kholo — 3 sec...`);
  await sleep(3000);

  let driver: any;
  try {
    driver = await remote({
      ...APPIUM_CONFIG,
      capabilities: CAPABILITIES as any,
    });
    logger.info(`✅ Appium connected!`);
  } catch (err) {
    logger.error(`❌ Appium server band hai!`);
    logger.error(`   Pehle yeh chalao: appium --port 4723 --use-drivers uiautomator2 --allow-cors`);
    process.exit(1);
  }

  const results: RunResult[] = [];
  const summary: SessionSummary = {
    totalProcessed: 0, success: 0,
    failedLogin: 0, failedStep: 0, skipped: 0, results: [],
  };

  try {
    for (let i = 0; i < toProcess.length; i++) {
      const user = toProcess[i];
      try {
        const r = await processUser(driver, user, i, toProcess.length);
        results.push(r);
        summary.totalProcessed++;
        if (r.status === 'CHECKIN_OK' || r.status === 'CHECKOUT_OK' || r.status === 'SUCCESS') {
          summary.success++;
        } else if (r.status === 'FAILED_LOGIN') {
          summary.failedLogin++;
        } else {
          summary.failedStep++;
        }
      } catch (err) {
        logger.error(`  ❌ [${user.SrNo}]: ${(err as Error).message}`);
        results.push({
          srNo: user.SrNo, vaccinatorName: user.VaccinatorName,
          username: user.Username, status: 'FAILED_STEP',
          step: 'UNEXPECTED', errorMessage: (err as Error).message,
          timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'), screenshot: '',
        });
        summary.totalProcessed++;
        summary.failedStep++;
        try { await resetAppToLoginScreen(driver); } catch { }
      }

      if ((i + 1) % 10 === 0) {
        summary.results = results;
        writeJsonReport(summary);
        logger.info(`💾 Progress: ${i + 1}/${toProcess.length}`);
      }
    }
  } finally {
    try { await driver.deleteSession(); } catch { }
    summary.results = results;
    writeJsonReport(summary);
    writeCsvReport(results);
    printConsoleSummary(summary);
    logSessionEnd(
      summary.success,
      summary.failedLogin + summary.failedStep,
      summary.skipped
    );
  }
}

main().catch(err => {
  logger.error(`💥 ${err.message}`);
  process.exit(1);
});
