# DIAMO ERP – PHASE 13.2
## FINANCIAL & ACCOUNTING SETTINGS CONFIGURATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Financial and Accounting Settings module of DIAMO ERP. This module centralizes operational parameters for financial year boundaries, decimal rounding configurations, back-dated entry rules, and direct/indirect tax behaviors (GST, TDS, TCS) within DIAMO ERP.

---

## 2. Business Purpose
*   **Process Standardization:** Ensures consistent calculations across transaction books, reducing errors from custom rounding or tax adjustments.
*   **Compliance Control:** Enforces strict accounting periods, preventing unauthorized back-dated edits in closed years.

---

## 3. Accounting Settings
*   **Parameters:** Financial Year label (e.g., FY 2026-27), Start Date (e.g., 01-04-2026), End Date (e.g., 31-03-2027), Default active year indicator, and Status (Open, Closed, Locked).

---

## 4. Rounding Rules
*   **INR Rounding Profile:**
    *   *Rule:* If the decimal value is $>0.5$, round up to the nearest rupee. If the decimal value is $\le0.5$, round down (e.g., ₹12.7 $\rightarrow$ ₹13; ₹12.5 $\rightarrow$ ₹12; ₹12.3 $\rightarrow$ ₹12).
    *   *Impacts:* Renders rounded values on invoices, purchase bills, debit/credit notes, cash/bank books, and general ledger reports while maintaining exact tax values for GSTR-1 matching.

---

## 5. Accounting Behaviour
*   **Operational Flags:**
    *   `automatic_ledger_posting` (posts approved vouchers instantly).
    *   `allow_back_date_entry` (boolean toggle with max back-date days limit).
    *   `allow_editing_posted_entries` (requires manager verification when enabled).
    *   `transaction_lock_after_approval` (locks records after signature completion).

---

## 6. GST Settings
*   **Configuration Parameters:** GST Enabled (Yes/No), Default CGST/SGST/IGST Accounts, automatic GST validation on save, and HSN-based tax mapping rules.

---

## 7. TDS Settings
*   **Configuration Parameters:** TDS Enabled (Yes/No), threshold limits (e.g., Section 194Q for purchases exceeding ₹50 Lakhs), default TDS rate, and automatic posting rules.

---

## 8. TCS Settings
*   **Configuration Parameters:** TCS Enabled (Yes/No), threshold limits (e.g., Section 206C(1H) for sales receipts exceeding ₹50 Lakhs), default TCS rate, and invoice automatic addition rules.

---

## 9. Opening Balance Settings
*   **Opening Parameters:** Opening Balance Date, Allow Opening Balance Edit (blocks modifications post-reconciliation), and Opening Balance Lock.

---

## 10. Credit & Payment Settings
*   **Outstanding Rules:** Default Credit Days, allow credit limit overrides, automatic ageing calculation methods, and payment reminder schedules.

---

## 11. Transaction Control
*   **Transaction States:** Allow Draft, Require Approval (Maker-Checker structure), Lock after posting, and Block edits after Financial Year closing.

---

## 12. Financial Year Management
*   **Closing & Rollover Workflow:**
    1.  Perform final bank and cash reconciliations.
    2.  Post audited stock adjustment write-offs.
    3.  Close the current active year, changing its status to `Closed`.
    4.  Carry forward ledger closing balances as opening balances for the next year.
    5.  Change the closed year status to `Locked` (requires super-admin privileges to reopen).

---

## 13. Search
Supports filters for: Financial Year, Setting Key, and Status.

---

## 14. Validation
*   Validates financial year date ranges, flags overlapping periods, checks for negative credit days, and validates TDS/TCS section configurations.

---

## 15. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 16. Module Impact
*   Directly affects Sales, Purchases, Returns, Cash Books, Bank Books, Journal Vouchers, and outstanding reports by applying configured rounding, tax, and period lock rules.

---

## 17. Permissions
Access is regulated by the following flags:
*   `view_financial_settings` / `modify_financial_settings`
*   `close_financial_year` / `reopen_financial_year`

---

## 18. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 20. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 21. Error Handling
*   Handles overlapping dates, invalid tax settings, and network rollback failures with clear error messages.

---

## 22. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 23. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

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
