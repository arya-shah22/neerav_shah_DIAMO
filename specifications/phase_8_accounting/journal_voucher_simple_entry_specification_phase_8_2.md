# DIAMO ERP – PHASE 8.2
## JOURNAL VOUCHER (JV BOOK) – SIMPLE JV ENTRY SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Simple Journal Voucher Entry module of DIAMO ERP. This module is optimized for high-speed, one-to-one accounting adjustments, utilizing exactly one Debit account, one Credit account, and a single amount field. It automates GST, TDS, and RCM calculations while enforcing double-entry integrity.

---

## 2. Business Purpose
The Simple JV Entry screen streamlines high-frequency adjustments:
*   **Operational Context:** Minimizes key entries for accountants processing hundreds of daily adjustments.
*   **Operational Distinctions:**
    *   *Simple JV:* Restricts inputs to one Debit and one Credit account to speed data entry.
    *   *Advanced JV:* Supports multi-line allocations and complex splits.
    *   *Cash/Bank:* Records physical cash receipt or bank ledger transfers.

---

## 3. Header
Tracks voucher session metadata:
*   **Voucher Number:** Auto-generated key following the format: `JD-JV-YYYY-#####`.
*   **Voucher Date:** Posting date.
*   **Posting Status:** State of the JV (Draft, Posted, Cancelled).

---

## 4. Main Entry Section
Optimized input section layout:
*   **Debit Account / Credit Account:** Search dropdowns for ledgers.
*   **Amount:** Numeric base value.
*   **Taxes & Provisions:** CGST, SGST, IGST, TDS Section, TDS %, RCM applicable (toggle).
*   **Narration:** Narration details.

---

## 5. Auto Fetch
Selecting a Debit or Credit account auto-populates:
*   Account Name, Account Group, GSTIN, PAN, State prefix, current outstanding balance, opening balance, and tax rules.

---

## 6. GST Engine
Calculates GST output allocations:
*   **Supply Type:** If the customer's state prefix matches the company's registration prefix, the system applies CGST + SGST; otherwise, it applies IGST.
*   **Override Rules:** Authorized users can override computed GST rates.

---

## 7. TDS Engine
Computes TDS deductions:
*   **Threshold Audit:** Applies TDS based on configuration rules.
*   **Formula:**
    $$\text{TDS Base} = \text{Amount}$$
    $$\text{TDS Deduction} = \text{TDS Base} \times \text{TDS Rate}$$

---

## 8. RCM Engine
Supports Reverse Charge Mechanism (RCM):
*   **Calculation:** If RCM is checked, the system calculates and logs input GST and output GST entries simultaneously, balancing the transaction value.

---

## 9. Auto Calculations
Calculates totals in real-time:
*   **Formula:**
    $$\text{Gross Amount} = \text{Amount}$$
    $$\text{Net Posting Amount} = \text{Gross Amount} + \text{GST Amount} - \text{TDS Amount}$$
    $$\text{Difference} = \text{Debit Total} - \text{Credit Total} = 0.00$$

---

## 10. Posting Logic
Saving a voucher executes the following updates in a single transaction scope:
1.  Validates that debits equal credits.
2.  Posts updates to the General Ledger.
3.  Recalculates balances for the Trial Balance, Profit & Loss, and Balance Sheet.
4.  Logs the action in the system audit trail.

---

## 11. Recent Vouchers
*   **Panel:** Renders a list of the 10 most recent JVs on the right side of the screen.
*   *Interaction:* Double-clicking a row opens the voucher in View/Edit mode.

---

## 12. List Page
Displays accounting adjustments:
*   *Columns:* Voucher Number, Date, Debit Account, Credit Account, Amount, Status, and Narration.

---

## 13. Search
Supports filters for: Voucher Number, Debit Account, Credit Account, Amount, Reference ID, Narration, and Date.

---

## 14. Filters
Provides filters for: Today, Yesterday, This Month, Status, and Amount Range.

---

## 15. Validation
*   **Identity Check:** Debit and Credit accounts cannot be identical.
*   **Value Constraints:** Amount must be greater than `0.00`.
*   **Lock Check:** Posting date must fall within the active financial year and after the lock date.

---

## 16. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Posted JVs:** Corrections must use the Reversal Voucher workflow.
3.  **Soft Deletes:** Deletions use the soft delete pattern, reversing ledger postings.

---

## 17. Permissions
Access is regulated by the following flags:
*   `create_jv` / `approve_jv`
*   `post_jv` / `reverse_jv`

---

## 18. Audit
Logs all status changes:
*   Tracks ledger changes, tax adjustments, and file attachments.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Approval Alerts:** Alerts managers when a JV requires approval.
*   **Error Alerts:** Alerts users if a posting failed due to database or validation issues.

---

## 20. Printing
Generates print templates for:
*   *JV slip:* Itemizes debit/credit ledger accounts, narration details, and sign-off blocks.

---

## 21. Report Impact
Saving a JV updates:
*   *Reports:* General Ledger, Trial Balance, Profit & Loss, Balance Sheet, GST Adjustments, TDS Reports.

---

## 22. Edge Cases
*   **Closed Period Postings:** If a user attempts to save a JV in a closed financial year, saving is blocked.
*   **Rollback Protection:** System timeouts during posting trigger database rollbacks to prevent ledger imbalances.

---

## 23. Future Enhancements
*   **AI Accrual Suggestions:** Recommends salary or interest provision entries based on historical monthly patterns.
*   **Recurring Journals:** Automates monthly depreciation postings.

---

## 24. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 25. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
