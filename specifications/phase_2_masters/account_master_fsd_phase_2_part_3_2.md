# DIAMO ERP – PHASE 2 PART 3.2
## ACCOUNT MASTER – FUNCTIONAL SPECIFICATION

---

## 1. Executive Summary
This Functional Specification Document (FSD) defines the operational properties, business validation criteria, security constraints, and database relationships of the Account Master module in DIAMO ERP. This module acts as the directory for all external entities (customers, suppliers, brokers, banks) and internal general ledger accounts, mapping them directly to transactional and tax operations.

---

## 2. Business Purpose
The Account Master holds the definitions for every ledger account:
*   **Transactional Ledger Matching:** Connects operations (such as a polished diamond sale) to a specific buyer ledger, initiating debtor balances.
*   **Duplicate Elimination:** Prevents double-entry errors by enforcing unique legal name requirements.
*   **Tax Identity Mapping:** Holds PAN, GST, and TDS/TCS configurations required to prepare automated tax reports.
*   **Credit Compliance:** Establishes credit limits and terms to control exposure.

---

## 3. Business Importance
*   **Sales/Purchase:** Captures tax profiles, billing/shipping addresses, and currency terms during voucher creation.
*   **Finance & Cash Flow:** Controls banking parameters (IFSC, Bank Name, Account Numbers) for bank transfers.
*   **Tax Auditing (GST/TDS/TCS):** Applies correct statutory deductions automatically based on party tax parameters.
*   **Financial Reports:** Feeds ledger activity directly into the Trial Balance, Balance Sheet, and Day Book.

---

## 4. Page Overview
The Account Master page provides the primary interface for managing accounting ledgers.
*   **Primary Objective:** Provide a fast, keyboard-first form to create and maintain ledger accounts.
*   **Secondary Objectives:** Validate legal registration IDs, verify bank details, and track credit constraints.
*   **Success Criteria:** Zero duplicate ledger profiles, automated tax parameter selection during invoice entry, and low-latency database queries.

---

## 5. Users & Permissions

| Role | Permissions | Operation Scope |
| :--- | :--- | :--- |
| **Owner / Executive** | Read-Only | Reviewing party balances, credit settings, and trading metrics. |
| **Administrator** | Full Access | Creating/editing ledgers, adjusting credit parameters, overrides. |
| **Accountant** | Create, Edit, View | Creating party ledgers, assigning tax terms. Cannot delete active ledgers. |
| **Sales User** | Read-Only | Searching and selecting customer accounts. |
| **Purchase User** | Read-Only | Searching and selecting supplier accounts. |
| **Auditor** | View, Export | Reviewing ledger tax credentials and compliance entries. |

---

## 6. Navigation
*   **Module:** Masters
*   **Sub-Module:** Accounting Masters
*   **Breadcrumb Path:** `Masters / Accounting Masters / Account Master`
*   **Target Page URI:** `/masters/accounting/accounts`

---

## 7. Screen Layout Review
The screen layout is divided into a search-listing panel and a detail entry panel:
1.  **Search Pane (Left - 30%):** Search field with list showing account names, groups, and status indicators.
2.  **Detail Pane (Right - 70%):** Tabbed interface organizing ledger parameters:
    *   *Tab 1: Basic Information*
    *   *Tab 2: Address & Contact Details*
    *   *Tab 3: GST & Tax Details*
    *   *Tab 4: Bank Details*
    *   *Tab 5: Credit & Settlement Terms*
    *   *Tab 6: TDS / TCS Settings*
3.  **Command Toolbar (Top):** Action buttons (New, Edit, Save, Cancel, Delete, Refresh, Export, Print).

---

## 8. Field Specification Review

| Field Name | Type | Section | Required? | Validation Rules | Default | Business Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Account Name** | Text | Basic Info | Yes | Unique name. Max 150 chars. | None | Legal name of the party or ledger. |
| **Account Group**| Dropdown | Basic Info | Yes | Must match active Account Group. | None | Parent category for financial reports. |
| **GSTIN** | Text | GST Details | Optional | 15-character alphanumeric format. | None | India GST Registration Number. |
| **PAN** | Text | GST Details | Optional | 10-character alphanumeric format. | None | Permanent Account Number. |
| **Credit Limit** | Decimal | Credit Details| Optional | Non-negative numeric value. | 0.00 | Maximum credit exposure allowed. |
| **Credit Days** | Integer | Credit Details| Optional | Non-negative integer. | 0 | Standard invoice settlement duration. |
| **TDS Category** | Dropdown | TDS Details | Optional | Reference to statutory tax rules. | Exempt | Applicable withholding rate profile. |
| **Status** | Dropdown | Basic Info | Yes | Active, Inactive, Blocked. | Active | Governs transactional usability. |

---

## 9. Section Review
1.  **Basic Information:** Identifies name, alias, group, and status.
2.  **Address & Contact Details:** Shipping and billing locations, primary phone, email, and contact person names.
3.  **GST Details:** Captures GST registration type (Registered, Composition, Unregistered, SEZ) and registration number.
4.  **Bank Details:** Bank name, account number, branch details, and IFSC.
5.  **Credit Details:** Credit limits and credit days warning thresholds.
6.  **TDS / TCS Settings:** Maps withholding tax classifications (e.g., Section 194C, Section 194Q) to the party ledger.

---

## 10. Button Behaviour
*   **New (`Ctrl + N`):** Switches detail pane to Edit Mode with cleared input fields, auto-focusing the "Account Name" input.
*   **Save (`Ctrl + S`):** Triggers validations (duplicate name checks, GSTIN check, PAN check). Writes to the database and raises a success toast on completion.
*   **Cancel (`Esc`):** Discards form inputs and reverts fields to read-only views.
*   **Delete (`Ctrl + D`):** Checks if ledger has transaction logs. If clear, prompts with confirmation modal before deleting.

---

## 11. Business Rules
1.  **Strict Name Uniqueness:** Ledger names must be unique within the active company partition.
2.  **Parent-Group Association:** Every ledger must be mapped to a valid, active Account Group.
3.  **Blocked Status Control:** Marking an account as "Blocked" prevents users from generating new Sales Invoices or memo transactions for this party.
4.  **Active Status Control:** "Inactive" accounts are hidden from transaction dropdown menus.
5.  **Credit Overruns:** When a sales invoice exceeds a customer’s Credit Limit, the ERP blocks submission unless approved by an Administrator.

---

## 12. Validation Rules
*   **GSTIN Format:** Checked against standard format: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`.
*   **PAN Format:** Checked against standard format: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`.
*   **IFSC Format:** Checked against standard format: `^[A-Z]{4}0[A-Z0-9]{6}$`.
*   **Email Format:** standard RFC 5322 validation.

---

## 13. Dependencies
*   **Account Group Master:** Accounts query parent groups to construct financial reporting trees.
*   **Transactions (Sales/Purchase):** Core validation loops pull address, GSTIN, and credit terms from the Account Master during invoice entry.
*   **Broker Master:** Accounts map default brokers to automate sales commissions.

---

## 14. Transaction Impact
*   **Sale Book:** Pulls default credit terms, billing addresses, and computes tax liabilities based on customer GST registration type.
*   **Bank Receipts:** Reconciles incoming bank transactions against the party ledger profile.

---

## 15. Report Usage
*   **Party Ledger Report:** Generates running ledger statements showing debits, credits, and cumulative balances.
*   **Outstanding Receivables:** Analyzes outstanding bills against credit days to generate aging summaries.
*   **TDS/TCS Registers:** Feeds withholding totals to tax audit reports.

---

## 16. User Experience Review
*   **Tab Traversal:** Inputs follow a logical top-to-bottom, left-to-right tab order.
*   **Quick Search:** Left listing pane supports instant search filtering as the user types.
*   **Keyboard Speed:** Inline master creation popup allows adding new brokers or bank branches directly within the Account form.

---

## 17. Security Considerations
*   **Sensitive Field Masking:** Bank account numbers and contact numbers are masked for unauthorized roles.
*   **Credit Modification Audit:** Modifying credit days or limits logs a high-priority system audit record.

---

## 18. Edge Cases
*   **Changing GSTIN After Posting:** Changing a customer's GSTIN after recording transactions is blocked. The user must create a new account profile or request administrator override.
*   **Parent Group Reassignment:** Changing the group of an account updates its balance destination (e.g., from "Cash" to "Bank") and triggers an audit log.

---

## 19. Future Enhancements
*   **AI Duplicate Analysis:** Analyzes addresses and phone numbers to flag potential duplicate party registrations.
*   **KYC Attachment Drive:** Stores scans of legal business documents (PAN cards, GST certificates) directly under the party ledger profile.

---

## 20. Architect Recommendations
1.  **GST API Verification:** Design backend services with hooks to validate GSTIN numbers against government registries during production phases.
2.  **Optimistic Version Control:** Enforce Prisma version attributes on the Account table to prevent concurrent overrides in busy sales offices.

---

## 21. Final Completion Checklist
*   [x] Document business purpose and transactional role of the Account Master.
*   [x] Map layout details, tab structures, and toolbar buttons.
*   [x] Specify field properties for GST, PAN, Bank details, credit, TDS, and TCS.
*   [x] Establish validation rules, tax logic, and security configurations.
*   [x] Detail edge cases and user experience standards.
