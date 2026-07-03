# DIAMO ERP — Manual Test Plan (Stage 0–2)

Use this document to verify everything implemented so far. Mark each item **PASS** / **FAIL** / **SKIP** and note any bugs in the **Notes** column.

---

## Before you start

| Item | Value |
|------|--------|
| Start app | `npm run dev` (Electron + Vite) |
| Default login | Username: `superadmin` · Password: `Admin@123` |
| Database | MySQL must be running; schema seeded via Prisma |
| Fresh DB (optional) | `npx prisma migrate dev` then `npx prisma db seed` |

**Tip:** Use a dedicated test company (e.g. code `TEST01`, name `Test Company Pvt Ltd`) so you do not disturb real data.

---

## How to record results

Copy this table header for each section, or track in a spreadsheet:

| ID | Result | Tester | Date | Notes |
|----|--------|--------|------|-------|
| TC-xxx | PASS / FAIL | | | |

---

## 1. Application shell & navigation

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-001 | App launches | Run `npm run dev`, wait for Electron window | App opens without crash; login or dashboard visible |
| TC-002 | Sidebar navigation | Log in; click each sidebar item under **Masters** | Routes load: Dashboard, Companies, Financial Years, Account Groups, Accounts, Brokers, Qualities |
| TC-003 | Status footer | After login, check bottom bar | Shows user name, active company, active FY (if set), current time |
| TC-004 | Company switcher | Create 2 companies; use header company dropdown | Active company changes; master pages reflect new company data |
| TC-005 | FY switcher | Create 2 financial years; switch in header | Active FY updates in footer/header |
| TC-006 | Logout | User menu → Logout | Returns to login; protected routes redirect to `/login` |
| TC-007 | Session restore | Log in, close app, reopen | Session restored without login flash; still on dashboard |
| TC-008 | Dashboard quick links | Open `/dashboard` | Links work for Companies, FY, Account Groups, Accounts, Brokers, Qualities |

---

## 2. Authentication (Stage 1)

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-010 | Valid login | Enter `superadmin` / `Admin@123`, Sign In | Success toast; redirect to dashboard |
| TC-011 | Invalid password | Wrong password | Error toast; stay on login |
| TC-012 | Empty username | Submit with blank username | Validation error under field |
| TC-013 | Empty password | Submit with blank password | Validation error under field |
| TC-014 | Guest route guard | While logged in, open `/login` | Redirect to dashboard |
| TC-015 | Protected route guard | Log out; open `/dashboard` | Redirect to login |

---

## 3. Company master (Stage 1)

**Route:** `/masters/business/companies`

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-020 | List companies | Open company list | Grid shows companies with code, name, city, GSTIN, status |
| TC-021 | Create company | Add Company → fill General tab (name, code, PAN required fields) → Save | Success; appears in list; default chart of accounts seeded in background |
| TC-022 | Create — Address tab | New company: fill address, state dropdown, pincode | Saves correctly; state list loads |
| TC-023 | Create — Bank tab | New company: bank details | Saves correctly |
| TC-024 | Edit company | Edit existing row → change city → Save | Updates in list |
| TC-025 | Duplicate company code | Create second company with same `companyCode` | Clear error: code already in use |
| TC-026 | Duplicate company name | Same `companyName` as existing | Clear error: name already in use |
| TC-027 | Set default company | Mark one company as default | Default badge on list |
| TC-028 | Delete company (no transactions) | Permanently delete test company with no sales/stock/ledger | Confirm dialog warns permanent delete; company removed; masters (groups, accounts, qualities, FY) removed |
| TC-029 | Delete company blocked | Try delete company that will have ledger/sales later (skip if no txn data yet) | Error explains transactional data blocks delete |
| TC-030 | Reuse company name after delete | Delete `TEST01`, create new company same code/name | Allowed after permanent delete |

---

## 4. Financial year master (Stage 1)

**Route:** `/masters/business/financial-years`

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-040 | List FYs | Select company; open FY page | Lists financial years for active company |
| TC-041 | Create FY — quick year | Pick year from dropdown (e.g. 2025-26) | From/To dates auto-fill (1 Apr – 31 Mar) |
| TC-042 | Create FY — manual dates | Use date inputs / calendar for from & to | Valid FY created |
| TC-043 | Invalid FY dates | Start date not 1 Apr or end not 31 Mar | Validation error |
| TC-044 | Activate FY | Activate one year | Becomes active; header/footer show correct FY |
| TC-045 | Close / reopen FY | Toggle closed status if available | Status updates |
| TC-046 | Duplicate FY period | Create same from/to twice | Error: period already exists |
| TC-047 | No company selected | Switch to state with no company (if possible) | Sensible message to select company |

---

## 5. Account group master (Stage 2)

**Route:** `/masters/accounting/account-groups`

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-050 | Auto-load default chart | Open page for company with no groups | Default chart loads automatically (Assets, Liabilities, Brokers, etc.) |
| TC-051 | Load default chart button | Empty company → click **Load Default Chart** | Success message; tree populated |
| TC-052 | Tree hierarchy | Expand tree on left | Parent/child structure correct; nature badges shown |
| TC-053 | Select group | Click group in tree | Form shows group details on right |
| TC-054 | Create custom group | New Group → name `Jambo`, nature Assets, parent optional → Save | Appears in tree; success toast |
| TC-055 | Duplicate group name | Create another `Jambo` | Error: name already exists |
| TC-056 | Edit custom group | Change nature or parent → Save | Updates in tree |
| TC-057 | System group lock | Select global group (e.g. Assets) | Warning shown; name cannot change; delete disabled |
| TC-058 | Delete custom group | Delete `Jambo` (no accounts in group) | Permanent delete confirm; group removed |
| TC-059 | Reuse name after delete | Create `Jambo` again after delete | Works immediately |
| TC-060 | Delete blocked — child groups | Delete parent while child exists | Error: delete child groups first |
| TC-061 | Delete blocked — accounts | Assign account to group; try delete group | Error: move/delete accounts first |
| TC-062 | Circular parent | Edit group: set parent to its own child | Error: circular reference |

---

## 6. Account master (Stage 2)

**Route:** `/masters/accounting/accounts`

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-070 | List accounts | Open accounts list | Grid shows name, group, city, GSTIN, status; brokers excluded |
| TC-071 | Create — Basic tab | New account: group, name, status → Save | Success toast; redirect to list; row visible |
| TC-072 | Create — Address tab | Fill address, state, mobile, email | Saves on full form submit |
| TC-073 | Create — GST tab | GSTIN, PAN, registration type | Saves correctly |
| TC-074 | Create — Bank tab | Bank account, IFSC | Saves correctly |
| TC-075 | Create — Credit & OB | Credit days/limit, opening balance | Saves correctly |
| TC-076 | Required validation | Submit without account name or group | Field errors shown |
| TC-077 | Duplicate account name | Create two accounts same name (same company) | Error: account already exists |
| TC-078 | Edit account | Edit row → change print name → Save | Updates in list |
| TC-079 | Search | Type partial name in search | List filters |
| TC-080 | Permanent delete | Delete test account (no ledger) | Confirm permanent delete; removed from list |
| TC-081 | Reuse name after delete | Create same account name again | Allowed |
| TC-082 | No duplicate error on save | Create account once; check list immediately | No false error; no “already exists” on first save |
| TC-083 | IPC / list refresh | After create, return to list | Account visible without app restart |

---

## 7. Broker master (Stage 2)

**Route:** `/masters/business/brokers`

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-090 | List brokers | Open brokers list | Only broker accounts listed |
| TC-091 | Create broker | New: name, brokerage %, add/less, TDS, contact → Save | Success; appears in list (not in regular accounts list) |
| TC-092 | Auto Brokers group | Create broker without manual group | Assigned to **Brokers** group automatically |
| TC-093 | Edit broker | Change brokerage % → Save | Updates in list |
| TC-094 | Duplicate broker name | Same name as existing account/broker | Error: account already exists |
| TC-095 | Permanent delete | Delete broker | Removed from broker list; account row hard-deleted |
| TC-096 | Reuse name | Create broker with deleted name | Allowed |
| TC-097 | Broker not in account list | Check `/masters/accounting/accounts` | Broker does not appear (isBroker filter) |

---

## 8. Quality master (Stage 2)

**Route:** `/masters/diamond/qualities`

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-100 | List qualities | Open qualities list | Grid: name, item code, HSN, UQC, sale rate, GST % |
| TC-101 | HSN dropdown | New quality → open HSN list | HSN codes load from master |
| TC-102 | GST auto from HSN | Select HSN on create | GST % prefilled from HSN |
| TC-103 | Create quality | Fill name, item code, HSN, rates, levels → Save | Success; in list |
| TC-104 | Opening balance (create only) | Set carats/pcs/rate on new quality | Saved; fields hidden on edit |
| TC-105 | Duplicate quality name | Same `qualityName` | Error |
| TC-106 | Duplicate item code | Same `itemCode` | Error |
| TC-107 | Min > max validation | Min level > max level | Error on save |
| TC-108 | Edit quality | Change sale rate → Save | Updates |
| TC-109 | Search | Search by quality name | Filters list |
| TC-110 | Permanent delete | Delete quality (no stock packets) | Removed from list |
| TC-111 | Reuse name/code | Recreate after delete | Allowed |

---

## 9. Cross-module & data integrity

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-120 | Multi-company isolation | Create account in Company A; switch to Company B | Company A account not visible in B |
| TC-121 | Company context on masters | Switch company on Account Groups page | Tree reloads for new company |
| TC-122 | Error messages readable | Trigger duplicate name, delete with children, invalid login | Plain English toasts; no Prisma stack traces or “could not be cloned” |
| TC-123 | Form cancel / back | Use back arrow on account/broker/quality form | Returns to list without save |
| TC-124 | Loading states | Slow network / large list | Loading indicator on grids where implemented |

---

## 10. Regression checks (known fixed bugs)

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-130 | Login after IPC fix | Log in with valid credentials | No “cannot destructure userIdHandle” error |
| TC-131 | Account create IPC | Create account | Success on first click; appears in list |
| TC-132 | Broker create IPC | Create broker | Success on first click; appears in list |
| TC-133 | Delete group “Jambo” | Create and delete custom group with no accounts | Deletes without FK / reference errors |
| TC-134 | Decimal serialization | List accounts/brokers with credit limit / brokerage | Grid loads without IPC clone errors |

---

## 11. Suggested end-to-end flow (30-minute smoke test)

Run this once after any major change:

1. **Login** as `superadmin`
2. **Create company** `TEST01` / `Test Company Pvt Ltd`
3. **Create FY** 2025-26 and **activate** it
4. **Account groups** — confirm default chart; add group `Test Group`
5. **Account** — create `Test Customer` under Sundry Debtors
6. **Broker** — create `Test Broker` with 2% brokerage
7. **Quality** — create `VS1` / item code `VS-001` with HSN
8. **Verify lists** — all four appear in correct screens
9. **Delete** quality → broker → account → `Test Group` (order matters if linked)
10. **Logout** and **login** again — session and company context OK

---

## 12. Out of scope (not built yet — expect placeholders or empty)

Do **not** fail these; they are Stage 4+:

- Sale, purchase, challan books
- Cash/bank, journal, ledger reports
- Settings, admin, backups UI

Sidebar links to those routes may exist but functionality is not part of Stage 1–3.

---

## 13. Stock / Inventory (Stage 3)

**Route:** `/inventory/stock` · **Automated:** `npm run verify:test-plan` (TC-210–TC-294)

| ID | Test case | Steps | Expected result |
|----|-----------|-------|-----------------|
| TC-210 | List stock | Open inventory with quality master | Grid loads (empty or with rows) |
| TC-230 | Auto stock ID | New packet without manual ID | Preview `DM-YYYY-XXXXXX` |
| TC-237 | Create stock | Quality + carats + date → Save | Success; detail page opens |
| TC-260 | Media links | Add image/video URLs → Save | Links on detail page |
| TC-242 | Certified validation | Certified without cert number | Validation error |
| TC-286 | Edit sold blocked | Mark sold → try edit | Error; edit button hidden on detail |
| TC-290 | Archive stock | Trash icon → confirm | Removed from list |

---

## Bug report template

When logging a failure:

```
ID: TC-xxx
Module: (e.g. Account Master)
Steps: ...
Expected: ...
Actual: ...
Screenshot: (optional)
Console/terminal error: (paste from Electron devtools or terminal)
```

---

*Last updated: Stage 1–3 — Company, FY, Account Group, Account, Broker, Quality, Stock Inventory.*
