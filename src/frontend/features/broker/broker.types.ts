// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Broker Types
// ═══════════════════════════════════════════════════════════════

import type { IAccount } from '../account/account.types';

export type AddLessType = 'ADD' | 'LESS';

export interface IBrokerProfile {
  id: number;
  accountId: number;
  brokeragePct: number;
  addLess: AddLessType;
  tdsLedgerId: number | null;
  tdsPct: number;
}

export interface IBroker extends IAccount {
  brokerProfile: IBrokerProfile | null;
}
