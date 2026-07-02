# DIAMO ERP – PHASE 10.5
## BANK BOOK – REPORTS, BANK REGISTER, SEARCH, PRINTING & EXPORT SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Bank Book Reports, Register, Search, Printing, and Export system of DIAMO ERP. This module aggregates bank payments and receipts to provide real-time visibility into bank balances, outstanding allocations, bank statements, and reconciliations.

---

## 2. Report Categories
Reports are grouped into operational, analytical, and financial categories:
*   **Operational Registers:** Bank Register, Bank Book Report, Bank Statement Report, Daily Bank Report.
*   **Financial Reports:** Bank Flow Report, Outstanding Settlement Report, Bank Reconciliation Report.
*   **Performance Cards:** Bank Analytics, Management Dashboard.

---

## 3. Bank Register
Itemizes bank transactions:
*   *Columns:* Date, Reference Bill, Voucher Number, Transaction Type, Bank Account, Party Name, Opening Balance, Receipt Amount (Debit), Payment Amount (Credit), Closing Balance, Prepared By, status, and Narration.

---

## 4. Bank Book Report
*   *Columns:* Date, Document ID, Voucher Number, Transaction Type, Reference Invoice, Party, Bank Account, Amount, Opening Balance, Closing Balance, and Outstanding Bill Allocation details.

---

## 5. Bank Statement Report
Reconciles statement feeds:
*   *Columns:* Bank Name, Statement Date, Transaction Date, Description, UTR/Reference Number, Cheque Number, Debit, Credit, Running Balance, and Reconciliation Status.

---

## 6. Daily Bank Report
Summarizes daily movements:
*   *Columns:* Opening Balance, Total Receipts, Total Payments, Net Daily Movement, Closing Balance, transaction count, largest single receipt, and largest single payment.

---

## 7. Bank Flow Report
Analyzes treasury inflow and outflow trends:
*   *Intervals:* Daily Flow, Weekly Flow, Monthly Flow, and Yearly Flow.
*   *Breakdowns:* Bank-wise Flow, Company-wise Flow.

---

## 8. Advance Register
Tracks customer/supplier advance balances:
*   *Columns:* Advance ID, Party Name, Transaction Type, Original Advance, Utilized Amount, Pending Advance, and Adjustment History links.

---

## 9. Outstanding Settlement Report
Reconciles invoice settlements:
*   *Columns:* Invoice Number, Party Name, Original Bill Value, Total Paid/Received, Outstanding Balance, Settlement Date, and Status.

---

## 10. Bank Analytics
*   *Metrics:* Bank-wise transaction volumes, customer receipts, supplier payments, interest earned, bank charges, and cash outstanding aging trends.

---

## 11. Dashboard
The bank dashboard displays:
*   **Operational Cards:** Today's receipts, today's payments, active bank balances, pending receipts, and pending payments.
*   **Analytical Cards:** Outstanding deposits, outstanding cheques, largest single receipt, top cash-paying customers, and monthly bank flow trends.

---

## 12. Search
Supports filters for: Voucher Number, Party Name, Reference Bill, Amount, Transaction Type, UTR Number, Cheque Number, and Date.

---

## 13. Filters
Provides filters for: Bank Payment, Bank Receipt, Cheque, NEFT, RTGS, IMPS, UPI, Today, Yesterday, This Month, and Amount Range.

---

## 14. Sorting
Allows sorting by: Date, Reference Bill, Voucher Number, Amount, Party Name, and Opening/Closing Balances.

---

## 15. Grouping
Supports grouping by: Bank Account, Party Name, Transaction Type, Month, Quarter, Financial Year, and Status.

---

## 16. List Page
The list page features a dashboard grid:
*   **Grid Columns:** Auto-sized columns, groupable rows, pagination, and infinite scroll for large datasets.

---

## 17. Print Engine
Generates print templates for:
*   *Bank Receipt/Payment Voucher:* Renders company logo, party details, narration, manual voucher number, UTR references, and signature blocks.

---

## 18. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 19. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **File Naming Rules:**
    $$\text{Filename} = \text{InvoiceNo} + "\_" + \text{PartyName} + "\_" + \text{Timestamp} + ".pdf"$$

---

## 20. Report Impact
Saving a Bank Book entry updates:
*   *Reports:* Bank Register, Bank Book, General Ledger, Trial Balance, Accounts Outstanding, Balance Sheet, and Cash Flow.

---

## 21. Validation
*   **Row-Level Security:** Ensures users only access records matching their active company session and permission levels.
*   **Filter Bounds:** Ensures reports are isolated to the selected active financial year.

---

## 22. Business Rules
1.  **Real-Time Dashboard:** Dashboard KPIs update immediately upon saving bank vouchers.
2.  **No Cost Deletion:** Historical bank movements are archived and cannot be deleted.
3.  **Historical Integrity:** Once a financial year is closed, reports for that period are locked against changes.

---

## 23. Permissions
Access is regulated by the following flags:
*   `view_reports` / `export_data`
*   `view_bank_balances` / `bulk_export`

---

## 24. Audit
Logs all status changes:
*   Tracks report access, exported file histories, and filter selections.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 25. Notifications
*   **Liquidity Alerts:** Warns users when bank balances drop below threshold limits or overdrafts are exceeded.
*   **Transaction Alerts:** Sends notifications for bank payments or receipts above specified values.

---

## 26. Performance
*   **Search Optimization:** Enforce database indexes on transaction dates to support fast available-stock calculations.
*   **Asynchronous Calculations:** Bank book running balances run in a background worker process.

---

## 27. Edge Cases
*   **Power Failure During Export:** System logs the error and allows the user to re-export once systems are restored.
*   **Reopen Invoice:** Reopening a paid invoice requires manager approval.

---

## 28. Future Enhancements
*   **Power BI Integration:** Direct APIs to export clean bank data feeds to custom BI dashboards.
*   **AI Cash Forecasting:** Recommends optimal payment dates based on historical cash flows.

---

## 29. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
