# DIAMO ERP – PHASE 9.5
## CASH BOOK – AUDIT, SECURITY, APPROVAL & FINALIZATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Audit, Security, Approval Workflow, and Finalization of the Cash Book module in DIAMO ERP. This module aggregates cash transaction lifecycles, ensuring double-entry compliance, Maker-Checker authorization flows, version deltas, and data security.

---

## 2. Business Purpose
Auditability and security protect cash assets:
*   **Operational Context:** Minimizes internal fraud risks, prevents duplicate payments, and preserves transactional history for audits.
*   **Voucher States:**
    *   *Draft:* Unposted, editable entries.
    *   *Posted:* Read-only entries that update financial reports.
    *   *Reversed:* Compensating transaction offset entries.

---

## 3. Approval Workflow
Supports configurable authorization pipelines:
*   **Maker-Checker Workflow:** An accountant creates a draft cash voucher (`Maker`), which must be authorized by a manager (`Checker`) before posting.

---

## 4. Approval Rules
*   **Rule Engine:** Approval routing paths are triggered dynamically based on amount thresholds, transaction type (Payment vs. Receipt), or negative cash overrides.

---

## 5. Transaction Status
Vouchers progress through these statuses:
*   `Draft` $\rightarrow$ `Pending Approval` $\rightarrow$ `Approved` $\rightarrow$ `Posted` $\rightarrow$ `Reversed` $\rightarrow$ `Cancelled`.

---

## 6. Security
*   **Data Security:** Role-Based Access Control (RBAC), multi-tenant isolation, and financial year locks protect financial records.

---

## 7. Permissions
Access is regulated by the following flags:
*   `create_cash_voucher` / `post_cash_voucher`
*   `override_negative_cash` / `bypass_outstanding_limits`

---

## 8. Audit Trail
*   **Audit Logging:** Logs user IDs, timestamps, machine IDs, and status changes for every voucher action.

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

## 12. Notifications
*   **System Alerts:** Sends notifications for vouchers pending approval, posted entries, or posting failures.

---

## 13. Search
*   **Index Fields:** Searchable by Voucher Number, Party Name, Reference ID, Narration, Status, and Date.

---

## 14. Filters
*   **Filter Options:** Filters by Date Range, Transaction Type, Status, and Amount Range.

---

## 15. Error Handling
*   **Rollback Protection:** System timeouts or validation failures during posting trigger database rollbacks to prevent ledger imbalances.

---

## 16. Performance
*   **Search Optimization:** Enforce database indexes on transaction dates to support fast available-stock calculations.
*   **Asynchronous Calculations:** Cash book running balances run in a background worker process.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Posted Vouchers:** Corrections must use the Reversal Voucher workflow.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 18. Report Impact
Saving a voucher updates:
*   *Reports:* Cash Book, Trial Balance, Profit & Loss, Balance Sheet, Accounts Outstanding.

---

## 19. Edge Cases
*   **Closed Period Postings:** Blocks saving cash entries in closed financial periods.
*   **Concurrent Approvals:** Locks the Party Account table during posting to prevent double-allocations.

---

## 20. Future Enhancements
*   **Mobile App Approvals:** Allows managers to approve cash entries remotely.
*   **AI Fraud Detection:** Flags transaction pattern anomalies to identify risks.

---

## 21. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 22. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
