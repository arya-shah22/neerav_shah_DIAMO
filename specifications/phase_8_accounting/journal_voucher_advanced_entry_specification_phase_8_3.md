# DIAMO ERP – PHASE 8.3
## JOURNAL VOUCHER (JV BOOK) – ADVANCED MULTI-LINE ENTRY SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Advanced Journal Voucher Entry module of DIAMO ERP. This module is designed for complex accounting transactions involving multiple debit and credit accounts within a single journal voucher. It enforces double-entry balancing across unlimited rows and provides line-level tax engines and reference linkings.

---

## 2. Business Purpose
The Advanced JV Entry screen facilitates complex, multi-account adjustments:
*   **Operational Context:** Processes year-end audits, multi-company cost allocations, salary provisions, depreciation schedules, and tax offsets.
*   **Operational Distinctions:**
    *   *Simple JV:* Fast entry limited to one Debit and one Credit account.
    *   *Advanced JV:* Multi-line grid supporting unlimited ledger splits and offset entries.

---

## 3. Header
Tracks voucher metadata:
*   **Voucher Number:** Auto-generated key following the format: `JD-JV-YYYY-#####`.
*   **Voucher Date:** Posting date.
*   **Posting Status:** State of the JV (Draft, Posted, Cancelled).
*   **Header Narration:** Narration applying to the entire voucher.

---

## 4. Entry Grid
The multi-line accounting grid is designed for fast keyboard entries:
*   **Grid Columns:** Row Number, Account Name, Account Group, Debit Amount, Credit Amount, GST %, TDS %, RCM applicable (toggle), Reference, Line Narration, Status.
*   *Interaction:* Supports unlimited rows, drag-and-drop row reordering, row duplication, and keyboard shortcuts (`F2` to insert, `Delete` to remove).

---

## 5. Account Selection
*   **Grid Lookup:** Selecting an account in any grid row auto-populates the account name, group, GSTIN, PAN, state prefix, current balance, and default tax rules.

---

## 6. Auto Balancing
*   **Validation Check:** The engine continuously sums the debit and credit columns:
    $$\text{Debit Total} = \sum \text{Debits}$$
    $$\text{Credit Total} = \sum \text{Credits}$$
    $$\text{Difference} = \text{Debit Total} - \text{Credit Total}$$
*   **UI Indicator:** Renders a green badge when the difference is zero, and a red badge with the calculated difference value when unbalanced. The save action is blocked until the difference is zero.

---

## 7. GST Engine
Calculates GST output allocations:
*   **Line-Level Taxes:** GST rates are calculated per grid row based on state prefixes (local CGST + SGST vs. interstate IGST).

---

## 8. TDS Engine
Computes TDS deductions:
*   **Line-Level TDS:** Deductions are calculated per row using the account's configured TDS settings (e.g., Section 194C).

---

## 9. RCM Engine
Supports Reverse Charge Mechanism (RCM):
*   **RCM Check:** Applies RCM rules to specific rows, generating opposing tax entries in the ledger to record liability and credit.

---

## 10. Auto Calculations
Calculates totals in real-time:
*   **Formula:**
    $$\text{Voucher Difference} = \text{Debit Total} - \text{Credit Total} = 0.00$$

---

## 11. Posting Logic
Saving a voucher executes the following updates in a single transaction scope:
1.  Validates that debits equal credits.
2.  Posts updates to the General Ledger.
3.  Recalculates balances for the Trial Balance, Profit & Loss, and Balance Sheet.
4.  Logs the action in the system audit trail.

---

## 12. Reference Linking
*   **Line-Level Reference:** Users can link individual rows to specific invoices, challans, payments, or broker accounts, maintaining complete audit trails.

---

## 13. Multi-Company Support
*   **Security Isolation:** Supports company switching, segregating numbering formats, permissions, and ledger postings.

---

## 14. List Page
Displays accounting adjustments:
*   *Columns:* Voucher Number, Date, Total Debit, Total Credit, Status, and Narration.

---

## 15. Search
Supports filters for: Voucher Number, Account Name, Reference ID, Amount, Journal Type, Narration, and Date.

---

## 16. Filters
Provides filters for: Today, Yesterday, This Month, Status, and Amount Range.

---

## 17. Validation
*   **Row Check:** A single row cannot contain both debit and credit amounts.
*   **Balancing Check:** Total debits must equal total credits.
*   **Account Check:** Selected accounts must be active in the Account Master.
*   **Date Check:** Posting date must fall within the active financial year and after the lock date.

---

## 18. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Posted JVs:** Corrections must use the Reversal Voucher workflow.
3.  **Soft Deletes:** Deletions use the soft delete pattern, reversing ledger postings.

---

## 19. Permissions
Access is regulated by the following flags:
*   `create_jv` / `approve_jv`
*   `post_jv` / `reverse_jv`

---

## 20. Audit
Logs all status changes:
*   Tracks ledger changes, tax adjustments, and file attachments.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 21. Notifications
*   **Approval Alerts:** Alerts managers when a JV requires approval.
*   **Error Alerts:** Alerts users if a posting failed due to database or validation issues.

---

## 22. Printing
Generates print templates for:
*   *JV slip:* Itemizes debit/credit ledger accounts, narration details, and sign-off blocks.

---

## 23. Report Impact
Saving a JV updates:
*   *Reports:* General Ledger, Trial Balance, Profit & Loss, Balance Sheet, GST Adjustments, TDS Reports.

---

## 24. Edge Cases
*   **Closed Period Postings:** If a user attempts to save a JV in a closed financial year, saving is blocked.
*   **Rollback Protection:** System timeouts during posting trigger database rollbacks to prevent ledger imbalances.

---

## 25. Future Enhancements
*   **AI Accrual Suggestions:** Recommends salary or interest provision entries based on historical monthly patterns.
*   **Recurring Journals:** Automates monthly depreciation postings.

---

## 26. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 27. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
