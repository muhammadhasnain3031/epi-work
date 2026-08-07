// ============================================================
//  helpers/reportWriter.ts
//  Final JSON + CSV report likhna
// ============================================================

import fs from 'fs';
import path from 'path';
import { RunResult, SessionSummary } from '../types';
import { logger } from './logger';

const REPORTS_DIR = './reports';

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
//  writeJsonReport
// ─────────────────────────────────────────────────────────────
export function writeJsonReport(summary: SessionSummary): void {
  try {
    const filepath = path.join(REPORTS_DIR, 'report.json');
    fs.writeFileSync(filepath, JSON.stringify(summary, null, 2), 'utf-8');
    logger.info(`📄 JSON report saved: ${filepath}`);
  } catch (err) {
    logger.error(`JSON report save fail: ${(err as Error).message}`);
  }
}

// ─────────────────────────────────────────────────────────────
//  writeCsvReport
// ─────────────────────────────────────────────────────────────
export function writeCsvReport(results: RunResult[]): void {
  try {
    const filepath = path.join(REPORTS_DIR, 'report.csv');
    const header = ['srNo', 'vaccinatorName', 'username', 'status', 'step', 'errorMessage', 'timestamp', 'screenshot'];

    const rows = results.map(r => [
      r.srNo,
      `"${r.vaccinatorName.replace(/"/g, '""')}"`,
      `"${r.username}"`,
      r.status,
      `"${r.step}"`,
      `"${r.errorMessage.replace(/"/g, '""')}"`,
      r.timestamp,
      r.screenshot ? `"${r.screenshot}"` : '',
    ].join(','));

    const csvContent = [header.join(','), ...rows].join('\n');
    fs.writeFileSync(filepath, csvContent, 'utf-8');
    logger.info(`📊 CSV report saved: ${filepath}`);
  } catch (err) {
    logger.error(`CSV report save fail: ${(err as Error).message}`);
  }
}

// ─────────────────────────────────────────────────────────────
//  printConsoleSummary — terminal pe neat summary
// ─────────────────────────────────────────────────────────────
export function printConsoleSummary(summary: SessionSummary): void {
  const { totalProcessed, success, failedLogin, failedStep } = summary;
  const successPct = totalProcessed > 0 ? ((success / totalProcessed) * 100).toFixed(1) : '0';

  console.log('\n' + '═'.repeat(60));
  console.log('  📋 FINAL SUMMARY — SARGODHA VACCINATION AUTOMATION');
  console.log('═'.repeat(60));
  console.log(`  Total Processed  : ${totalProcessed}`);
  console.log(`  ✅ SUCCESS       : ${success} (${successPct}%)`);
  console.log(`  ❌ FAILED_LOGIN  : ${failedLogin}`);
  console.log(`  ⛔ FAILED_STEP   : ${failedStep}`);
  console.log('─'.repeat(60));

  // Failed users ki list
  const failed = summary.results.filter(r => r.status !== 'SUCCESS');
  if (failed.length > 0) {
    console.log('\n  ❌ Failed Users:');
    failed.forEach(r => {
      console.log(`    [${r.srNo}] ${r.vaccinatorName} (${r.username}) — ${r.status} @ ${r.step}`);
      if (r.errorMessage) console.log(`         Error: ${r.errorMessage}`);
    });
  }

  console.log('═'.repeat(60) + '\n');
}
