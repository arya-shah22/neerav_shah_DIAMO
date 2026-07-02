# DIAMO ERP – PHASE 10.6
## BANK BOOK – AUDIT, SECURITY, APPROVAL & FINALIZATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Audit, Security, Approval Workflow, and Finalization of the Bank Book module in DIAMO ERP. This module aggregates bank transaction lifecycles, ensuring double-entry compliance, Maker-Checker authorization flows, version deltas, BRS authorization limits, and data security.

---

## 2. Business Purpose
Auditability and security protect banking assets:
*   **Operational Context:** Reconciles internal transactions against bank statements while securing large wire transfers against unauthorized payouts.
*   **Voucher States:**
    *   *Draft:* Unposted, editable entries.
    *   *Posted:* Read-only entries that update financial reports.
    *   *Reversed:* Compensating transaction offset entries.

---

## 3. Approval Workflow
Supports configurable authorization pipelines:
*   **Maker-Checker Workflow:** An accountant creates a draft bank voucher (`Maker`), which must be authorized by a manager (`Checker`) before posting.

---

## 4. Approval Rules
*   **Rule Engine:** Approval routing paths are triggered dynamically based on amount thresholds (e.g., transfers over ₹1,000,000 require CFO checks), transaction type (Payment vs. Receipt), or negative overdraft overrides.

---

## 5. Transaction Status
Vouchers progress through these statuses:
*   `Draft` $\rightarrow$ `Pending Approval` $\rightarrow$ `Approved` $\rightarrow$ `Posted` $\rightarrow$ `Reversed` $\rightarrow$ `Cancelled`.

---

## 6. Security
*   **Data Security:** Role-Based Access Control (RBAC), multi-tenant isolation, and financial year locks protect financial records.
*   *Account Restrictions:* Limits users to viewing only authorized bank accounts.

---

## 7. Permissions
Access is regulated by the following flags:
*   `create_bank_voucher` / `post_bank_voucher`
*   `override_overdraft_limits` / `backdate_bank_entry`
*   `reconcile_bank_statement` / `override_matching_rules`

---

## 8. Audit Trail
*   **Audit Logging:** Logs user IDs, timestamps, machine IDs, and status changes for every voucher action, including UTR edits, cheque reference changes, and BRS allocations.

---

## 9. Version History
*   **Version Comparison:** Modifying a voucher creates a new version history entry (v1, v2), tracking changed fields and previous values.

---

## 10. Reversal Engine
*   **Compensating Entries:** Posted vouchers cannot be modified. Adjustments generate a linked Reversal Voucher, which posts opposing entries to balance the accounts.

---

## 11. Cancellation
*   **Cancellation Rules:** Only draft vouchers can be cancelled. Cancelling a posted voucher requires generating a reversal voucher.

---

## 12. Bank Reconciliation Security
*   **BRS Control:** Restricts BRS matching overrides, match approvals, and undo reconciliation actions to authorized Treasury managers.

---

## 13. Notifications
*   **System Alerts:** Sends notifications for vouchers pending approval, posted entries, low balance warnings, cheque bounces, or posting failures.

---

## 14. Search
*   **Index Fields:** Searchable by Voucher Number, Party Name, UTR/Cheque Number, Reference ID, Narration, Status, and Date.

---

## 15. Filters
*   **Filter Options:** Filters by Date Range, Transaction Type, Payment Mode, Status, and Amount Range.

---

## 16. Error Handling
*   **Rollback Protection:** System timeouts or validation failures during posting trigger database rollbacks to prevent ledger imbalances.

---

## 17. Performance
*   **Search Optimization:** Enforce database indexes on transaction dates to support fast available-stock calculations.
*   **Asynchronous Calculations:** Bank book running balances run in a background worker process.

---

## 18. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 19. Report Impact
Saving a voucher updates:
*   *Reports:* Bank Book, Trial Balance, Profit & Loss, Balance Sheet, Accounts Outstanding.

---

## 20. Edge Cases
*   **Cheque Bounce:** Reversing a bounced cheque automatically restores the customer's outstanding balance and posts charges.
*   **Closed Period Postings:** Blocks saving bank entries in closed financial periods.

---

## 21. Future Enhancements
*   **Open Banking APIs:** Synchronizes ledger balances directly with active bank systems in real-time.
*   **AI Auto-Reconciliation:** Ranks possible matches based on transaction history.

---

## 22. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 23. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
