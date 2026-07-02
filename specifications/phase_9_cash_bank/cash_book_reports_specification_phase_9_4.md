# DIAMO ERP – PHASE 9.4
## CASH BOOK – REPORTS, CASH REGISTER, SEARCH, PRINTING & EXPORT SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Cash Book Reports, Register, Search, Printing, and Export system of DIAMO ERP. This module aggregates cash payments and receipts to provide real-time visibility into cash balances, outstanding allocations, and cash flows.

---

## 2. Report Categories
Reports are grouped into operational, analytical, and financial categories:
*   **Operational Registers:** Cash Register, Cash Book Report, Daily Cash Report, Advance Register.
*   **Financial Reports:** Cash Flow Report, Outstanding Settlement Report.
*   **Performance Cards:** Party Analytics, Cash Analytics Dashboard.

---

## 3. Cash Register
Itemizes cash transactions:
*   *Columns:* Date, Reference Bill, Voucher Number, Transaction Type, Party Name, Opening Cash Balance, Cash Received (Debit), Cash Paid (Credit), Closing Cash Balance, Prepared By, status, and Narration.

---

## 4. Cash Book Report
*   *Columns:* Date, Document ID, Voucher Number, Transaction Type, Reference Invoice, Party, Amount, Running Cash Balance, and Outstanding Bill Allocation details.

---

## 5. Daily Cash Report
Summarizes daily movements:
*   *Columns:* Opening Cash, Total Cash In (Receipts), Total Cash Out (Payments), Net Daily Movement, Closing Cash Balance, transaction count, largest single receipt, and largest single payment.

---

## 6. Cash Flow Report
Analyzes cash inflow and outflow trends:
*   *Intervals:* Daily Flow, Weekly Flow, Monthly Flow, and Yearly Flow.

---

## 7. Advance Register
Tracks customer/supplier advance balances:
*   *Columns:* Advance ID, Party Name, Transaction Type, Original Advance, Utilized Amount, Pending Advance, and Adjustment History links.

---

## 8. Outstanding Settlement Report
Reconciles invoice settlements:
*   *Columns:* Invoice Number, Party Name, Original Bill Value, Total Paid/Received, Outstanding Balance, Settlement Date, and Status.

---

## 9. Party Analytics
*   *Metrics:* Customer-wise cash receipt trends, supplier-wise cash payment trends, employee advances, and cash outstanding aging trends.

---

## 10. Dashboard
The cash dashboard displays:
*   **Operational Cards:** Today's cash receipts, today's cash payments, active cash balances.
*   **Analytical Cards:** Largest single cash transaction, top cash-paying customers, and top cash suppliers.

---

## 11. Search
Supports filters for: Voucher Number, Party Name, Reference Bill, Amount, Transaction Type, Narration, and Date.

---

## 12. Filters
Provides filters for: Cash Payment, Cash Receipt, Today, Yesterday, This Month, and Amount Range.

---

## 13. Sorting
Allows sorting by: Date, Voucher Number, Party Name, Amount, Transaction Type, and Opening/Closing Balances.

---

## 14. Grouping
Supports grouping by: Date, Month, Party Name, Transaction Type, and Posting Status.

---

## 15. List Page
The list page features a dashboard grid:
*   **Grid Columns:** Auto-sized columns, groupable rows, pagination, and infinite scroll for large datasets.

---

## 16. Print Engine
Generates print templates for:
*   *Cash Receipt/Payment Voucher:* Renders company logo, party details, narration, manual voucher number, and signature blocks.

---

## 17. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 18. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **File Naming Rules:**
    $$\text{Filename} = \text{InvoiceNo} + "\_" + \text{PartyName} + "\_" + \text{Timestamp} + ".pdf"$$

---

## 19. Report Impact
Saving a Cash Book entry updates:
*   *Reports:* Cash Book, Cash Register, General Ledger, Trial Balance, Accounts Outstanding, and Balance Sheet.

---

## 20. Validation
*   **Row-Level Security:** Ensures users only access records matching their active company session and permission levels.
*   **Filter Bounds:** Ensures reports are isolated to the selected active financial year.

---

## 21. Business Rules
1.  **Real-Time Dashboard:** Dashboard KPIs update immediately upon saving cash vouchers.
2.  **No Cost Deletion:** Historical cash movements are archived and cannot be deleted.
3.  **Historical Integrity:** Once a financial year is closed, reports for that period are locked against changes.

---

## 22. Permissions
Access is regulated by the following flags:
*   `view_reports` / `export_data`
*   `view_cash_balances` / `bulk_export`

---

## 23. Audit
Logs all status changes:
*   Tracks report access, exported file histories, and filter selections.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 24. Notifications
*   **Liquidity Alerts:** Warns users when cash balances drop below threshold limits.
*   **Transaction Alerts:** Sends notifications for cash payments or receipts above specified values.

---

## 25. Performance
*   **Search Optimization:** Enforce database indexes on transaction dates to support fast available-stock calculations.
*   **Asynchronous Calculations:** Cash book running balances run in a background worker process.

---

## 26. Edge Cases
*   **Power Failure During Export:** System logs the error and allows the user to re-export once systems are restored.
*   **Reopen Invoice:** Reopening a paid invoice requires manager approval.

---

## 27. Future Enhancements
*   **Power BI Integration:** Direct APIs to export clean cash data feeds to custom BI dashboards.
*   **AI Cash Forecasting:** Recommends optimal payment dates based on historical cash flows.

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
