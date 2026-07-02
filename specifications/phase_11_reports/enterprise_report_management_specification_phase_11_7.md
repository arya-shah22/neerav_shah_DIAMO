# DIAMO ERP – PHASE 11.7
## ENTERPRISE REPORT PRINTING, EXPORT & SECURITY SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Enterprise Report Management System of DIAMO ERP. This module provides centralized services for printing, high-resolution PDF generation, Excel/CSV exporting, scheduled report dispatches, template customizations, and report security across all active modules in DIAMO ERP.

---

## 2. Report Management Overview
The Report Management System functions as a common utility engine. Any reporting page in the ERP (Accounting, Financial, Stock, Outstanding, or Tax Books) routes its raw data grid through this centralized engine to apply layout rendering, page margins, print queues, security flags, and delivery configurations consistently.

---

## 3. Print Engine
Generates print layouts for physical paper outputs:
*   **Layout Settings:** Portrait/Landscape orientation, margins (top, bottom, left, right), paper sizes (A4, Letter, Legal, Custom).
*   **Watermarks:** Renders text indicators (e.g., "Draft", "Cancelled", "Duplicate", "Original") based on voucher statuses.
*   **Document Headers/Footers:** Renders page numbers, date/time stamps, user credentials, company names, and active financial years on every page.

---

## 4. Print Settings
*   **Device Management:** Detects local and network printers, manages print jobs, and configures orientations.
*   *Legacy Printers:* Supports dot-matrix printing layouts for raw text bills and invoices (future compatibility).

---

## 5. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.
*   **Metadata Tagging:** Embeds creation date, author user ID, and company details in the PDF header.

---

## 6. Excel Export
*   **Layout Preservation:** Retains numeric column styling, decimal adjustments, auto-calculated totals, and frozen header rows.
*   **Formula Calculation:** Renders cell values with embedded calculations rather than static text values.

---

## 7. CSV Export
*   **Raw Output:** Exports flat files with UTF-8 encoding.
*   **Delimiters:** Configurable comma, pipe, or semicolon formatting.

---

## 8. Other Export Formats
*   *XML/JSON:* Exports structured data schemas for external system integrations (future compatibility).

---

## 9. Email Reports
*   **Distribution Rules:** Sends PDF or Excel attachments directly to multiple recipients (with CC/BCC controls).
*   **Templates:** Standard email body text is auto-populated based on report types.

---

## 10. Scheduled Reports
*   **Execution Frequencies:** Daily, weekly, monthly, or quarterly scheduled dispatches.
*   **Process Pipeline:** Runs query in a background worker, generates the document, exports it to the archive vault, and emails it to the recipient list.

---

## 11. Saved Report Templates
*   **Template Persistence:** Users can save specific layout selections, active column lists, filters, sort orders, and grouping keys.
*   **Access Scopes:** Can be saved as personal, department, or company-wide templates.

---

## 12. Report Customization
*   **Grid Customizations:** Users can show/hide columns, adjust column widths, and drag columns to change ordering.
*   *Formulas:* Create custom calculated columns in the UI grid (future compatibility).

---

## 13. Global Search
Search queries parse: Report Name, Voucher Number, Party Name, Reference ID, Amount, User ID, and Date.

---

## 14. Filters
Filters search results by: Company Name, Financial Year, Date Range, Department, Report Type, and Status.

---

## 15. Sorting
Sorts rows by: Date, Voucher Number, Amount, Party Name, and Status (Ascending/Descending).

---

## 16. Grouping
Groups data by: Company, Month, Quarter, Party, Ledger, and Voucher Type.

---

## 17. Report Security
*   **Access Control:** Restricts view, print, export, email, or scheduling actions to authorized user roles.
*   **Data Scopes:** Prevents unauthorized users from viewing specific branch accounts or restricted financial years.

---

## 18. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Operation Alerts:** Confirms successful prints, completed exports, or automated email dispatches.
*   **Security Warnings:** Alerts administrators of unauthorized access attempts.

---

## 20. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 21. Validation
*   **Filing Validation:** Ensures correct email formats, active printer connections, and valid date bounds before starting generation tasks.

---

## 22. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 23. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 24. Future Enhancements
*   **AI Financial Summaries:** Summarizes ledger trends in plain language.
*   **Natural Language Querying:** Translates user questions into query filters automatically.

---

## 25. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 26. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
