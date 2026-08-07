// ============================================================
//  src/helpers/excelHelper.ts
//  xlsx library use kar rahe hain — object object fix
// ============================================================

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { PATHS } from '../config/appConfig';
import { UserRow, RunResult } from '../types';
import { logger } from './logger';

// ─────────────────────────────────────────────────────────────
//  safeStr — kisi bhi value ko string banao
//  Object object fix yahan hai
// ─────────────────────────────────────────────────────────────
function safeStr(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val).trim();
  // ExcelJS rich text: {richText: [{text:''}]}
  if (typeof val === 'object' && val.richText) {
    return val.richText.map((r: any) => r.text || '').join('').trim();
  }
  // ExcelJS hyperlink: {text: '', hyperlink: ''}
  if (typeof val === 'object' && val.text !== undefined) {
    return String(val.text).trim();
  }
  // ExcelJS formula: {result: '', formula: ''}
  if (typeof val === 'object' && val.result !== undefined) {
    return String(val.result).trim();
  }
  return String(val).trim();
}

// ─────────────────────────────────────────────────────────────
//  readUsers — xlsx library se read karo (object object nahi aayega)
// ─────────────────────────────────────────────────────────────
export async function readUsers(): Promise<UserRow[]> {
  // xlsx library use karo — plain values guaranteed
  const wb = XLSX.readFile(PATHS.excelInput, { type: 'file', raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  
  // JSON mein convert karo
  const rows: any[] = XLSX.utils.sheet_to_json(ws, {
    defval: '',      // empty cells ke liye default
    raw: false,      // sab kuch string mein
  });

  logger.info(`Excel columns: ${Object.keys(rows[0] || {}).join(', ')}`);

  const users: UserRow[] = [];
  let srCounter = 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Username aur Password column dhundho
    const username = String(
      row['Username'] || row['username'] || row['USERNAME'] || ''
    ).trim();

    const password = String(
      row['Password'] || row['password'] || row['PASSWORD'] || ''
    ).trim();

    if (!username || !password) continue;

    const srno = Number(
      row['SrNo'] || row['SrNo.'] || row['srno'] || srCounter
    ) || srCounter;

    const status = String(row['Status'] || row['status'] || '').trim();

    users.push({
      SrNo: srno,
      District: String(row['District'] || row['district'] || '').trim(),
      Tehsil: String(row['Tehsil'] || row['tehsil'] || '').trim(),
      UnionCouncil: String(
        row['UnionCouncil'] || row['Union Council (UC)'] || row['unioncouncil'] || ''
      ).trim(),
      VaccinatorName: String(
        row['VaccinatorName'] || row['Vaccinator Name'] || row['vaccinatorname'] || ''
      ).trim(),
      Username: username,
      Password: password,
      Status: status,
      excelRowNumber: i + 2, // Row 1 = header, data Row 2 se
    });

    srCounter++;
  }

  logger.info(`✅ ${users.length} users load ho gaye`);

  // Debug: first 3 passwords print karo verify ke liye
  users.slice(0, 3).forEach(u => {
    logger.info(`  [${u.SrNo}] ${u.VaccinatorName} | Pass: "${u.Password}" | type: ${typeof u.Password}`);
  });

  return users;
}

// ─────────────────────────────────────────────────────────────
//  updateUserResult — ExcelJS se result column update karo
// ─────────────────────────────────────────────────────────────
export async function updateUserResult(
  result: RunResult,
  excelRowNumber: number
): Promise<void> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(PATHS.excelOutput);
    const ws = wb.worksheets[0];
    const row = ws.getRow(excelRowNumber);

    // Status cell — color coding
    const statusCell = row.getCell(8);
    statusCell.value = result.status;

    if (result.status === 'SUCCESS') {
      statusCell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FF92D050' }
      };
      statusCell.font = { bold: true, color: { argb: 'FF1A5E20' }, name: 'Arial', size: 9 };
    } else if (result.status === 'FAILED_LOGIN') {
      statusCell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFFFC000' }
      };
      statusCell.font = { bold: true, color: { argb: 'FF7D4900' }, name: 'Arial', size: 9 };
    } else {
      statusCell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFFF0000' }
      };
      statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 9 };
    }

    row.getCell(9).value  = result.step;
    row.getCell(10).value = result.errorMessage;
    row.getCell(11).value = result.timestamp;
    row.getCell(12).value = result.screenshot
      ? `screenshots/${result.screenshot.split('/').pop()}`
      : '';

    row.commit();
    await wb.xlsx.writeFile(PATHS.excelOutput);
  } catch (err) {
    logger.error(`Excel update fail row ${excelRowNumber}: ${(err as Error).message}`);
  }
}
