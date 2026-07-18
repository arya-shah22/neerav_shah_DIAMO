# DIAMO ERP – PHASE 11.8
## ENTERPRISE MIS & BUSINESS ANALYTICS SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Enterprise MIS & Business Analytics module of DIAMO ERP. This module aggregates operational data from Sales, Purchases, Stock, Cash/Bank, and Job Work registries to generate dashboards, KPI summaries, and profitability analyses, enabling data-driven decisions and real-time oversight.

---

## 2. Dashboard Overview
The MIS & Analytics module functions as a read-only reporting layer. It query-aggregates posted records across the ERP databases, compile performance indices, format tables, and display trends on the UI without modifying core transactions or database states directly.

---

## 3. Executive Dashboard
*   **KPI Summary Cards:** Today's Sales, Today's Purchase, Cash Receipts/Payments, Operating Profits, Vault Stock Valuation, Current Net Working Capital, and Year-to-Date Net Margin.

---

## 4. Sales Analytics
*   *Key Metrics:* Monthly Sales Value, Customer Profit Ratios, Top Selling Diamond Qualities, Broker Performance Margins, and Year-on-Year Growth Rates.

---

## 5. Purchase Analytics
*   *Key Metrics:* Monthly Purchases, Supplier Quality Ratings, Broker Volume Shares, Average Carat Purchase Rates, and Purchase Trend Comparisons.

---

## 6. Stock Analytics
*   *Key Metrics:* Current Stock Value, Available vs. Reserved ratios, Outsource Job Work volumes, Slow-Moving/Dead Stock aging bands (>90 days), and Inventory Turnover values.

---

## 7. Profitability Analysis
*   *Key Metrics:* Gross Profit (Sales value minus Landed Cost), Operating Margin, Net Profit, Profitability by Customer, Profitability by Diamond Quality, and Monthly Profit trends.

---

## 8. Outstanding Analysis
*   *Key Metrics:* Total Accounts Receivable, Total Accounts Payable, Days Sales Outstanding (DSO), Collection Efficiency Index %, Overdue Invoice lists, and payment reminders.

---

## 9. Financial Analytics
*   *Key Metrics:* Revenue-to-Expense ratios, Net Cash Flow movements, Current Ratios, Quick Ratios, Working Capital ratios, and Expense-to-Sales breakdowns.

---

## 10. GST/TDS/TCS Analytics
*   *Key Metrics:* Estimated monthly GST payable, accrued Input Tax Credits (ITC), pending GSTR filings, TDS deducted on vendor bills, and TCS collected on invoices.

---

## 11. Job Analytics
*   *Key Metrics:* Pending Job Orders, Average Processing Cycle Times, Outsource Job Wastage rates, Worker Performance Ratings, and Job Work profitability.

---

## 12. Bank & Cash Analytics
*   *Key Metrics:* Real-time bank balances, cash-on-hand reserves, daily collection averages, daily payment volumes, and uncleared cheque values.

---

## 13. KPI Dashboard
*   **Operational Ratios:** Current Ratio, Quick Ratio, Inventory Turnover Ratio, Average Collection Period (days), Average Payment Period (days), and Net Margin %.

---

## 14. Charts
*   **Visualizations:** Line Charts (monthly revenue trends), Bar Charts (customer comparison), Column Charts (monthly purchases), Pie/Donut Charts (quality distribution), and Area Charts (cash flows).
*   *Drill Down:* Clicking a chart slice filters the underlying report grid automatically.

---

## 15. Search
Supports filters for: Company, Customer, Supplier, Broker, Quality, Ledger, Voucher Number, and Date.

---

## 16. Filters
Provides filters for: Today, Yesterday, This Month, Quarter, Financial Year, and Custom Date Range.

---

## 17. Sorting
Allows sorting by: Revenue, Gross Profit, Sales Value, Purchase Value, Outstanding Amount, and Date.

---

## 18. Grouping
Supports grouping by: Company, Financial Year, Month, Quarter, Customer, Supplier, and Quality.

---

## 19. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 20. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 21. Report Impact
Dashboard metrics and analytics refresh automatically when transactions are saved, modified, or reversed in Sales, Purchases, Cash Books, Bank Books, or JVs.

---

## 22. Validation
*   **Scope Checks:** Confirms reporting bounds match active company parameters and validates user dashboard access permissions.

---

## 23. Business Rules
1.  **Ratio Formula Compliance:** Working capital ratio calculations must utilize verified ledger assets and outstanding receivables.
2.  **Stock Aging Boundaries:** Inventory classification maps packets unmoved for over 90 days into slow-moving/inactive pools.
3.  **Audit History Constraints:** Report parameters and execution logs are tracked and cannot be back-dated.

---

## 24. Permissions
Access is regulated by the following flags:
*   `view_executive_dashboard` / `view_kpi_dashboard`
*   `export_analytics_reports` / `view_margin_metrics`

---

## 25. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 26. Notifications
*   **Target Alerts:** Notifies sales managers when monthly revenue targets are met.
*   **Financial Warnings:** Triggers critical notifications if bank balances drop below safety limits or if net profitability turns negative.

---

## 27. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 28. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 29. Future Enhancements
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.
*   **Predictive Cash Flow Analysis:** Uses past data to forecast collections and prevent cash shortages.

---

## 30. Architect Recommendations
1.  **Materialized Aggregation:** Periodically cache or pre-aggregate monthly sales/purchase totals to prevent full table scans.
2.  **Debounced Refresh Action:** UI refresh controls should be debounced to prevent duplicate concurrent query dispatches.

---

## 31. Final Completion Checklist
*   [x] Document key financial ratios and operational metrics.
*   [x] Map database query aggregation and grouping strategies.
*   [x] Detail slow-moving stock aging bands and job cycle times.
*   [x] Document dashboard visual CSS charts and date range filtering.
*   [x] Map print preview options modal and export rules.
