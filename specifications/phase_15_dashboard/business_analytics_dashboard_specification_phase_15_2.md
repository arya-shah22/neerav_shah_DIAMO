# DIAMO ERP – PHASE 15.2
## BUSINESS ANALYTICS & EXECUTIVE DASHBOARD SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Business Analytics, Management Insights, and Executive Dashboard module of DIAMO ERP. This module compiles financial registries, stock registers, and transaction timelines to construct visual telemetry for management review.

---

## 2. Business Purpose
*   **Operational Intelligence:** Allows executives to analyze monthly trends, inventory turnover speeds, and cash flows.
*   **Segment Performance Analysis:** Visualizes growth rates across product categories, quality grades, customer accounts, and supplier bases.

---

## 3. Dashboard Layout
*   **Analytical Sections:** Grouped into Sales Analytics, Purchase Analytics, Financial Analytics, Inventory Analytics, Customer Analytics, Supplier Analytics, and Profitability Analytics.

---

## 4. Sales Analytics
*   **Sales Performance Telemetry:** Display components showing monthly/weekly trends, year-over-year comparisons, customer rankings, category/shape breakdowns, and month-over-month growth indexes.
*   *Drill Down:* Clicking a trend chart opens the detailed Sales Register with corresponding filters applied.

---

## 5. Purchase Analytics
*   **Purchase Telemetry:** Displays monthly inward trends, supplier contributions, category distributions, and purchase growth rates.
*   *Drill Down:* Clicking charts opens the detailed Purchase Register.

---

## 6. Profit Analytics
*   **Earnings Telemetry:** Displays monthly/yearly profit trends, gross profit margins, net profit rates, and profit comparison trends.

---

## 7. Inventory Analytics
*   **Stock Telemetry:** Displays current stock valuations, available/hold stock distributions, aging profiles, fast/slow-moving tags, and inventory turnover indexes.

---

## 8. Customer Analytics
*   **Client Telemetry:** Displays customer rankings, purchase values, receivables, customer growth charts, repeat customer rates, and average transaction values.

---

## 9. Supplier Analytics
*   **Vendor Telemetry:** Displays top suppliers, purchase shares, outstanding payables, and average purchase values.

---

## 10. Financial Analytics
*   **Treasury Telemetry:** Displays cash flows, bank flows, receivable/payable trends, and monthly bank balance tracks.

---

## 11. Executive Summary
*   **Periodic Telemetry Grids:** Dashboard grid cards summarizing Sales, Purchases, Profits, Receivables, Payables, Stock Valuations, Cash balances, and Bank balances for Today, This Month, and the Current Financial Year.

---

## 12. Chart Types
*   **Data Visualization Standards:**
    *   *Trends:* Line and Area charts.
    *   *Comparisons:* Column and Bar charts.
    *   *Shares:* Pie and Doughnut charts.
    *   *Summaries:* KPI Metric Cards.

---

## 13. Interactive Behaviour
*   **UI Tooltips & Legends:** Charts support hover information, interactive tooltips, legend toggling, zoom controls, and click-to-drill down actions.

---

## 14. Filters
Provides filters for: Active Company, Financial Year, Date Range, Customer ID, Supplier ID, Diamond Shape, and Quality Grade.

---

## 15. Search
Supports search for: Customer name, Supplier name, Stock ID, and Voucher Number.

---

## 16. Sorting
Allows sorting by: Highest, Lowest, Latest, and Alphabetical.

---

## 17. Real-Time Analytics
*   **Refresh Loop:** Refreshes calculations in the background. Polling calculations run in a background worker thread every 5 minutes to prevent rendering lag on main UI screens.

---

## 18. Validation
*   Validates query parameters, checks for missing transaction logs, and flags conflicting filter configurations.

---

## 19. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 20. Module Impact
*   Aggregates data from Sales, Purchases, Cash/Bank books, Ledgers, and Diamond Inventory databases.

---

## 21. Permissions
Access is regulated by the following flags:
*   `view_business_analytics` / `refresh_analytics_data`
*   `export_analytics_reports` / `print_analytics_views`

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
*   Handles empty datasets, calculation timeouts, and database connection drops with clear error messages.

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
