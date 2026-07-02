# DIAMO ERP – PHASE 12.9
## DIAMOND INVENTORY MANAGEMENT – INVENTORY REPORTS & STOCK VALUATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Inventory Reports, Stock Analytics, Valuation, and Inventory Business Intelligence engine of DIAMO ERP. This module processes diamond master entries, transactional dispatches, and outsource processing records to compile real-time inventory reports and value asset holdings.

---

## 2. Reports Included
*   **Operational Reports:** Inventory Summary, Available Stock, Consignment Hold, Reserved Stock, Outsource Job Work, Certified/Non-Certified Stock, and Quality Analysis.
*   **Business Intelligence Reports:** Supplier Analysis, Customer Purchase History, Inventory Ageing brackets, Fast/Slow-Moving Stock lists, Dead Stock warnings, Inventory Valuation methods, and Turnover indicators.

---

## 3. Inventory Summary
*   **Metadata:** Total stock count, Available count, Reserved count, Hold count, Sold count, Job Work count, Returned count, total carats, total pieces, current inventory valuation, average carat cost rate, and average selling rate.

---

## 4. Available Stock Report
*   **Columns:** Stock ID, Shape, Weight (Carat), Color, Clarity, Cut, Polish, Symmetry, Certificate Number, Purchase Date, Purchase Rate, Current Landed Cost, and Location.

---

## 5. Hold & Reserved Reports
*   **Columns:** Stock ID, Shape, Weight, Color, Clarity, Customer Name (for reservations), Broker Name, Hold Date, Expiry Date, Reference Voucher, and Reason code.

---

## 6. Job Work Report
*   **Columns:** Stock ID, Job Worker Name, Issue Date, Expected Return Date, Pending Days, Labor Cost Rate, and Outsource Status.

---

## 7. Certified & Non-Certified Reports
*   **Columns:** Stock ID, Certificate Type (IGI, GIA), Certificate Number, Laboratory Name, Verification Status (Verified/Pending), Purchase Value, and Estimated Market Value.

---

## 8. Quality Analysis
*   **Aggregations:** Grouped summaries by Shape, Color, Clarity, Cut, Polish, Symmetry, and Carat Weight Range, listing total stone count, total carats, average rate, and total valuation.

---

## 9. Supplier Analysis
*   **Metrics:** Supplier Name, Total Purchases (Carats/Amount), Available Inventory, Sold Inventory, Average Carat Rate, and Outstanding Payables.

---

## 10. Sales Analysis
*   **Metrics:** Customer Name, Total Sold Diamonds, Sales Value, Average Selling Rate, Gross Margin, Net Margin, and Brokerage Paid.

---

## 11. Inventory Ageing
*   **Ageing Bands:** Automatically classifies packets into: 0–30 Days, 31–60 Days, 61–90 Days, 91–180 Days, 181–365 Days, and Above 365 Days, listing Stock ID, purchase date, age in days, and current valuation.

---

## 12. Fast Moving Inventory
*   **Top Sellers:** Renders frequently sold shapes, colors, clarity brackets, average days to sell, and sales velocity indices.

---

## 13. Slow Moving Inventory
*   **Low Demand Stock:** Identifies stones with low request rotations, high average holding days, and low stock turnover rates.

---

## 14. Dead Stock
*   **No-Movement Flags:** Identifies packets with no transaction changes for >180 days or >365 days, listing Stock ID, current valuation, hold location, and recommendations.

---

## 15. Inventory Valuation
*   **Valuation Methods:** Supports Purchase Cost, Estimated Market Value, and Weighted Average Cost (WAC). Renders formulas for FIFO and LIFO methods (future compatibility).

---

## 16. Inventory Turnover
*   **Ratios:** Calculates Inventory Turnover Ratio (Cost of Goods Sold / Average Inventory Value) and Average Holding Period in days.

---

## 17. Profit Analysis
*   **Margin Analysis:** Tracks Cost Rate, Selling Rate, Gross Profit, Net Profit, Profit %, Brokerage Paid, and direct job-work expenses.

---

## 18. Inventory Dashboard
*   **KPI Visualizations:** Total asset value gauge, Available/Reserved ratio charts, Fast-Moving/Dead-Stock tables, and monthly sales trend lines.

---

## 19. Search
Supports filters for: Stock ID, Certificate ID, Shape, Color, Clarity, Supplier, Customer, and Date.

---

## 20. Filters
Provides filters for: Availability, Certification Status, Shape, Color, Clarity, Cut/Polish/Symmetry, and Date Range.

---

## 21. Sorting
Allows sorting by: Purchase Date, Weight, Cost Rate, Selling Rate, Profit Margin, and Age in Days.

---

## 22. Grouping
Supports grouping by: Shape, Color, Clarity, Supplier, Customer, Month, Quarter, and Financial Year.

---

## 23. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 24. PDF Engine
*   **Export Properties:** Renders encrypted, high-res PDF pages with automatic naming rules.

---

## 25. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 26. Report Impact
Automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 27. Validation
*   Validates reports against transaction ledgers, checking for negative inventory balances or mismatched valuation sums.

---

## 28. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 29. Permissions
Access is regulated by the following flags:
*   `view_inventory_reports` / `view_stock_valuation`
*   `view_margin_metrics` / `export_inventory_reports`

---

## 30. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 31. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 32. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 33. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 34. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 35. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 36. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
