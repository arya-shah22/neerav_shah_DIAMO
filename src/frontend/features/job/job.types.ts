// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Job Book Typings (Stage 8 / Phase 7)
// ═══════════════════════════════════════════════════════════════

import { JobType, VoucherStatus } from '@prisma/client';
import { IAccount } from '../account/account.types';
import { IQuality } from '../quality/quality.types';

export interface IJobVoucherItem {
  id?: number;
  jobVoucherId?: number;
  rowNumber: number;
  qualityId: number;
  quality?: IQuality;
  carats: number;
  pieces: number;
  rate: number;
  amount: number;
  stockPacketId?: number | null;
  remarks?: string | null;
}

export interface IJobCostEntry {
  id: number;
  jobVoucherId: number;
  stockPacketId: number;
  costType: string;
  amount: number;
  remarks?: string;
  createdAt: string;
}

export interface IJobVoucher {
  id: number;
  companyId: number;
  financialYearId: number;
  jobType: JobType;
  voucherNumber: string;
  billNumber: string;
  voucherDate: string | Date;
  status: VoucherStatus;
  partyId: number;
  party?: IAccount;
  totalCarats: number;
  totalAmount: number;
  narration?: string | null;
  items: IJobVoucherItem[];
  costEntries?: IJobCostEntry[];
  createdAt: string;
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  [JobType.JOB_INCOME]: 'Job Income (Services Outward)',
  [JobType.JOB_EXPENSE]: 'Job Expense (Services Billed)',
};

export const JOB_TYPE_BADGE_VARIANT: Record<JobType, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  [JobType.JOB_INCOME]: 'success',
  [JobType.JOB_EXPENSE]: 'warning',
};
