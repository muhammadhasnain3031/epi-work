// ============================================================
//  src/resetStatus.ts
//  Roz subah chalao — Status column reset karo
//  Command: npx ts-node src/resetStatus.ts
// ============================================================

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

const FILE = './data/users.xlsx';

async function resetStatus() {
  console.log('🔄 Status reset kar rahe hain...');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  let count = 0;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // Header skip

    // Status, Step, ErrorMessage, Timestamp, Screenshot clear karo
    row.getCell(8).value  = '';  // Status
    row.getCell(9).value  = '';  // Step
    row.getCell(10).value = '';  // ErrorMessage
    row.getCell(11).value = '';  // Timestamp
    row.getCell(12).value = '';  // Screenshot

    // Fill bhi clear karo
    row.getCell(8).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' }
    };
    row.getCell(8).font = { name: 'Arial', size: 9 };

    row.commit();
    count++;
  });

  await wb.xlsx.writeFile(FILE);
  console.log(`✅ ${count} users ka status reset ho gaya`);
  console.log(`📅 Date: ${dayjs().format('DD/MM/YYYY')}`);
  console.log(`\nAb checkin ya checkout command chala sakte ho!`);
}

resetStatus().catch(console.error);
