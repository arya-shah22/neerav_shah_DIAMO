# DIAMO ERP – PHASE 11.3
## ENTERPRISE OUTSTANDING REPORTS SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Enterprise Outstanding Reports module of DIAMO ERP. This module aggregates billing and payment data to compile customer receivables, supplier payables, broker fees, and aged invoices, enabling real-time credit control and collection efficiency.

---

## 2. Reports Included
This module includes the following reports:
*   Customer Outstanding & Supplier Outstanding.
*   Broker Outstanding & Employee Outstanding.
*   Bill-wise Outstanding & Ageing Analysis.
*   Advance Register, Collection Report, and Payment Report.
*   Outstanding Summary dashboard.

---

## 3. Customer Outstanding
Tracks money owed by customers:
*   *Columns:* Customer Name, Opening Balance, Total Invoiced, Amount Received, Pending Balance, Overdue Value, Advance Balance, Last Collection Date, Credit Days, Credit Limit, and Overdue Status.

---

## 4. Supplier Outstanding
Tracks money owed to suppliers:
*   *Columns:* Supplier Name, Opening Balance, Total Purchases, Amount Paid, Pending Balance, Overdue Value, Advance Paid, Last Payment Date, Credit Days, and Status.

---

## 5. Broker Outstanding
Itemizes unpaid brokerage:
*   *Columns:* Broker Name, Brokerage Earned, Brokerage Paid, Pending Brokerage, and Settlement Status.

---

## 6. Employee Outstanding
Tracks advance accounts:
*   *Columns:* Employee Name, Advance Amount, Expense Claims, Adjusted Amount, and Net Outstanding Balance.

---

## 7. Bill-wise Outstanding
*   *Columns:* Bill Number, Party Name, Date, Due Date, Original Amount, Amount Paid, Pending Balance, Days Overdue, and Settlement Status (Pending/Partial).

---

## 8. Ageing Analysis
Classifies outstanding invoices based on age:
*   **Ageing Categories:** 0–30 days, 31–60 days, 61–90 days, 91–180 days, 181–365 days, and >365 days.
*   *Calculation Rule:* Invoices calculate age based on the invoice due date.

---

## 9. Advance Register
Tracks customer/supplier advance balances:
*   *Columns:* Advance ID, Party Name, Transaction Date, Original Advance, Utilized Amount, Pending Advance, and Adjustment History links.

---

## 10. Collection Report
*   *Columns:* Customer Name, Invoices Settled, Total Value Collected, Pending Collections, Collection %, and Average Collection Days.

---

## 11. Payment Report
*   *Columns:* Supplier Name, Invoices Settled, Total Value Paid, Pending Payments, and Average Payment Days.

---

## 12. Outstanding Summary
*   **Card Layout:** Displays total receivables, total payables, total broker outstanding, total advance balances, net current outstanding, and overdue amounts.

---

## 13. Search
Supports filters for: Party Name, Bill Number, Reference ID, Amount, Outstanding Value, and Status.

---

## 14. Filters
Provides filters for: Customer, Supplier, Broker, Employee, Outstanding, Overdue, and Date Range.

---

## 15. Sorting
Allows sorting by: Party Name, Invoice Amount, Due Date, Days Overdue, and Voucher ID.

---

## 16. Grouping
Supports grouping by: Account Group, Ageing Bucket, Status, and Company.

---

## 17. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 18. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:* Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 19. Report Impact
Outstanding reports update immediately when transactions are saved, modified, or reversed in Sales, Purchases, Cash Books, Bank Books, or JVs.

---

## 20. Validation
*   **Balance Reconciliation:** Confirms that the outstanding balance matches the corresponding general ledger control account.
*   **Lock Check:** Reconciled invoices cannot be modified without first reversing the payment entry.

---

## 21. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 22. Permissions
Access is regulated by the following flags:
*   `view_receivables` / `view_payables`
*   `export_outstanding_reports` / `modify_credit_limits`

---

## 23. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 24. Notifications
*   **Overdue Alerts:** Notifies credit controllers when an invoice becomes overdue.
*   **Credit Warning:** Blocks transactions or displays warnings if a party exceeds their credit limit.

---

## 25. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 26. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 27. Future Enhancements
*   **AI Cash Flow Forecasting:** Recommends optimal payment dates based on historical cash flows.
*   **AI Collection Forecasting:** Predicts cash collections based on customer payment history.

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
