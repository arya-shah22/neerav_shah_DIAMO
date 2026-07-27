/**
 * Automated verification for docs/MANUAL_TEST_PLAN.md (Stage 1–3).
 * Runs backend/API logic via NestJS controllers (same path as Electron IPC).
 * UI-only cases are marked SKIP.
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';
import { INestApplicationContext } from '@nestjs/common';
import { bootstrapNestApp } from '../src/backend/main';
import { AuthController } from '../src/backend/modules/auth/auth.controller';
import { CompanyController } from '../src/backend/modules/company/company.controller';
import { FinancialYearController } from '../src/backend/modules/financial-year/fy.controller';
import { AccountGroupController } from '../src/backend/modules/account-group/account-group.controller';
import { AccountController } from '../src/backend/modules/account/account.controller';
import { BrokerController } from '../src/backend/modules/broker/broker.controller';
import { QualityController } from '../src/backend/modules/quality/quality.controller';
import { StockController } from '../src/backend/modules/stock/stock.controller';
import { serializeForIpc } from '../src/backend/utils/serialize-for-ipc';
import type { IApiResponse } from '../src/shared/types/common.types';

config({ path: resolve(__dirname, '../.env') });

type Status = 'PASS' | 'FAIL' | 'SKIP';

interface TestResult {
  id: string;
  name: string;
  status: Status;
  note?: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, status: Status, note?: string) {
  results.push({ id, name, status, note });
}

function skip(id: string, name: string, reason: string) {
  record(id, name, 'SKIP', reason);
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertSuccess(res: IApiResponse, label: string) {
  assert(res.success === true, `${label}: expected success, got error: ${res.error ?? 'unknown'}`);
}

function assertFailure(res: IApiResponse, label: string, contains?: string) {
  assert(res.success === false, `${label}: expected failure, got success`);
  if (contains) {
    assert(
      String(res.error ?? '').toLowerCase().includes(contains.toLowerCase()),
      `${label}: error should contain "${contains}", got: ${res.error}`,
    );
  }
}

function cloneLikeIpc(value: unknown) {
  return JSON.parse(JSON.stringify(serializeForIpc(value)));
}

async function runTest(id: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    record(id, name, 'PASS');
  } catch (error) {
    record(id, name, 'FAIL', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const runId = String(Date.now() % 100000).padStart(5, '0');
  const companyNameA = `Verify Test A ${runId}`;
  const companyNameB = `Verify Test B ${runId}`;

  let app: INestApplicationContext | null = null;
  let companyCodeA = '';
  let companyCodeB = '';
  let companyAId = 0;
  let companyBId = 0;
  let fyId = 0;
  let sundryDebtorsId = 0;
  let jamboGroupId = 0;
  let parentGroupId = 0;
  let childGroupId = 0;
  let accountId = 0;
  let brokerId = 0;
  let qualityId = 0;
  let stockPacketId = 0;
  let stockIdNumber = '';
  let sessionToken = '';

  const auth = () => app!.get(AuthController);
  const company = () => app!.get(CompanyController);
  const fy = () => app!.get(FinancialYearController);
  const accountGroup = () => app!.get(AccountGroupController);
  const account = () => app!.get(AccountController);
  const broker = () => app!.get(BrokerController);
  const quality = () => app!.get(QualityController);
  const stock = () => app!.get(StockController);

  try {
    app = await bootstrapNestApp();

    const allocateCode = async (prefix: string): Promise<string> => {
      const listRes = await company().handleList();
      assertSuccess(listRes, 'company list for code allocation');
      const used = new Set((listRes.data as { companyCode: string }[]).map((c) => c.companyCode));
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
      for (let attempt = 0; attempt < 100; attempt++) {
        const code = `${prefix}${chars[attempt % chars.length]}${chars[(attempt * 7) % chars.length]}`;
        if (!used.has(code)) return code;
      }
      throw new Error('Could not allocate unique 3-char company code');
    };

    companyCodeA = await allocateCode('V');
    companyCodeB = await allocateCode('W');
    const suffix = runId;

    // ─── Section 1: Shell (UI-only) ─────────────────────────
    for (const [id, name] of [
      ['TC-001', 'App launches'],
      ['TC-002', 'Sidebar navigation'],
      ['TC-003', 'Status footer'],
      ['TC-004', 'Company switcher'],
      ['TC-005', 'FY switcher'],
      ['TC-006', 'Logout'],
      ['TC-007', 'Session restore'],
      ['TC-008', 'Dashboard quick links'],
    ] as const) {
      skip(id, name, 'UI-only — requires Electron window');
    }

    // ─── Section 2: Auth ──────────────────────────────────────
    await runTest('TC-010', 'Valid login', async () => {
      const res = await auth().handleLogin({ userIdHandle: 'superadmin', password: 'Admin@123' });
      assertSuccess(res, 'login');
      sessionToken = (res.data as { sessionToken: string }).sessionToken;
      assert(Boolean(sessionToken), 'session token missing');
    });

    await runTest('TC-011', 'Invalid password', async () => {
      const res = await auth().handleLogin({ userIdHandle: 'superadmin', password: 'wrong-password' });
      assertFailure(res, 'invalid password', 'invalid');
    });

    skip('TC-012', 'Empty username', 'Frontend form validation (Zod)');
    skip('TC-013', 'Empty password', 'Frontend form validation (Zod)');
    skip('TC-014', 'Guest route guard', 'Frontend React Router guard');
    skip('TC-015', 'Protected route guard', 'Frontend React Router guard');

    await runTest('TC-130', 'Login after IPC fix', async () => {
      const res = await auth().handleLogin({ userIdHandle: 'superadmin', password: 'Admin@123' });
      assertSuccess(res, 'login');
      assert(
        typeof (res.data as { userIdHandle: string }).userIdHandle === 'string',
        'userIdHandle missing from login response',
      );
    });

    // ─── Section 3: Company ───────────────────────────────────
    await runTest('TC-020', 'List companies', async () => {
      const res = await company().handleList();
      assertSuccess(res, 'company list');
      assert(Array.isArray(res.data), 'company list should be array');
    });

    await runTest('TC-021', 'Create company', async () => {
      const res = await company().handleCreate({
        companyName: companyNameA,
        companyCode: companyCodeA,
        panNumber: 'ABCDE1234F',
        city: 'Mumbai',
      });
      assertSuccess(res, 'create company');
      companyAId = (res.data as { id: number }).id;
      const groups = await accountGroup().handleList(companyAId);
      assertSuccess(groups, 'groups after company create');
      assert((groups.data as unknown[]).length > 0, 'default chart should be seeded');
    });

    await runTest('TC-022', 'Create — Address tab', async () => {
      const states = await company().handleListStates();
      assertSuccess(states, 'states');
      const stateCode = (states.data as { stateCode: string }[])[0]?.stateCode ?? '27';
      const res = await company().handleUpdate({
        id: companyAId,
        data: {
          addressLine1: '123 Test Street',
          city: 'Surat',
          stateCode,
          pincode: '395001',
        },
      });
      assertSuccess(res, 'update address');
      const get = await company().handleGet(companyAId);
      assertSuccess(get, 'get company');
      assert((get.data as { city: string }).city === 'Surat', 'city not updated');
    });

    await runTest('TC-023', 'Create — Bank tab', async () => {
      const res = await company().handleUpdate({
        id: companyAId,
        data: {
          bankName: 'Test Bank',
          bankAccountNumber: '1234567890',
          bankIfsc: 'HDFC0001234',
        },
      });
      assertSuccess(res, 'update bank');
    });

    await runTest('TC-024', 'Edit company', async () => {
      const res = await company().handleUpdate({
        id: companyAId,
        data: { city: 'Ahmedabad' },
      });
      assertSuccess(res, 'edit company');
      assert((res.data as { city: string }).city === 'Ahmedabad', 'city not saved');
    });

    await runTest('TC-025', 'Duplicate company code', async () => {
      const res = await company().handleCreate({
        companyName: `Other ${suffix}`,
        companyCode: companyCodeA,
        panNumber: 'ABCDE1234F',
      });
      assertFailure(res, 'duplicate code', 'code');
    });
    await runTest('TC-026', 'Duplicate company name', async () => {
      const res = await company().handleCreate({
        companyName: companyNameA,
        companyCode: companyCodeB,
        panNumber: 'ABCDE1234F',
      });
      assertFailure(res, 'duplicate name', 'name');
    });

    await runTest('TC-027', 'Set default company', async () => {
      const res = await company().handleUpdate({
        id: companyAId,
        data: { isDefault: true },
      });
      assertSuccess(res, 'set default');
      assert((res.data as { isDefault: boolean }).isDefault === true, 'isDefault not true');
    });

    skip('TC-029', 'Delete company blocked', 'No transactional test data in Stage 1–2');

    // ─── Section 4: Financial Year ────────────────────────────
    await runTest('TC-040', 'List FYs', async () => {
      const res = await fy().handleList(companyAId);
      assertSuccess(res, 'fy list');
      assert(Array.isArray(res.data), 'fy list should be array');
    });

    skip('TC-041', 'Create FY — quick year', 'UI year picker — dates verified via TC-042');

    await runTest('TC-042', 'Create FY — manual dates', async () => {
      const res = await fy().handleCreate({
        companyId: companyAId,
        data: { fromDate: '2025-04-01', toDate: '2026-03-31' },
      });
      assertSuccess(res, 'create fy');
      fyId = (res.data as { id: number }).id;
    });

    await runTest('TC-043', 'Invalid FY dates', async () => {
      const res = await fy().handleCreate({
        companyId: companyAId,
        data: { fromDate: '2025-01-01', toDate: '2025-12-31' },
      });
      assertFailure(res, 'invalid fy dates', 'april');
    });

    await runTest('TC-044', 'Activate FY', async () => {
      const res = await fy().handleActivate({ id: fyId, companyId: companyAId });
      assertSuccess(res, 'activate fy');
      assert((res.data as { isActive: boolean }).isActive === true, 'FY not active');
    });

    await runTest('TC-045', 'Close / reopen FY', async () => {
      const close = await fy().handleToggleClosed({ id: fyId, companyId: companyAId });
      assertSuccess(close, 'close fy');
      assert((close.data as { isClosed: boolean }).isClosed === true, 'FY not closed');
      const reopen = await fy().handleToggleClosed({ id: fyId, companyId: companyAId });
      assertSuccess(reopen, 'reopen fy');
      assert((reopen.data as { isClosed: boolean }).isClosed === false, 'FY not reopened');
    });

    await runTest('TC-046', 'Duplicate FY period', async () => {
      const res = await fy().handleCreate({
        companyId: companyAId,
        data: { fromDate: '2025-04-01', toDate: '2026-03-31' },
      });
      assertFailure(res, 'duplicate fy', 'already exists');
    });

    skip('TC-047', 'No company selected', 'UI empty-state message');

    // ─── Section 5: Account Groups ────────────────────────────
    await runTest('TC-050', 'Auto-load default chart', async () => {
      const res = await accountGroup().handleList(companyAId);
      assertSuccess(res, 'list groups');
      const names = (res.data as { groupName: string }[]).map((g) => g.groupName);
      assert(names.includes('Assets'), 'Assets group missing');
      assert(names.includes('Brokers'), 'Brokers group missing');
      sundryDebtorsId = (res.data as { groupName: string; id: number }[]).find(
        (g) => g.groupName === 'Sundry Debtors',
      )!.id;
    });

    await runTest('TC-051', 'Load default chart button', async () => {
      const res = await accountGroup().handleSeed({ companyId: companyAId });
      assertSuccess(res, 'seed chart');
    });

    skip('TC-052', 'Tree hierarchy', 'UI tree expand/collapse');
    skip('TC-053', 'Select group', 'UI form selection');

    await runTest('TC-054', 'Create custom group', async () => {
      const res = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: 'Jambo', nature: 'ASSETS' },
      });
      assertSuccess(res, 'create Jambo');
      jamboGroupId = (res.data as { id: number }).id;
    });

    await runTest('TC-055', 'Duplicate group name', async () => {
      const res = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: 'Jambo', nature: 'ASSETS' },
      });
      assertFailure(res, 'duplicate group', 'already exists');
    });

    await runTest('TC-056', 'Edit custom group', async () => {
      const res = await accountGroup().handleUpdate({
        id: jamboGroupId,
        companyId: companyAId,
        data: { nature: 'LIABILITIES' },
      });
      assertSuccess(res, 'edit group');
      assert((res.data as { nature: string }).nature === 'LIABILITIES', 'nature not updated');
    });

    await runTest('TC-057', 'System group lock', async () => {
      const assets = (await accountGroup().handleList(companyAId)).data as { groupName: string; id: number }[];
      const assetsId = assets.find((g) => g.groupName === 'Assets')!.id;
      const rename = await accountGroup().handleUpdate({
        id: assetsId,
        companyId: companyAId,
        data: { groupName: 'Renamed Assets' },
      });
      assertFailure(rename, 'rename system group', 'cannot be renamed');
      const del = await accountGroup().handleDelete({ id: assetsId, companyId: companyAId });
      assertFailure(del, 'delete system group', 'cannot be deleted');
    });

    await runTest('TC-058', 'Delete custom group', async () => {
      const res = await accountGroup().handleDelete({ id: jamboGroupId, companyId: companyAId });
      assertSuccess(res, 'delete Jambo');
    });

    await runTest('TC-059', 'Reuse name after delete', async () => {
      const res = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: 'Jambo', nature: 'ASSETS' },
      });
      assertSuccess(res, 'recreate Jambo');
      jamboGroupId = (res.data as { id: number }).id;
      await accountGroup().handleDelete({ id: jamboGroupId, companyId: companyAId });
    });

    await runTest('TC-060', 'Delete blocked — child groups', async () => {
      const parent = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: `Parent${suffix}`, nature: 'ASSETS' },
      });
      assertSuccess(parent, 'create parent');
      parentGroupId = (parent.data as { id: number }).id;
      const child = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: `Child${suffix}`, nature: 'ASSETS', parentGroupId: parentGroupId },
      });
      assertSuccess(child, 'create child');
      childGroupId = (child.data as { id: number }).id;
      const del = await accountGroup().handleDelete({ id: parentGroupId, companyId: companyAId });
      assertFailure(del, 'delete parent with child', 'child groups');
    });

    await runTest('TC-061', 'Delete blocked — accounts', async () => {
      const grp = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: `WithAcct${suffix}`, nature: 'ASSETS' },
      });
      assertSuccess(grp, 'create group');
      const groupId = (grp.data as { id: number }).id;
      const acct = await account().handleCreate({
        companyId: companyAId,
        data: { accountName: `AcctInGroup${suffix}`, accountGroupId: groupId },
      });
      assertSuccess(acct, 'create account in group');
      const del = await accountGroup().handleDelete({ id: groupId, companyId: companyAId });
      assertFailure(del, 'delete group with account', 'contains accounts');
      await account().handleDelete({ id: (acct.data as { id: number }).id, companyId: companyAId });
      await accountGroup().handleDelete({ id: groupId, companyId: companyAId });
    });

    await runTest('TC-062', 'Circular parent', async () => {
      const delChild = await accountGroup().handleDelete({ id: childGroupId, companyId: companyAId });
      assertSuccess(delChild, 'cleanup child');
      const circular = await accountGroup().handleUpdate({
        id: parentGroupId,
        companyId: companyAId,
        data: { parentGroupId: parentGroupId },
      });
      assertFailure(circular, 'self parent', 'own parent');
      const child2 = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: `Child2${suffix}`, nature: 'ASSETS', parentGroupId: parentGroupId },
      });
      assertSuccess(child2, 'create child2');
      const child2Id = (child2.data as { id: number }).id;
      const circ = await accountGroup().handleUpdate({
        id: parentGroupId,
        companyId: companyAId,
        data: { parentGroupId: child2Id },
      });
      assertFailure(circ, 'circular parent', 'circular');
      await accountGroup().handleDelete({ id: child2Id, companyId: companyAId });
      await accountGroup().handleDelete({ id: parentGroupId, companyId: companyAId });
    });

    await runTest('TC-133', 'Delete group “Jambo”', async () => {
      const create = await accountGroup().handleCreate({
        companyId: companyAId,
        data: { groupName: 'Jambo', nature: 'ASSETS' },
      });
      assertSuccess(create, 'create Jambo');
      const id = (create.data as { id: number }).id;
      const del = await accountGroup().handleDelete({ id, companyId: companyAId });
      assertSuccess(del, 'delete Jambo');
    });

    // ─── Section 6: Accounts ──────────────────────────────────
    await runTest('TC-070', 'List accounts', async () => {
      const res = await account().handleList({ companyId: companyAId, isBroker: false });
      assertSuccess(res, 'list accounts');
      assert(Array.isArray(res.data), 'accounts should be array');
    });

    await runTest('TC-071', 'Create — Basic tab', async () => {
      const res = await account().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `Test Customer ${suffix}`,
          accountGroupId: sundryDebtorsId,
          status: 'ACTIVE',
        },
      });
      assertSuccess(res, 'create account');
      accountId = (res.data as { id: number }).id;
    });

    await runTest('TC-072', 'Create — Address tab', async () => {
      const res = await account().handleUpdate({
        id: accountId,
        companyId: companyAId,
        data: {
          addressLine1: 'Addr 1',
          city: 'Surat',
          stateCode: '24',
          mobile: '9876543210',
          email: 'test@example.com',
        },
      });
      assertSuccess(res, 'update address');
    });

    await runTest('TC-073', 'Create — GST tab', async () => {
      const res = await account().handleUpdate({
        id: accountId,
        companyId: companyAId,
        data: {
          gstinNumber: '24AABCU9603R1ZM',
          panNumber: 'AABCU9603R',
          gstRegType: 'REGISTERED',
        },
      });
      assertSuccess(res, 'update gst');
    });

    await runTest('TC-074', 'Create — Bank tab', async () => {
      const res = await account().handleUpdate({
        id: accountId,
        companyId: companyAId,
        data: {
          bankAccountNumber: '1111222233',
          bankIfsc: 'SBIN0001234',
        },
      });
      assertSuccess(res, 'update bank');
    });

    await runTest('TC-075', 'Create — Credit & OB', async () => {
      const res = await account().handleUpdate({
        id: accountId,
        companyId: companyAId,
        data: {
          creditDays: 30,
          creditLimit: 50000,
          openingBalance: 1000,
          openingBalanceType: 'DEBIT',
        },
      });
      assertSuccess(res, 'update credit/ob');
    });

    skip('TC-076', 'Required validation', 'Frontend form validation');

    await runTest('TC-077', 'Duplicate account name', async () => {
      const res = await account().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `Test Customer ${suffix}`,
          accountGroupId: sundryDebtorsId,
        },
      });
      assertFailure(res, 'duplicate account', 'already exists');
    });

    await runTest('TC-078', 'Edit account', async () => {
      const res = await account().handleUpdate({
        id: accountId,
        companyId: companyAId,
        data: { printName: `Print ${suffix}` },
      });
      assertSuccess(res, 'edit account');
    });

    await runTest('TC-079', 'Search', async () => {
      const res = await account().handleList({
        companyId: companyAId,
        search: 'Test Customer',
        isBroker: false,
      });
      assertSuccess(res, 'search accounts');
      const rows = res.data as { accountName: string }[];
      assert(rows.some((r) => r.accountName.includes('Test Customer')), 'search should find account');
    });

    await runTest('TC-080', 'Permanent delete', async () => {
      const res = await account().handleDelete({ id: accountId, companyId: companyAId });
      assertSuccess(res, 'delete account');
      const list = await account().handleList({ companyId: companyAId, isBroker: false });
      const rows = list.data as { id: number }[];
      assert(!rows.some((r) => r.id === accountId), 'account still in list');
    });

    await runTest('TC-081', 'Reuse name after delete', async () => {
      const res = await account().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `Test Customer ${suffix}`,
          accountGroupId: sundryDebtorsId,
        },
      });
      assertSuccess(res, 'recreate account');
      accountId = (res.data as { id: number }).id;
    });

    await runTest('TC-082', 'No duplicate error on save', async () => {
      const res = await account().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `Unique Acct ${suffix}`,
          accountGroupId: sundryDebtorsId,
        },
      });
      assertSuccess(res, 'first save');
      const list = await account().handleList({ companyId: companyAId, isBroker: false });
      assertSuccess(list, 'list after create');
      const rows = list.data as { accountName: string }[];
      assert(rows.some((r) => r.accountName === `Unique Acct ${suffix}`), 'account visible in list');
    });

    await runTest('TC-083', 'IPC / list refresh', async () => {
      const res = await account().handleList({ companyId: companyAId, isBroker: false });
      assertSuccess(res, 'list refresh');
      cloneLikeIpc(res.data);
    });

    await runTest('TC-131', 'Account create IPC', async () => {
      const res = await account().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `IPC Account ${suffix}`,
          accountGroupId: sundryDebtorsId,
          creditLimit: 25000,
        },
      });
      assertSuccess(res, 'ipc account create');
      cloneLikeIpc(res.data);
    });

    await runTest('TC-134', 'Decimal serialization', async () => {
      const list = await account().handleList({ companyId: companyAId, isBroker: false });
      assertSuccess(list, 'account list for serialization');
      cloneLikeIpc(list.data);
    });

    // ─── Section 7: Brokers ───────────────────────────────────
    await runTest('TC-090', 'List brokers', async () => {
      const res = await broker().handleList(companyAId);
      assertSuccess(res, 'list brokers');
    });

    await runTest('TC-091', 'Create broker', async () => {
      const res = await broker().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `Test Broker ${suffix}`,
          brokeragePct: 2,
          addLess: 'ADD',
          tdsPct: 0,
        },
      });
      assertSuccess(res, 'create broker');
      brokerId = (res.data as { id: number }).id;
    });

    await runTest('TC-092', 'Auto Brokers group', async () => {
      const res = await broker().handleGet({ id: brokerId, companyId: companyAId });
      assertSuccess(res, 'get broker');
      const groupName = (res.data as { accountGroup: { groupName: string } }).accountGroup.groupName;
      assert(groupName === 'Brokers', `expected Brokers group, got ${groupName}`);
    });

    await runTest('TC-093', 'Edit broker', async () => {
      const res = await broker().handleUpdate({
        id: brokerId,
        companyId: companyAId,
        data: { brokeragePct: 3 },
      });
      assertSuccess(res, 'edit broker');
    });

    await runTest('TC-094', 'Duplicate broker name', async () => {
      const res = await broker().handleCreate({
        companyId: companyAId,
        data: { accountName: `Test Broker ${suffix}`, brokeragePct: 1 },
      });
      assertFailure(res, 'duplicate broker', 'already exists');
    });

    await runTest('TC-095', 'Permanent delete', async () => {
      const res = await broker().handleDelete({ id: brokerId, companyId: companyAId });
      assertSuccess(res, 'delete broker');
    });

    await runTest('TC-096', 'Reuse name', async () => {
      const res = await broker().handleCreate({
        companyId: companyAId,
        data: { accountName: `Test Broker ${suffix}`, brokeragePct: 2 },
      });
      assertSuccess(res, 'recreate broker');
      brokerId = (res.data as { id: number }).id;
    });

    await runTest('TC-097', 'Broker not in account list', async () => {
      const res = await account().handleList({ companyId: companyAId, isBroker: false });
      assertSuccess(res, 'account list');
      const rows = res.data as { id: number; isBroker?: boolean }[];
      assert(!rows.some((r) => r.id === brokerId), 'broker should not appear in non-broker list');
    });

    await runTest('TC-132', 'Broker create IPC', async () => {
      const res = await broker().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `IPC Broker ${suffix}`,
          brokeragePct: 1.5,
        },
      });
      assertSuccess(res, 'broker ipc create');
      cloneLikeIpc(res.data);
      await broker().handleDelete({ id: (res.data as { id: number }).id, companyId: companyAId });
    });

    // ─── Section 8: Qualities ─────────────────────────────────
    await runTest('TC-100', 'List qualities', async () => {
      const res = await quality().handleList({ companyId: companyAId });
      assertSuccess(res, 'list qualities');
    });

    await runTest('TC-101', 'HSN dropdown', async () => {
      const res = await quality().handleHsnList();
      assertSuccess(res, 'hsn list');
      assert((res.data as unknown[]).length > 0, 'HSN codes should be seeded');
    });

    await runTest('TC-102', 'GST auto from HSN', async () => {
      const hsn = await quality().handleHsnList();
      const first = (hsn.data as { hsnCode: string; gstPct: unknown }[])[0];
      assert(Boolean(first?.hsnCode), 'HSN code missing');
      assert(first.gstPct != null, 'GST % missing on HSN');
    });

    await runTest('TC-103', 'Create quality', async () => {
      const res = await quality().handleCreate({
        companyId: companyAId,
        data: {
          qualityName: `VS1 ${suffix}`,
          itemCode: `VS-${suffix}`,
          hsnNumber: '71023910',
          saleRate: 1000,
          purchaseRate: 800,
          gstPct: 0.25,
        },
      });
      assertSuccess(res, 'create quality');
      qualityId = (res.data as { id: number }).id;
    });

    await runTest('TC-104', 'Opening balance (create only)', async () => {
      const res = await quality().handleCreate({
        companyId: companyAId,
        data: {
          qualityName: `OB ${suffix}`,
          itemCode: `OB-${suffix}`,
          hsnNumber: '71023910',
          openingBalanceCarats: 10,
          openingBalancePcs: 5,
          openingBalanceRate: 500,
        },
      });
      assertSuccess(res, 'quality with opening balance');
      await quality().handleDelete({ id: (res.data as { id: number }).id, companyId: companyAId });
    });

    await runTest('TC-105', 'Duplicate quality name', async () => {
      const res = await quality().handleCreate({
        companyId: companyAId,
        data: {
          qualityName: `VS1 ${suffix}`,
          itemCode: `OTHER-${suffix}`,
          hsnNumber: '71023910',
        },
      });
      assertFailure(res, 'duplicate quality name', 'name already exists');
    });

    await runTest('TC-106', 'Duplicate item code', async () => {
      const res = await quality().handleCreate({
        companyId: companyAId,
        data: {
          qualityName: `Other Quality ${suffix}`,
          itemCode: `VS-${suffix}`,
          hsnNumber: '71023910',
        },
      });
      assertFailure(res, 'duplicate item code', 'item code already exists');
    });

    await runTest('TC-107', 'Min > max validation', async () => {
      const res = await quality().handleUpdate({
        id: qualityId,
        companyId: companyAId,
        data: { minLevel: 100, maxLevel: 10 },
      });
      assertFailure(res, 'min > max', 'min level');
    });

    await runTest('TC-108', 'Edit quality', async () => {
      const res = await quality().handleUpdate({
        id: qualityId,
        companyId: companyAId,
        data: { saleRate: 1200 },
      });
      assertSuccess(res, 'edit quality');
    });

    // ─── Section 8b: Stock / Inventory (Stage 3) ────────────────
    skip('TC-200', 'Sidebar link', 'UI navigation');
    skip('TC-201', 'No company selected', 'UI empty-state');
    skip('TC-202', 'No quality master', 'UI empty-state with Add Quality button');
    skip('TC-203', 'Dashboard link', 'UI navigation');

    await runTest('TC-210', 'Empty stock list', async () => {
      const res = await stock().handleList({ companyId: companyAId });
      assertSuccess(res, 'stock list');
      assert(Array.isArray(res.data), 'stock list should be array');
    });

    await runTest('TC-230', 'Auto stock ID preview', async () => {
      const res = await stock().handlePreviewId({ companyId: companyAId });
      assertSuccess(res, 'preview stock id');
      const id = res.data as string;
      assert(/^DM-\d{4}-\d{6}$/.test(id), `expected DM-YYYY-XXXXXX format, got ${id}`);
    });

    await runTest('TC-237', 'Minimal create stock', async () => {
      const res = await stock().handleCreate({
        companyId: companyAId,
        data: {
          qualityId,
          caratWeight: 1.25,
          registrationDate: '2026-01-15',
          shape: 'Oval',
        },
      });
      assertSuccess(res, 'create stock');
      const packet = res.data as { id: number; stockIdNumber: string; shape: string };
      stockPacketId = packet.id;
      stockIdNumber = packet.stockIdNumber;
      assert(packet.shape === 'Oval', 'shape not saved');
      cloneLikeIpc(res.data);
    });

    await runTest('TC-260', 'Media links on create', async () => {
      const res = await stock().handleUpdate({
        id: stockPacketId,
        companyId: companyAId,
        data: {
          imageLink: 'https://example.com/diamond.jpg',
          videoLink: 'https://example.com/diamond.mp4',
        },
      });
      assertSuccess(res, 'update media links');
      const packet = res.data as { imageLink: string; videoLink: string };
      assert(packet.imageLink === 'https://example.com/diamond.jpg', 'image link missing');
      assert(packet.videoLink === 'https://example.com/diamond.mp4', 'video link missing');
    });

    await runTest('TC-212', 'Search stock by ID', async () => {
      const res = await stock().handleList({
        companyId: companyAId,
        search: stockIdNumber.slice(0, 8),
      });
      assertSuccess(res, 'search stock');
      const rows = res.data as { stockIdNumber: string }[];
      assert(rows.some((r) => r.stockIdNumber === stockIdNumber), 'search should find stock');
    });

    await runTest('TC-215', 'Status filter', async () => {
      const res = await stock().handleList({ companyId: companyAId, status: 'AVAILABLE' });
      assertSuccess(res, 'status filter');
      const rows = res.data as { currentStatus: string }[];
      assert(rows.every((r) => r.currentStatus === 'AVAILABLE'), 'filter should return only AVAILABLE');
    });

    await runTest('TC-216', 'Category filter', async () => {
      const res = await stock().handleList({ companyId: companyAId, category: 'NON_CERTIFIED' });
      assertSuccess(res, 'category filter');
      const rows = res.data as { category: string }[];
      assert(rows.every((r) => r.category === 'NON_CERTIFIED'), 'filter should return only NON_CERTIFIED');
    });

    await runTest('TC-274', 'Timeline on create', async () => {
      const res = await stock().handleTimeline({ id: stockPacketId, companyId: companyAId });
      assertSuccess(res, 'timeline');
      const rows = res.data as { movementType: string; newStatus: string }[];
      assert(rows.length >= 1, 'timeline should have creation movement');
      assert(rows.some((m) => m.movementType === 'STOCK_CREATION'), 'missing STOCK_CREATION');
    });

    await runTest('TC-283', 'Status change with timeline', async () => {
      const res = await stock().handleUpdate({
        id: stockPacketId,
        companyId: companyAId,
        data: { currentStatus: 'HOLD', statusRemarks: 'QA hold' },
      });
      assertSuccess(res, 'status change');
      assert((res.data as { currentStatus: string }).currentStatus === 'HOLD', 'status not HOLD');
      const timeline = await stock().handleTimeline({ id: stockPacketId, companyId: companyAId });
      assertSuccess(timeline, 'timeline after status change');
      const rows = timeline.data as { movementType: string; remarks: string | null }[];
      assert(
        rows.some((m) => m.movementType === 'MANUAL_ADJUSTMENT' && m.remarks === 'QA hold'),
        'missing manual adjustment movement',
      );
    });

    await runTest('TC-242', 'Certified without certificate', async () => {
      const res = await stock().handleCreate({
        companyId: companyAId,
        data: {
          qualityId,
          caratWeight: 0.5,
          registrationDate: '2026-01-15',
          category: 'CERTIFIED',
        },
      });
      assertFailure(res, 'certified without cert', 'certificate number');
    });

    await runTest('TC-243', 'Certified with certificate', async () => {
      const res = await stock().handleCreate({
        companyId: companyAId,
        data: {
          qualityId,
          caratWeight: 0.75,
          registrationDate: '2026-01-15',
          category: 'CERTIFIED',
          certificateType: 'GIA',
          certificateNumber: `CERT-${suffix}`,
        },
      });
      assertSuccess(res, 'certified stock');
      await stock().handleDelete({ id: (res.data as { id: number }).id, companyId: companyAId });
    });

    await runTest('TC-245', 'Duplicate certificate number', async () => {
      const cert = `DUP-CERT-${suffix}`;
      const first = await stock().handleCreate({
        companyId: companyAId,
        data: {
          qualityId,
          caratWeight: 0.5,
          registrationDate: '2026-01-15',
          category: 'CERTIFIED',
          certificateNumber: cert,
        },
      });
      assertSuccess(first, 'first cert stock');
      const dup = await stock().handleCreate({
        companyId: companyAId,
        data: {
          qualityId,
          caratWeight: 0.5,
          registrationDate: '2026-01-15',
          category: 'CERTIFIED',
          certificateNumber: cert,
        },
      });
      assertFailure(dup, 'duplicate cert', 'already in use');
      await stock().handleDelete({ id: (first.data as { id: number }).id, companyId: companyAId });
    });

    await runTest('TC-232', 'Manual stock ID', async () => {
      const manualId = `TST-${suffix}`;
      const res = await stock().handleCreate({
        companyId: companyAId,
        data: {
          stockIdNumber: manualId,
          qualityId,
          caratWeight: 0.9,
          registrationDate: '2026-01-15',
        },
      });
      assertSuccess(res, 'manual id stock');
      assert((res.data as { stockIdNumber: string }).stockIdNumber === manualId, 'manual id not saved');
      await stock().handleDelete({ id: (res.data as { id: number }).id, companyId: companyAId });
    });

    await runTest('TC-233', 'Duplicate stock ID', async () => {
      const res = await stock().handleCreate({
        companyId: companyAId,
        data: {
          stockIdNumber: stockIdNumber,
          qualityId,
          caratWeight: 0.5,
          registrationDate: '2026-01-15',
        },
      });
      assertFailure(res, 'duplicate stock id', 'already exists');
    });

    await runTest('TC-255', 'Custom shape in shape list', async () => {
      const res = await stock().handleListShapes(companyAId);
      assertSuccess(res, 'shape list');
      const shapes = res.data as string[];
      assert(shapes.some((s) => s.toLowerCase() === 'oval'), 'Oval shape should be in list');
    });

    await runTest('TC-281', 'Stock ID cannot change on update', async () => {
      const res = await stock().handleUpdate({
        id: stockPacketId,
        companyId: companyAId,
        data: { stockIdNumber: 'CHANGED-ID' },
      });
      assertFailure(res, 'change stock id', 'cannot be changed');
    });

    await runTest('TC-286', 'Edit sold stock blocked', async () => {
      const tempQuality = await quality().handleCreate({
        companyId: companyAId,
        data: {
          qualityName: `SoldTest ${suffix}`,
          itemCode: `SOLD-${suffix}`,
          hsnNumber: '71023910',
        },
      });
      assertSuccess(tempQuality, 'temp quality for sold test');
      const tempQualityId = (tempQuality.data as { id: number }).id;
      const created = await stock().handleCreate({
        companyId: companyAId,
        data: {
          qualityId: tempQualityId,
          caratWeight: 0.55,
          registrationDate: '2026-01-15',
        },
      });
      assertSuccess(created, 'create stock for sold test');
      const soldId = (created.data as { id: number }).id;
      const markSold = await stock().handleUpdate({
        id: soldId,
        companyId: companyAId,
        data: { currentStatus: 'SOLD' },
      });
      assertSuccess(markSold, 'mark sold');
      const edit = await stock().handleUpdate({
        id: soldId,
        companyId: companyAId,
        data: { color: 'D' },
      });
      assertFailure(edit, 'edit sold', 'cannot edit');
    });

    await runTest('TC-294', 'Archive sold stock blocked', async () => {
      const tempQuality = await quality().handleCreate({
        companyId: companyAId,
        data: {
          qualityName: `ArchSold ${suffix}`,
          itemCode: `ASOLD-${suffix}`,
          hsnNumber: '71023910',
        },
      });
      assertSuccess(tempQuality, 'temp quality for archive-sold test');
      const tempQualityId = (tempQuality.data as { id: number }).id;
      const created = await stock().handleCreate({
        companyId: companyAId,
        data: {
          qualityId: tempQualityId,
          caratWeight: 0.6,
          registrationDate: '2026-01-15',
        },
      });
      assertSuccess(created, 'create stock for archive-sold test');
      const soldId = (created.data as { id: number }).id;
      await stock().handleUpdate({
        id: soldId,
        companyId: companyAId,
        data: { currentStatus: 'SOLD' },
      });
      const res = await stock().handleDelete({ id: soldId, companyId: companyAId });
      assertFailure(res, 'archive sold', 'sold');
    });

    await runTest('TC-290', 'Archive stock packet', async () => {
      const res = await stock().handleDelete({ id: stockPacketId, companyId: companyAId });
      assertSuccess(res, 'archive stock');
      const list = await stock().handleList({ companyId: companyAId });
      const rows = list.data as { id: number }[];
      assert(!rows.some((r) => r.id === stockPacketId), 'archived stock still in list');
    });

    await runTest('TC-292', 'Reuse stock ID after archive', async () => {
      const res = await stock().handleCreate({
        companyId: companyAId,
        data: {
          stockIdNumber: stockIdNumber,
          qualityId,
          caratWeight: 1.0,
          registrationDate: '2026-01-16',
        },
      });
      assertSuccess(res, 'reuse stock id');
      stockPacketId = (res.data as { id: number }).id;
    });

    skip('TC-300', 'Stock form dropdowns', 'UI custom Select components');
    skip('TC-301', 'Stock list filter dropdowns', 'UI custom Select components');

    await runTest('TC-109', 'Search', async () => {
      const res = await quality().handleList({ companyId: companyAId, search: 'VS1' });
      assertSuccess(res, 'search qualities');
      const rows = res.data as { qualityName: string }[];
      assert(rows.some((r) => r.qualityName.includes('VS1')), 'search should find quality');
    });

    await runTest('TC-110', 'Permanent delete', async () => {
      const list = await stock().handleList({ companyId: companyAId });
      assertSuccess(list, 'list stock for cleanup');
      for (const row of list.data as { id: number; currentStatus: string }[]) {
        if (row.currentStatus !== 'SOLD') {
          const archived = await stock().handleDelete({ id: row.id, companyId: companyAId });
          assertSuccess(archived, `archive stock ${row.id}`);
        }
      }
      stockPacketId = 0;
      const res = await quality().handleDelete({ id: qualityId, companyId: companyAId });
      assertSuccess(res, 'delete quality');
    });

    await runTest('TC-111', 'Reuse name/code', async () => {
      const res = await quality().handleCreate({
        companyId: companyAId,
        data: {
          qualityName: `VS1 ${suffix}`,
          itemCode: `VS-${suffix}`,
          hsnNumber: '71023910',
        },
      });
      assertSuccess(res, 'recreate quality');
      qualityId = (res.data as { id: number }).id;
      await quality().handleDelete({ id: qualityId, companyId: companyAId });
    });

    // ─── Section 9: Cross-module ──────────────────────────────
    await runTest('TC-120', 'Multi-company isolation', async () => {
      const createB = await company().handleCreate({
        companyName: companyNameB,
        companyCode: companyCodeB,
        panNumber: 'ABCDE1234F',
      });
      assertSuccess(createB, 'create company B');
      companyBId = (createB.data as { id: number }).id;
      const stockB = await stock().handleList({ companyId: companyBId });
      assertSuccess(stockB, 'stock list B');
      const idsB = (stockB.data as { stockIdNumber: string }[]).map((s) => s.stockIdNumber);
      assert(!idsB.includes(stockIdNumber), 'Company A stock visible in Company B');
      const acctA = await account().handleList({ companyId: companyAId, isBroker: false });
      const acctB = await account().handleList({ companyId: companyBId, isBroker: false });
      assertSuccess(acctA, 'list A');
      assertSuccess(acctB, 'list B');
      const namesA = (acctA.data as { accountName: string }[]).map((a) => a.accountName);
      const namesB = (acctB.data as { accountName: string }[]).map((a) => a.accountName);
      assert(
        !namesB.some((n) => namesA.includes(n) && n.includes(suffix)),
        'Company A accounts visible in Company B',
      );
    });

    skip('TC-121', 'Company context on masters', 'UI reload on company switch');

    await runTest('TC-122', 'Error messages readable', async () => {
      const dup = await account().handleCreate({
        companyId: companyAId,
        data: {
          accountName: `Test Customer ${suffix}`,
          accountGroupId: sundryDebtorsId,
        },
      });
      assertFailure(dup, 'duplicate');
      assert(!String(dup.error).includes('Prisma'), 'error should not expose Prisma');
      assert(!String(dup.error).includes('clone'), 'error should not mention clone');
      const badLogin = await auth().handleLogin({ userIdHandle: 'superadmin', password: 'bad' });
      assertFailure(badLogin, 'bad login');
      assert(!String(badLogin.error).includes('Prisma'), 'login error should be plain English');
    });

    skip('TC-123', 'Form cancel / back', 'UI navigation');
    skip('TC-124', 'Loading states', 'UI loading indicators');

    // ─── Cleanup & company delete tests ───────────────────────
    await runTest('TC-028', 'Delete company (no transactions)', async () => {
      await broker().handleDelete({ id: brokerId, companyId: companyAId });
      await account().handleDelete({ id: accountId, companyId: companyAId });
      if (stockPacketId) {
        await stock().handleDelete({ id: stockPacketId, companyId: companyAId });
      }
      const del = await company().handleDelete(companyAId);
      assertSuccess(del, 'delete company A');
      const get = await company().handleGet(companyAId);
      assertFailure(get, 'get deleted company');
    });

    await runTest('TC-030', 'Reuse company name after delete', async () => {
      const res = await company().handleCreate({
        companyName: companyNameA,
        companyCode: companyCodeA,
        panNumber: 'ABCDE1234F',
      });
      assertSuccess(res, 'recreate company after delete');
      companyAId = (res.data as { id: number }).id;
    });

    if (companyBId) {
      await company().handleDelete(companyBId);
    }
    if (companyAId) {
      await company().handleDelete(companyAId);
    }
  } catch (error) {
    console.error('\nFatal error running verification:', error);
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
  }

  printReport();
  const failed = results.filter((r) => r.status === 'FAIL').length;
  if (failed > 0) process.exitCode = 1;
}

function printReport() {
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const total = results.length;

  console.log('\n════════════════════════════════════════════════════════');
  console.log(' DIAMO ERP — Manual Test Plan Verification Report');
  console.log('════════════════════════════════════════════════════════\n');
  console.log(`Total test cases:  ${total}`);
  console.log(`  PASS:            ${passed}`);
  console.log(`  FAIL:            ${failed}`);
  console.log(`  SKIP (UI/manual): ${skipped}`);
  console.log(
    `\nAutomated coverage: ${passed + failed} runnable (${Math.round(((passed + failed) / total) * 100)}%), ` +
      `${passed} passed of ${passed + failed} run`,
  );

  if (failed > 0) {
    console.log('\n── FAILURES ─────────────────────────────────────────────');
    for (const r of results.filter((x) => x.status === 'FAIL')) {
      console.log(`  ${r.id}  ${r.name}`);
      console.log(`         ${r.note}`);
    }
  }

  if (skipped > 0) {
    console.log('\n── SKIPPED (UI / manual) ────────────────────────────────');
    for (const r of results.filter((x) => x.status === 'SKIP')) {
      console.log(`  ${r.id}  ${r.name} — ${r.note}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════\n');
}

main();
