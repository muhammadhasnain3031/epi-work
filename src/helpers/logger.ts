// ============================================================
//  helpers/logger.ts
//  Winston logger — console + file combined
// ============================================================

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { PATHS } from '../config/appConfig';

// Logs directory banana agar exist na kare
if (!fs.existsSync(PATHS.logsDir)) {
  fs.mkdirSync(PATHS.logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase().padEnd(7)} | ${stack || message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console output (coloured)
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level} | ${message}`;
        })
      )
    }),

    // Full log file
    new winston.transports.File({
      filename: path.join(PATHS.logsDir, 'automation.log'),
      maxsize: 5 * 1024 * 1024, // 5MB rotate
      maxFiles: 3,
    }),

    // Error-only log file
    new winston.transports.File({
      filename: path.join(PATHS.logsDir, 'errors.log'),
      level: 'error',
      maxsize: 2 * 1024 * 1024,
    }),
  ],
});

// ─────────────────────────────────────────────────────────────
//  Run separator — new session ki shuru'at log karo
// ─────────────────────────────────────────────────────────────
export function logSessionStart(totalUsers: number) {
  const line = '═'.repeat(60);
  logger.info(line);
  logger.info(`  SARGODHA VACCINATION CHECK-IN AUTOMATION STARTED`);
  logger.info(`  Total users to process: ${totalUsers}`);
  logger.info(`  Started at: ${new Date().toLocaleString('en-PK')}`);
  logger.info(line);
}

export function logSessionEnd(passed: number, failed: number, skipped: number) {
  const line = '═'.repeat(60);
  logger.info(line);
  logger.info(`  AUTOMATION COMPLETED`);
  logger.info(`  ✅ SUCCESS   : ${passed}`);
  logger.info(`  ❌ FAILED    : ${failed}`);
  logger.info(`  ⏭️  SKIPPED   : ${skipped}`);
  logger.info(`  Ended at: ${new Date().toLocaleString('en-PK')}`);
  logger.info(line);
}

export function logUserStart(srNo: number, name: string, username: string) {
  logger.info(`${'─'.repeat(50)}`);
  logger.info(`[${srNo}] ▶ Processing: ${name} | User: ${username}`);
}

export function logUserResult(srNo: number, status: string, step?: string, error?: string) {
  const icon = status === 'SUCCESS' ? '✅' : '❌';
  logger.info(`[${srNo}] ${icon} Status: ${status} | Step: ${step || 'N/A'}`);
  if (error) logger.error(`[${srNo}]    Error: ${error}`);
}
