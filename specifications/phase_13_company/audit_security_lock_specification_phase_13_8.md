# DIAMO ERP – PHASE 13.8
## AUDIT, SECURITY & FINANCIAL YEAR LOCK CONFIGURATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Audit, Security, Financial Year Lock, and System Control Configuration module of DIAMO ERP. This module controls database audit levels, user activity loggers, period locks, soft/hard deletion rules, session timeouts, and concurrent login limits across companies.

---

## 2. Business Purpose
*   **Corporate Governance:** Enforces a permanent audit log of modifications, dispatches, and financial reviews.
*   **Tamper-Proof Controls:** Restricts editing in closed fiscal periods and locks session boundaries to prevent unauthorized balance sheet edits.

---

## 3. Audit Settings
*   **Audit Logging Levels:**
    *   *Basic:* Logs login, logout, and voucher generation actions.
    *   *Standard:* Adds tracking for updates, deletions, and print actions.
    *   *Detailed:* Captures field-level before/after JSON snapshots, report exports, and security configuration changes.

---

## 4. Audit Events
*   **Activity Tracing:** Captures logs for Logins, Logouts, DB updates/deletions, backups, voucher approvals, cancellations, and settings updates.
*   **Metadata Captured:** Audit ID, User ID, workstation IP, date, timestamp, target module, action, previous JSON value, next JSON value, and override reason.

---

## 5. Financial Year Lock
*   **Lock Classifications:**
    *   *Partial Lock:* Prevents adding new vouchers but allows editing drafts.
    *   *Complete Lock:* Read-only state; blocks edits, deletions, and postings.
    *   *Audit Freeze:* Permanent year-end state (requires super-admin override to revert).

---

## 6. Financial Year Rules
*   **Locked Period Constraints:** Blocks new transaction entries, journal postings, stock revaluations, and outward dispatches. Allows report viewing, spreadsheet exports, and print previews.

---

## 7. Transaction Security
*   **Approval Controls:** Toggles settings for: Edit Draft (Yes/No), Edit Post-Approval (requires override), and Post-Approval Deletion (permanently blocked).

---

## 8. Delete Control
*   **Data Deletion Rules:**
    *   *Soft Delete:* Flags records as inactive, hiding them from UI grids while preserving them in the database for auditing.
    *   *Hard Delete:* Permanently removes records (restricted to super-admins). Requires entering a deletion reason.

---

## 9. Edit Control
*   **Voucher Modifications:** Configures editing permissions before/after posting, requires manager overrides for post-approval edits, and locks fields after year-end closing.

---

## 10. Approval Settings
*   **Maker-Checker Controls:** Configures approval workflow paths, single-stage vs. multi-stage manager sign-offs, and verification steps before year-end locking.

---

## 11. Session Security
*   **Session Management:** Configures auto-logout limits (e.g., 15 minutes of inactivity), warns users before sessions expire, and sets concurrent session limits per user.

---

## 12. Login Security
*   **Access Rules:** Configures max failed login attempts (e.g., lock account after 5 attempts), sets lockout durations, and allows manual super-admin account unlocks.

---

## 13. Search
Supports filters for: Audit ID, Module, and User.

---

## 14. Filters
Provides filters for: Action (Create/Delete/Print/Export), Financial Year, and Date Range.

---

## 15. Sorting
Allows sorting by: Date/Time, Module, and User.

---

## 16. Validation
*   Checks for missing reason fields, flags conflicting approval settings, prevents unauthorized deletions, and checks role permissions before allowing overrides.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 18. Module Impact
*   Applies audit logs and security rules across all transaction books, masters, inventory records, financial registers, and settings panels.

---

## 19. Permissions
Access is regulated by the following flags:
*   `view_audit_logs` / `export_audit_logs`
*   `lock_financial_year` / `unlock_financial_year`
*   `bypass_session_timeout` / `force_account_unlock`

---

## 20. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 21. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 22. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 23. Error Handling
*   Handles transaction conflicts, lock violations, failed approvals, and database rollbacks with clear error messages.

---

## 24. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 25. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

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
