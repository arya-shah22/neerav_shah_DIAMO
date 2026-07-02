# DIAMO ERP – PHASE 11.5
## ENTERPRISE GST REPORTS SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Enterprise GST Reports module of DIAMO ERP. This module aggregates tax data from Sales, Purchases, Debit Notes, and Credit Notes to compile GST registers, GSTR-1, GSTR-2, and GSTR-3B tax returns, ensuring compliance with state and national tax regulations.

---

## 2. Reports Included
This module includes the following reports:
*   GST Register & GST Summary.
*   Input GST Register & Output GST Register.
*   Party-wise GST Report & Bill-wise GST Report.
*   HSN Summary & GST Rate-wise Summary.
*   GSTR-1, GSTR-2, GSTR-2 Summary, and GSTR-3B.
*   GST Reconciliation & GST Dashboard.

---

## 3. GST Register
Logs tax details for all transactions:
*   *Columns:* Date, Voucher Number, Party Name, GSTIN, Place of Supply (POS), Taxable Value, CGST, SGST, IGST, CESS, Total Tax, Invoice Value, and Status.

---

## 4. GST Summary
*   **Card Layout:** Total outward taxable supplies, total inward taxable supplies, net tax liability, CGST balance, SGST balance, and IGST balance.

---

## 5. Input GST Register
Tracks Input Tax Credit (ITC) from purchases:
*   *Columns:* Date, Bill Number, Supplier Name, GSTIN, Taxable Amount, CGST, SGST, IGST, ITC Eligibility (Eligible/Blocked), and Claim Status.

---

## 6. Output GST Register
Tracks tax liabilities on sales:
*   *Columns:* Date, Invoice Number, Customer Name, GSTIN, Taxable Amount, CGST, SGST, IGST, CESS, and Total Output Liability.

---

## 7. Party-wise GST Report
*   *Columns:* Party Name, GSTIN, State Code, Outward Taxable Value, Inward Taxable Value, CGST, SGST, IGST, and Net Payable/Receivable Tax.

---

## 8. Bill-wise GST Report
*   *Columns:* Invoice Number, Date, Party Name, GSTIN, HSN Code, Tax Rate %, Taxable Value, CGST, SGST, IGST, CESS, and Invoice Total.

---

## 9. HSN Summary
Aggregates tax details by Harmonized System of Nomenclature (HSN) code:
*   *Columns:* HSN Code, Description, UQC, Total Quantity, Carats, Total Taxable Value, CGST, SGST, IGST, and Total Tax.

---

## 10. GST Rate-wise Summary
*   **Rate Brackets:** Groups transactions by standard tax rates: 0%, 0.25% (diamonds), 3% (precious metals), 5%, 12%, 18%, and 28%.

---

## 11. GSTR-1
Generates outward supply details:
*   *Filing Categories:* B2B Invoices, B2C Large, B2C Small, Credit/Debit Notes (Registered/Unregistered), Export Invoices, HSN Summary, and Document Summary.

---

## 12. GSTR-2
*   *Columns:* Invoice Number, Supplier GSTIN, Taxable Value, CGST, SGST, IGST, Match Status (Matched/Mismatch/Supplier Pending), and Action Taken.

---

## 13. GSTR-2 Summary
*   *Columns:* Eligible ITC, Blocked ITC (Section 17(5)), Reversed ITC, Net Claimable ITC, and supplier reconciliation metrics.

---

## 14. GSTR-3B
Consolidated monthly tax summary:
*   **Tax Liability Sections:** Outward Taxable Supplies, Reverse Charge inward supplies, Eligible ITC, Exempt/Nil Rated inflows, Interest, and Tax Payment details.

---

## 15. GST Reconciliation
*   **Comparison Engine:** Reconciles the Sales/Purchase Register against GST returns and ledger control accounts.
*   *Audit Flags:* Identifies duplicate invoices, missing supplier GSTINs, tax rate variances, and HSN formatting errors.

---

## 16. GST Dashboard
*   **KPI Widgets:** Monthly liability trends, current month liability, ITC balance, pending filings, supplier compliance ratings, and upcoming due dates.

---

## 17. Search
Supports filters for: Invoice Number, Party Name, GSTIN, HSN Code, Voucher Number, and Transaction Date.

---

## 18. Filters
Provides filters for: Financial Year, Return Period (Month/Quarter), GST Rate, HSN, POS State, and Document Type.

---

## 19. Sorting
Allows sorting by: Date, Invoice Number, Party Name, GSTIN, Taxable Value, and Tax Amount.

---

## 20. Grouping
Supports grouping by: GST Rate, HSN Code, State, Party, and Month.

---

## 21. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 22. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 23. Export
*   **Supported Formats:** Excel, PDF, CSV, and JSON (Government portal offline format).
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 24. Report Impact
GST reports synchronize automatically when transactions are saved, modified, or reversed in Sales, Purchases, Cash Books, Bank Books, or JVs.

---

## 25. Validation
*   **Tax Audits:** Validates GSTIN syntax (15-character pan-based structure) and HSN codes against national databases.
*   **RCM Check:** Automatically flags reverse charge transactions based on product classifications.

---

## 26. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 27. Permissions
Access is regulated by the following flags:
*   `view_gst_reports` / `generate_gst_returns`
*   `export_gst_json` / `override_itc_claims`

---

## 28. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 29. Notifications
*   **Filing Reminders:** Alerts tax managers before filing deadlines.
*   **Mismatch Warnings:** Warns users if supplier tax filings differ from internal purchase registers.

---

## 30. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 31. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 32. Future Enhancements
*   **Direct API Filing:** Submits returns directly to the government tax portal.
*   **AI Invoice Reconciler:** Match purchases against monthly tax reports automatically using OCR.

---

## 33. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 34. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
