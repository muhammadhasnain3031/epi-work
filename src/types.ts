// ============================================================
//  types.ts
// ============================================================

export interface UserRow {
  SrNo: number;
  District: string;
  Tehsil: string;
  UnionCouncil: string;
  VaccinatorName: string;
  Username: string;
  Password: string;
  Status?: string;
  Step?: string;
  ErrorMessage?: string;
  Timestamp?: string;
  Screenshot?: string;
  excelRowNumber?: number;
}

export type AutomationStatus =
  | 'SUCCESS'
  | 'CHECKIN_OK'
  | 'CHECKOUT_OK'
  | 'FAILED_LOGIN'
  | 'FAILED_STEP'
  | 'SKIPPED';

export interface RunResult {
  srNo: number;
  vaccinatorName: string;
  username: string;
  status: AutomationStatus;
  step: string;
  errorMessage: string;
  timestamp: string;
  screenshot: string;
}

export interface SessionSummary {
  totalProcessed: number;
  success: number;
  failedLogin: number;
  failedStep: number;
  skipped: number;
  results: RunResult[];
}