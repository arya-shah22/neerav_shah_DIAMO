# DIAMO ERP – PHASE 15.6
## DASHBOARD PERFORMANCE & BI ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Dashboard Performance, Business Intelligence Engine, and Real-Time Data Management module of DIAMO ERP. This module acts as the analytical processing core, utilizing asynchronous worker pools, structured cache validation rules, and transaction monitors to compile real-time financial and operational metrics.

---

## 2. Business Purpose
*   **Minimized Processing Overhead:** Prevents query spikes on the local SQLite/MySQL instance during concurrent client entry sessions.
*   **Responsive Telemetry:** Delivers sub-second dashboard rendering times even when compiling millions of rows across multiple company databases.

---

## 3. KPI Calculation Engine
*   **Centralized Calculations:** Aggregates values for Total Sales, Total Purchase, Today's Sales, Receivables, Payables, Net Cash/Bank balances, Stock quantities, and Gross margins. Calculations pull directly from active transaction registers.

---

## 4. Real-Time Data Refresh
*   **Refresh Dispatcher:** Manages updates:
    *   *Automatic Refresh:* Triggers on background polling cycles.
    *   *Manual Refresh:* Operator-driven refresh of all widgets or a selected card.
    *   *Partial Refresh:* Only re-calculates widgets whose source data has changed.
*   *Display:* Shows Last Refresh Time, Next Refresh countdown, and Refresh Status.

---

## 5. Background Processing
*   **Worker Thread Allocation:** General ledger aggregation routines run in separate background processes. The React UI displays cached values immediately and updates cards dynamically when background calculations finish, keeping the user interface highly responsive.

---

## 6. Dashboard Caching
*   **State Cache Layer:**
    *   *Cached Data:* Historical month balances, static accounts metadata, and stock value totals.
    *   *Real-time Data:* Current daily cash balance and active bank ledger reconciliations.
    *   *Eviction:* Automatically invalidates cache values when new vouchers are posted or stock records are modified.

---

## 7. Data Synchronization
*   **Event-Driven Updates:** Data entry screens dispatch event signals (e.g., `sale_posted`, `stock_adjusted`, `cash_received`). The BI Engine intercepts these signals and schedules updates only for the affected widget cards.

---

## 8. Performance Monitoring
*   **Engine Metrics Panel:** Displays Dashboard Load Time, individual widget calculation durations, database query response times, memory footprint indexes, and a general Dashboard Health score.

---

## 9. Business Intelligence Rules
*   **Insight Generation Triggers:**
    *   *Receivables Trend:* Alerts if customer receivables increase by >15% month-over-month.
    *   *Cash Flow Analysis:* Identifies negative cash trend lines.
    *   *Trading Yields:* Lists top performing shapes, highest-margin clarity grades, and top customer accounts.

---

## 10. Dashboard Health
*   **Telemetry Health Status:** Shows status flags: Healthy, Warning, or Critical based on database response times and query timeout rates.

---

## 11. Search
Supports search for: KPI metrics, analytics tags, and performance logs.

---

## 12. Filters
Provides filters for: Company, Financial Year, Date Range, and Dashboard Section.

---

## 13. Sorting
Allows sorting by: Highest KPI, Latest Update, and Performance.

---

## 14. Validation
*   Validates calculation ranges, flags negative stock volumes, identifies cache mismatch conflicts, and alerts on database timeouts.

---

## 15. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 16. Module Impact
*   Collects transactional events from Sales, Purchases, Stock, Cash, Bank, and Ledger databases.

---

## 17. Permissions
Access is regulated by the following flags:
*   `view_dashboard_telemetry` / `force_full_refresh`
*   `view_performance_logs` / `bypass_refresh_limits`

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
*   Handles calculation failures, cache write errors, database offline locks, and system timeouts with clear error messages.

---

## 22. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 23. Edge Cases (Calculations)
*   **Company Switch during Calculation:** Aborts active calculations for the previous company to prevent cross-company data leakage.
*   **Crash During Refresh:** Falls back to the last valid cache file upon application restart.

---

## 24. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 25. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
