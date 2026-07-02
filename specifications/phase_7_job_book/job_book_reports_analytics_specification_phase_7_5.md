# DIAMO ERP – PHASE 7.5
## JOB BOOK – REPORTS, ANALYTICS & PERFORMANCE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Job Book Reports, Analytics, and Performance Management module of DIAMO ERP. This module provides a Business Intelligence (BI) environment aggregating dispatches, returns, costs, and revenues across manufacturing departments. It outlines dashboard configurations, worker yields, process profitability metrics, and audit tracking parameters.

---

## 2. Report Categories
Reports are grouped into operational, financial, and management categories:
*   **Operational Registers:** Job Register, Pending Jobs, Completed Jobs, Wastage Report, Labor Analytics.
*   **Financial Reports:** Job Expense Register, Job Income Register, Job Cost Report, Profitability Analytics.
*   **Performance Cards:** Worker Yield Cards, Customer Profitability Metrics, Process Efficiency Cards, Quality yields.
*   **Executive View:** Management Dashboard.

---

## 3. Job Register
Itemizes dispatches and receipts:
*   *Columns:* Job Card ID, Job Worker, Customer Reference, Issue Date, Expected Return Date, Actual Return Date, Status, Quality, Pieces (Issued/Returned), Carat (Issued/Returned), Labor Fees, Service Income, Net Profit, and Completion Duration (Days).

---

## 4. Pending Jobs
Displays active dispatches at contractors:
*   *Columns:* Job Card ID, Days Outstanding, Expected Completion Date, priority status (Normal/Urgent), Department, Job Worker, and color alerts (Green/Yellow/Red).

---

## 5. Completed Jobs
Logs finalized dispatches:
*   *Columns:* Job Card ID, Receipt Date, Base Labor Fees, Total Capitalized Cost, Billing Income, Gross Profit, and Cycle Duration (days).

---

## 6. Job Expense
Reconciles service costs:
*   *Columns:* Expense ID, Job Worker, Service Type (Polishing/Sawing), Base Rate, CGST/SGST/IGST, TDS Deduction, Total Expenses, and Settlement Status (Unpaid/Partially Paid/Paid).

---

## 7. Job Income
Tracks client processing revenue:
*   *Columns:* Income ID, Customer, Service Billing Category, Base Rate, Tax Output, TDS Receivable, Gross Bill, Outstanding Balance, and Settlement Status.

---

## 8. Job Cost
Logs accumulated diamond lot costing bases:
*   *Columns:* Lot ID, Raw Material Cost, Labor cost, Certification fees, Transit expenses, Wastage value, Scrap recovery, Final cost basis, and Cost per carat.

---

## 9. Worker Performance
Evaluates contractor efficiency and quality yields:
*   *Metrics:* Total jobs processed, pending job load, average cycle duration, yield deviation percentages, percentage of damaged stones, and cumulative efficiency ratings (0-100%).

---

## 10. Customer Performance
*   *Metrics:* Total jobs billed, service revenue totals, outstanding accounts receivable, average margin per job, and customer reliability ratings.

---

## 11. Process Performance
Analyzes yield metrics across operations:
*   *Stages Analyzed:* Planning, Sawing, Laser, Bruting, Polishing, Certification, Sorting.
*   *Metrics:* Total lots processed, average cycle duration, average cost per carat, average service revenue, and process profitability margins.

---

## 12. Quality Analytics
*   *Metrics:* Carat count processed per grade, average labor expense per carat, average wastage value per grade, and yield averages.

---

## 13. Wastage Report
Tracks process weight loss:
*   *Columns:* Job Card ID, Worker Name, Expected Wastage, Actual Wastage, Wastage variance, Reason, and Manager Approval codes.

---

## 14. Labour Analytics
*   *Metrics:* Labor cost per carat, average rate comparisons, and rate deviations across departments.

---

## 15. Profitability
Calculates profitability metrics:
*   *Aggregations:* Profitability analyzed by Job, Worker, Customer, Quality grade, Process stage, and Month/Year.

---

## 16. Dashboard
The management dashboard displays key operational metrics:
*   **Operational Cards:** Active dispatches, pending counts, overdue counts.
*   **Financial Cards:** Today's labor expenses, today's billing revenue, net margins.
*   **Performance Leaderboard:** Top polishers, top clients, and most profitable processes.

---

## 17. Search
Supports filters for: Job Card ID, Worker Name, Customer Reference, Quality Grade, Packet Number, and Department.

---

## 18. Filters
Provides filters for: Today, Yesterday, This Week, This Month, Financial Year, Pending, Completed, Overdue, and Quality Grade.

---

## 19. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.

---

## 20. Graphs
The system renders analytics charts:
*   *Line Charts:* Job and yield trends over time.
*   *Bar Charts:* Worker yield comparisons and process profitability.

---

## 21. Validation
*   **Row-Level Security:** Ensures users only access records matching their active company session and permission levels.
*   **Filter Bounds:** Ensures reports are isolated to the selected active financial year.

---

## 22. Business Rules
1.  **Real-Time Dashboard:** Dashboard KPIs update immediately upon saving returns or expenses.
2.  **No Cost Deletion:** Historical costing steps are archived and cannot be deleted.
3.  **Historical Integrity:** Once a financial year is closed, reports for that period are locked against changes.

---

## 23. Permissions
Access is regulated by the following flags:
*   `view_reports` / `export_data`
*   `view_costs` / `view_profit_margins`

---

## 24. Audit
Logs all status changes:
*   Tracks report access, exported file histories, and filter selections.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 25. Future Enhancements
*   **AI Profit Prediction:** Analyzes rough diamond shapes to predict polished yield weights.
*   **Power BI Integration:** Direct APIs to export clean data feeds to custom BI dashboards.

---

## 26. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Costing API:** Run costing calculations in background worker processes to prevent UI lag.

---

## 27. Final Completion Checklist
*   [x] Document report categories and register columns.
*   [x] Map worker, customer, and process performance matrices.
*   [x] Detail labor yield charts and profitability calculations.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document export protocols and dashboard metrics.
