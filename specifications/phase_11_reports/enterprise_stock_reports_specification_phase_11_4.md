# DIAMO ERP – PHASE 11.4
## ENTERPRISE STOCK REPORTS SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Enterprise Stock Reports module of DIAMO ERP. This module aggregates data from Purchases, Sales, Job Books, and Challan Books to compile stock registers, packet lifecycles, and inventory valuations, ensuring packet-level traceability across all stages.

---

## 2. Reports Included
This module includes the following reports:
*   Stock Register & Stock Ledger.
*   Packet Ledger & Packet History.
*   Packet Movement & Quality-wise Stock.
*   Party-wise Stock & Location-wise Stock.
*   Available Stock, Reserved Stock, Job Work Stock, and In Transit Stock.
*   Dead Stock, Stock Ageing, and Stock Valuation.
*   Opening Stock, Closing Stock, and Stock Summary.
*   Inventory Dashboard.

---

## 3. Stock Register
Itemizes all historical inventory movements:
*   *Columns:* Date, Packet Number, Quality, Carat Weight, Rate per Carat, Total Amount, Transaction Type (Inward/Outward), Reference Voucher, Party Name, Location, and Running Balance (Carats).

---

## 4. Stock Ledger
Summarizes packet changes over time:
*   *Columns:* Packet Number, Opening Bal (Carats/Value), Purchase Inward, Sales Outward, Returns (Sales/Purchase), Job Issue, Job Receive, Stock Adjustments, and Closing Balance.

---

## 5. Packet Ledger
Detailed lifecycle sheet for individual diamond packets:
*   *Columns:* Packet ID, Quality, Original Carat, Current Carat, Landed Cost Rate, Current Value, Current Status (Available/Reserved/Job Work/Transit), and Location (Vault/Worker ID).

---

## 6. Packet History
Displays the step-by-step journey of a packet:
*   **Journey Stages:** Purchase $\rightarrow$ Vault $\rightarrow$ Outsource Job Work $\rightarrow$ Job Receive $\rightarrow$ Internal Transfer $\rightarrow$ Sale $\rightarrow$ Return.
*   *Details:* Logs user ID, timestamp, transaction ID, and weight change for each movement.

---

## 7. Packet Movement
*   *Columns:* Date/Time, Source Module, Destination Module, Packet Number, Quality, Carat, Weight Variance, User ID, and Reference ID.

---

## 8. Quality-wise Stock
Aggregates stock by quality grade:
*   *Columns:* Quality Grade, Packet Count, Total Carat, Average Cost/Rate, Total Value, Reserved Carats, and Available Carats.

---

## 9. Party-wise Stock
Tracks stock held by external parties (e.g., job workers, consignees):
*   *Columns:* Party Name, Packet Count, Total Carat, Cost Value, Pending Job Work Carats, and Reserved Stock Carats.

---

## 10. Location-wise Stock
Tracks stock across physical vaults:
*   *Vault Locations:* Vault (Central), Office Desk, Job Worker (Outsource), Transit, and Branch Offices.
*   *Columns:* Location Name, Packet Count, Total Carats, and Value.

---

## 11. Available Stock
*   *Columns:* Packet ID, Quality, Carats, Cost Rate, Total Value, Location Name, and Days in Vault.

---

## 12. Reserved Stock
Tracks stock committed to orders:
*   *Columns:* Packet ID, Customer Name, Sales Order ID, Job Order ID, Reservation Date, Expiry Date, and Status (Active/Expired).

---

## 13. Job Work Stock
Tracks stock issued to outsource workers:
*   *Columns:* Packet ID, Job Worker Name, Process Issued, Issue Date, Expected Return Date, Days Pending, Issued Carats, and Estimated Labor Cost.

---

## 14. In Transit Stock
Tracks stock in transit between branch vaults:
*   *Columns:* Source Location, Destination, Dispatch Date, Courier Reference, Packet Count, Carats, and Status (Dispatched/Received).

---

## 15. Dead Stock
Identifies slow-moving inventory:
*   **Inactivity Brackets:** >30 days, >60 days, >90 days, >180 days, and >365 days of zero movement.

---

## 16. Stock Ageing
Classifies inventory age since purchase or production:
*   **Ageing Brackets:** 0–30 days, 31–60 days, 61–90 days, 91–180 days, 181–365 days, and >365 days.

---

## 17. Stock Valuation
Calculates total inventory asset value:
*   **Valuation Methods:** Weighted Average Cost (WAC), Specific Identification (Landed Cost per Packet), and Market Value comparison.

---

## 18. Opening Stock
*   *Columns:* Quality, Packet Count, Total Carats, Average Rate, and Opening Value.

---

## 19. Closing Stock
*   *Columns:* Quality, Packet Count, Total Carats, Average Rate, and Closing Value.

---

## 20. Stock Summary
*   **Card Layout:** Total packets, total carats, central vault stock, reserved stock, job worker stock, in-transit stock, and total valuation.

---

## 21. Inventory Dashboard
*   **KPI Widgets:** Total stock value, available vs. reserved ratios, processing yields, age distributions, fast-moving items, and stock trend graphs.

---

## 22. Search
Supports filters for: Packet Number, Quality, Party Name, Reference ID, Location, and Carat Weight.

---

## 23. Filters
Provides filters for: Quality Grade, Status (Available/Reserved/Job Work/Transit), Location, Date Range, and Carat Range.

---

## 24. Sorting
Allows sorting by: Packet Number, Carat Weight, Cost Value, Age (Days), and Last Transaction Date.

---

## 25. Grouping
Supports grouping by: Quality, Current Location, Processing Status, and Month.

---

## 26. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 27. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 28. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 29. Report Impact
Stock balances and histories update immediately when transactions are saved, modified, or reversed in Sales, Purchases, Cash Books, Bank Books, or JVs.

---

## 30. Validation
*   **Negative Stock Protection:** Blocks outbound transactions if the packet carat weight would drop below zero.
*   **State Locking:** Reserved packets cannot be issued to job work or sold to another customer without releasing the reservation.

---

## 31. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 32. Permissions
Access is regulated by the following flags:
*   `view_stock_valuation` / `view_cost_rates`
*   `release_reservations` / `adjust_stock_weights`

---

## 33. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 34. Notifications
*   **Stock Warnings:** Alerts users when a packet is marked as dead stock or when vault stock levels drop below safety minimums.
*   **Wastage Alerts:** Alerts users if job work wastage exceeds configured tolerances.

---

## 35. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 36. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 37. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 38. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 39. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
