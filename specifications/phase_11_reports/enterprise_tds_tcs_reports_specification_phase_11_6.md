# DIAMO ERP – PHASE 11.6
## ENTERPRISE TDS & TCS REPORTS SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Enterprise TDS & TCS Reports module of DIAMO ERP. This module aggregates direct tax data from Purchases, Sales, Cash Books, Bank Books, and JVs to compile TDS/TCS registers, section-wise tax audits, and outstanding deposit logs, ensuring compliance with direct tax filing schedules.

---

## 2. Reports Included
This module includes the following reports:
*   TDS Register & TCS Register.
*   Party-wise TDS Report & Party-wise TCS Report.
*   Bill-wise TDS Report & Bill-wise TCS Report.
*   Section-wise TDS Report & Section-wise TCS Report.
*   Deduction Register & Collection Register.
*   TDS Summary, TCS Summary, Outstanding TDS, and Outstanding TCS.
*   TDS/TCS Dashboard.

---

## 3. TDS Register
Logs tax deducted at source:
*   *Columns:* Date, Voucher Number, Bill Number, Party Name, PAN Number, TDS Section (e.g., 194C, 194Q), Nature of Payment, Deductible Value, Tax Rate, Tax Amount, Net Payment, and Deduction Date.

---

## 4. TCS Register
Logs tax collected at source:
*   *Columns:* Date, Voucher Number, Bill Number, Party Name, PAN Number, TCS Section (e.g., 206C(1H)), Nature of Collection, Taxable Value, Tax Rate, Tax Amount, Invoice Total, and Collection Date.

---

## 5. Party-wise TDS Report
*   *Columns:* Party Name, PAN, TDS Section, Bill Count, Total Taxable Value, TDS Deducted, Net Payments, and Outstanding TDS Liability.

---

## 6. Party-wise TCS Report
*   *Columns:* Party Name, PAN, TCS Section, Bill Count, Total Taxable Value, TCS Collected, and Outstanding TCS Balance.

---

## 7. Bill-wise TDS Report
*   *Columns:* Bill Number, Bill Date, Party Name, PAN, TDS Section, Gross Bill Amount, TDS Rate, TDS Amount, Net Payable, and Deposit Status (Pending/Deposited).

---

## 8. Bill-wise TCS Report
*   *Columns:* Bill Number, Bill Date, Party Name, PAN, TCS Section, Invoice Value, TCS Rate, TCS Amount, Invoice Total, and Collection Status.

---

## 9. Section-wise TDS Report
Groups deductions by regulatory sections:
*   *TDS Sections:* Section 194C (Contracts), Section 194I (Rent), Section 194J (Professional fees), and Section 194Q (Goods purchase).
*   *Columns:* Section Code, Transaction Count, Total Taxable Value, TDS Amount, Average Rate, and Outstanding Deposit.

---

## 10. Section-wise TCS Report
Groups collections by regulatory sections:
*   *TCS Sections:* Section 206C(1) (Scrap), Section 206C(1F) (Motor vehicles), and Section 206C(1H) (Sale of goods).
*   *Columns:* Section Code, Transaction Count, Total Taxable Value, TCS Amount, Average Rate, and Outstanding Deposit.

---

## 11. Deduction Register
*   *Columns:* Deduction Date, Party Name, Voucher ID, Bill Number, TDS Section, Gross Amount, Deducted Amount, Challan Reference, and Challan Date.

---

## 12. Collection Register
*   *Columns:* Collection Date, Party Name, Voucher ID, Bill Number, TCS Section, Collected Amount, Deposit Challan Reference, and Challan Date.

---

## 13. TDS Summary
*   **Card Layout:* Total deductible value, total TDS deducted, deposited TDS, pending challan deposits, and outstanding TDS balances.

---

## 14. TCS Summary
*   **Card Layout:** Total taxable sales, total TCS collected, deposited TCS, pending challan deposits, and outstanding TCS balances.

---

## 15. Outstanding TDS
Tracks un-deposited deductions:
*   *Columns:* Party Name, Bill Number, TDS Amount, Deduction Date, Due Date, Pending Days, and Deposit Status.

---

## 16. Outstanding TCS
Tracks un-deposited collections:
*   *Columns:* Party Name, Bill Number, TCS Amount, Collection Date, Due Date, Pending Days, and Deposit Status.

---

## 17. Dashboard
*   **KPI Widgets:** Monthly TDS deductions, monthly TCS collections, pending challan deposits, upcoming tax deadlines, top vendor tax sections, and monthly tax trends.

---

## 18. Search
Supports filters for: Party Name, PAN, Bill Number, Voucher Number, TDS/TCS Section, and Date.

---

## 19. Filters
Provides filters for: Financial Year, Return Period (Month/Quarter), TDS Section, TCS Section, and Deposit Status.

---

## 20. Sorting
Allows sorting by: Date, Party Name, PAN, Bill Number, Taxable Value, and Tax Amount.

---

## 21. Grouping
Supports grouping by: Section Code, Party Name, PAN, Month, and Quarter.

---

## 22. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 23. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 24. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 25. Report Impact
TDS/TCS reports synchronize automatically when transactions are saved, modified, or reversed in Sales, Purchases, Cash Books, Bank Books, or JVs.

---

## 26. Validation
*   **PAN Integrity:** Validates PAN syntax (10-character alphanumeric structure). If PAN is missing or invalid, the system automatically defaults the TDS rate to 20% (Section 206AA).
*   **Section Checks:** Validates transaction amounts against Section 194Q thresholds (₹5,000,000 limit) to trigger automated deductions.

---

## 27. Business Rules
1.  **PAN Validation Default Rate:** If a party's PAN is missing or invalid, the system defaults TDS rate to 20% as per Section 206AA.
2.  **Section 194Q Threshold:** Validates cumulative purchase amounts against ₹50,00,000 annual threshold to trigger TDS applicability.
3.  **TCS Section 206C(1H) Threshold:** Validates cumulative sale amounts against ₹50,00,000 annual threshold to trigger TCS applicability.
4.  **Approval Logs:** Historical TDS/TCS audit records cannot be deleted.

---

## 28. Permissions
Access is regulated by the following flags:
*   `view_tds_reports` / `view_tcs_reports`
*   `export_tax_reports` / `modify_tds_rates`

---

## 29. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 30. Notifications
*   **Challan Reminders:** Alerts users before tax deposit due dates.
*   **Missing PAN Warnings:** Alerts users if transactions are posted for parties without valid PANs.

---

## 31. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 32. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 33. Future Enhancements
*   **Direct Challan Payments:** Integrates with banking portals to automate TDS challan creations.
*   **AI Compliance Checker:** Flags transactions showing incorrect tax sections or rate classifications.

---

## 34. Architect Recommendations
1.  **Background Aggregation:** Run section-wise and party-wise TDS/TCS calculations in background worker processes to prevent UI lag.
2.  **Indexed Section Columns:** Add database indexes on `tds_section` and `tcs_section` columns for performant report grouping.

---

## 35. Final Completion Checklist
*   [x] Document TDS/TCS register column definitions and data sources.
*   [x] Map party-wise and section-wise aggregation queries.
*   [x] Detail PAN validation and Section threshold business rules.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document dashboard KPIs and monthly trend metrics.
