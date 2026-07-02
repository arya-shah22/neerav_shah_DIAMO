# DIAMO ERP – PHASE 15.1
## DASHBOARD FOUNDATION & KPI CARDS SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Dashboard Foundation, KPI Cards, and Home Screen Overview module of DIAMO ERP. This module acts as the primary landing page upon user login, offering real-time financial summaries and operational telemetry of active enterprise accounts.

---

## 2. Business Purpose
*   **Executive Business Insight:** Provides immediate business metrics without requiring users to compile individual ledger or stock reports.
*   **Operational Navigation Hub:** Acts as a centralized navigation panel where users can click KPI cards to open detailed registers.

---

## 3. Dashboard Header
*   **Header Metadata Panel:** Renders Company Name, Company Logo, Active User Name, Current User Role, Active Financial Year, Current System Date/Time, greeting message (e.g., `Good Morning, Arya Shah`), and last login details.

---

## 4. KPI Cards
*   **KPI Panel Grids:** Modular grids that render title text, calculated numeric values, status flags (Up/Down/Stable), quick textual summaries, and interactive click navigation actions.

---

## 5. Total Receivable Card
*   **Receivables Telemetry:** Renders Total Outstanding Customer Receivables, Pending payments, Received collections, and Overdue balances.
*   *Click Action:* Opens the Accounts Receivable Ledger Report.

---

## 6. Total Payable Card
*   **Payables Telemetry:** Renders Total Outstanding Supplier Payables, Pending bills, Settled payments, and Overdue balances.
*   *Click Action:* Opens the Accounts Payable Ledger Report.

---

## 7. Current Stock Card
*   **Inventory Telemetry:** Renders Total Diamond Count, Available packets, Held diamonds, Sold volumes, Certified diamonds, and Non-Certified counts.
*   *Click Action:* Opens the Diamond Stock Explorer.

---

## 8. Today's Sales Card
*   **Sales Activity Telemetry:** Renders Total Sales Value generated today and the count of completed sales invoices.
*   *Click Action:* Opens the Sales Register filtered for today.

---

## 9. Today's Purchase Card
*   **Purchase Activity Telemetry:** Renders Total Purchase Value generated today and the count of entered purchase bills.
*   *Click Action:* Opens the Purchase Register filtered for today.

---

## 10. Today's Cash Card
*   **Cash Flow Telemetry:** Renders Cash Receipts today, Cash Payments today, and the current net cash book balance.
*   *Click Action:* Opens the Cash Book Register.

---

## 11. Today's Bank Card
*   **Treasury Telemetry:** Renders Bank Receipts today, Bank Payments today, and current active bank balances.
*   *Click Action:* Opens the Bank Book Register.

---

## 12. Quick Business Summary
*   **Summary Telemetry Panel:** Display panel showing: Total Customer Accounts, Total Supplier Accounts, Total active accounts, Total Stock Items, Active Concurrent User Count, and Active Company details.

---

## 13. Card Behaviour
*   **Interaction Controls:** Cards support hover elevation animations, show spinner loading states, display empty indicators when data is missing, and render retry buttons upon load errors.

---

## 14. Real-Time Data
*   **Background Data Refresh:** Pulls new values periodically. For this offline desktop system, a 5-minute background polling loop compiles changes without lagging the primary UI thread.

---

## 15. Search
Supports global search for: Customers, Suppliers, Invoices, Stock IDs, and Vouchers.

---

## 16. Filters
Provides filters for: Company ID, Financial Year, and Date Range (Today/This Week/This Month).

---

## 17. Sorting
Allows sorting by: Highest Value, Lowest Value, and Latest Activity.

---

## 18. Validation
*   Checks for missing financial years, unavailable company databases, and corrupted metric data fields.

---

## 19. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 20. Module Impact
*   Aggregates data from Sales, Purchases, Stock, Cash, Bank, and User status databases.

---

## 21. Permissions
Access is regulated by the following flags:
*   `view_dashboard_overview` / `view_financial_kpis`
*   `view_stock_kpis` / `force_dashboard_refresh`

---

## 22. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 23. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 24. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 25. Error Handling
*   Handles database connection drops, data calculation failures, and thread timeouts with clear error messages.

---

## 26. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 27. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 28. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 29. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
