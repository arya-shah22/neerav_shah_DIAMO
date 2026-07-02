# DIAMO ERP – PHASE 11.1
## ENTERPRISE ACCOUNTING REPORTS SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Enterprise Accounting Reports module of DIAMO ERP. This module aggregates financial data across all transaction registers to compile the General Ledger, Trial Balance, Day Book, and Chart of Accounts, enabling real-time visibility and compliance.

---

## 2. Reports Included
This module includes the following reports:
*   General Ledger & Ledger Statement.
*   Trial Balance (Detailed/Group-wise).
*   Day Book (Daily transaction logs).
*   Journal Register, Cash Book Report, and Bank Book Report.
*   Chart of Accounts & Account Summary sheets.

---

## 3. General Ledger
Provides a record of financial transactions:
*   *Columns:* Date, Voucher Number, Transaction Type, Party Name, Reference ID, Debit, Credit, Running Balance (with Dr/Cr indicators), and Narration.
*   *Drill Down:* Double-clicking a ledger row loads the source voucher.

---

## 4. Ledger Statement
Generates customer/supplier ledger statements:
*   **Reconciled Outstanding Aging:** Appends aging brackets (0–30, 31–60, 61–90 days) based on open invoices.
*   **Distribution Channels:** Supports direct printing, PDF exports, and email dispatches.

---

## 5. Ledger Print
*   **Format Layouts:** Renders company logo, letterhead information, page numbers, and custom terms.
*   **Page Modes:** Supports landscape and portrait outputs.

---

## 6. Trial Balance
Verifies that total debits equal total credits:
*   *Columns:* Account Group Name, Opening Balance (Dr/Cr), Transaction Value (Debit/Credit), and Closing Balance (Dr/Cr).
*   *Verification Formula:*
    $$\sum \text{Debit Balances} = \sum \text{Credit Balances}$$

---

## 7. Day Book
Consolidates all postings on a selected business date:
*   *Columns:* Opening Cash/Bank, Sales, Purchases, Cash Inflows, Cash Outflows, Bank Receipts, Bank Payments, Journal entries, and Closing Cash/Bank.

---

## 8. Journal Register
Itemizes all Journal Vouchers:
*   *Columns:* Voucher Number, Date, Journal Type, Debit Amount, Credit Amount, Variance, Narration, Prepared By, and Approval Status.

---

## 9. Cash Book Report
Logs physical currency movements:
*   *Columns:* Date, Voucher ID, Party Name, Reference Bill, Debit, Credit, Narration, and Running Cash Balance.

---

## 10. Bank Book Report
Logs bank account changes:
*   *Columns:* Date, Voucher ID, Party Name, Bank Account, Payment Mode, UTR/Cheque Number, Debit, Credit, and Running Balance.

---

## 11. Chart of Accounts
Displays the organization's account groups:
*   **Hierarchical Tree:** Groups ledgers under Parent Groups (e.g., Liabilities $\rightarrow$ Current Liabilities $\rightarrow$ Sundry Creditors).

---

## 12. Account Summary
*   **Card Layout:** Displays opening balance, debit/credit totals, closing balance, pending outstanding, and last transaction date for a selected ledger.

---

## 13. Search
Supports filters for: Account Name, Voucher Number, Reference ID, Narration, Amount, Date, and User.

---

## 14. Filters
Provides filters for: Today, Yesterday, This Month, Financial Year, Account Group, Cash, Bank, and Journal.

---

## 15. Sorting
Allows sorting by: Date, Account Name, Voucher Number, Amount, Debit, and Credit.

---

## 16. Grouping
Supports grouping by: Account Group, Month, Quarter, Financial Year, and Transaction Type.

---

## 17. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 18. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 19. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 20. Report Impact
Reports synchronize automatically when transactions are saved, modified, or reversed in Sales, Purchases, Cash Books, Bank Books, or JVs.

---

## 21. Validation
*   **Period Lock:** Restricts report dates to the bounds of the active financial year.
*   **Status Check:** Excludes drafts and cancelled vouchers from official ledger calculations.

---

## 22. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Posted Cash Books:** Adjustments require posting a Reversal Voucher.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 23. Permissions
Access is regulated by the following flags:
*   `view_ledger` / `view_trial_balance`
*   `export_financial_reports` / `view_day_book`

---

## 24. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 25. Notifications
*   **Imbalance Alerts:** Triggers alerts if the Trial Balance debits and credits do not reconcile.
*   **Liquidity Alerts:** Warns users when cash or bank balances drop below specified limits.

---

## 26. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 27. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 28. Future Enhancements
*   **Power BI Integration:** Direct APIs to export clean accounting data feeds to custom BI dashboards.
*   **AI Ledger Audits:** Automatically scans ledger postings to flag classification anomalies.

---

## 29. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 30. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
