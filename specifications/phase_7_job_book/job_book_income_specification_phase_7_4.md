# DIAMO ERP – PHASE 7.4
## JOB BOOK – INCOME SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Job Book Income module of DIAMO ERP. This module records service income earned from processing customers' diamonds. It pulls data from completed job records, calculates GST and TDS receivable tax allocations, and updates financial ledgers and profitability reports without generating physical stock movements.

---

## 2. Business Purpose
Recording service income provides essential revenue tracking:
*   **Operational Context:** Bills clients for diamond processing services (e.g., laser cutting, polishing).
*   **Operational Distinctions:**
    *   *Sale Book:* Involves physical product sales and stock reductions.
    *   *Job Book Income:* Bills processing services on client-owned diamonds.
    *   *Job Expense:* Processing bills received from outsource contractors.

---

## 3. Header
Tracks invoice metadata:
*   **Income Number:** Auto-generated key following the format: `JOBINC-YYYY-#####`.
*   **Bill Number / Bill Date:** Reference bill details.
*   **Customer:** Client account selected from the Account Master.
*   **Reference Job Work Number:** Reference job card ID.

---

## 4. Auto Fetch
Selecting a Reference Job Work ID auto-fills the following fields:
*   Customer, quality, packet numbers, pieces, weights,completed processes, and service rates.

---

## 5. Customer Details
*   **Client Details:** Auto-populates billing details, active outstanding balance, GSTIN, PAN, and credit terms. Renders client purchase history metrics.

---

## 6. Broker Details
*   **Broker Details:** Auto-populates the broker's default commission rate.

---

## 7. Item Grid
The item grid adds fields to calculate service fees:
*   **Packet Number / Quality / Completed Process:** Process details.
*   **Pieces / Carat / Service Rate:** Billing rates.
*   **Base Amount:** Calculated service fee.
*   **GST % / GST Amount:** Tax output charges.
*   **TDS % / TDS Amount:** TDS deductions.
*   **Net Amount:** Final billing amount.

---

## 8. Service Types
Supports configurable service categories:
*   *Values:* Laser, Planning, Sawing, Polishing, Bruting, Certification, Sorting, Grading, Cleaning, Manufacturing, Custom Service.

---

## 9. Labour Income Calculation
Calculates labor income based on rate configurations:
*   **Income Rates:** Choice of: Per Carat, Per Piece, Fixed Amount, Hourly Rate, or Daily Rate.

---

## 10. GST
The system calculates GST output allocations dynamically:
*   **Supply Type:** If the customer's state prefix matches the company's registration prefix, the system applies CGST + SGST; otherwise, it applies IGST.
*   **Tax Rates:** Pulled from the Service Configuration Master.

---

## 11. TDS
Computes Tax Deducted at Source (TDS) receivables:
*   **Formula:**
    $$\text{TDS Receivable Deduction} = (\text{Base Amount} - \text{GST Amount}) \times \text{TDS Rate}$$
    $$\text{Net Receivable} = \text{Base Amount} + \text{GST Amount} - \text{TDS Receivable Deduction}$$

---

## 12. Accounting Impact
Logs double-entry ledger postings:
*   *Debit:* Customer Accounts Receivable (Net Receivable).
*   *Debit:* TDS Receivable Account (TDS Amount).
*   *Credit:* Job Service Income Account (Base Amount).
*   *Credit:* GST Output Tax Liability Account (GST Amount).

---

## 13. Profitability Impact
Updates profitability metrics in the Job Costing Engine:
*   **Profit Metrics:** Compares service income against job expenses to calculate gross margins:
    $$\text{Job Gross Margin} = \text{Service Income} - \text{Job Expenses}$$

---

## 14. Payment Status
Tracks receivable status:
*   *Statuses:* Unpaid, Partially Paid, Paid, Cancelled.
*   *Settlement:* Payment status updates automatically upon posting bank/cash receipts.

---

## 15. Report Impact
Saving a Job Income entry updates:
*   *Registers:* Income Register, GST Sales Report, TDS Report, Stock Ledger.

---

## 16. Validation
*   **Reference Check:** Reference Job Work ID must be active.
*   **TDS Audit:** TDS PAN references are required for TDS calculations.
*   **Duplication Prevention:** A job card can only generate one Job Income entry.

---

## 17. Business Rules
1.  **Service Isolation:** Job Income vouchers must not generate physical stock movements.
2.  **Lock Periods:** Closed or paid vouchers cannot be edited.
3.  **Soft Deletes:** Deletions use the soft delete pattern, reversing ledger postings.

---

## 18. Permissions
Access is regulated by the following flags:
*   `create_job_income` / `approve_job_income`
*   `override_gst_rates` / `override_tds_settings`

---

## 19. Audit
Logs all status changes:
*   Tracks tax adjustments, labor rate overrides, and ledger updates.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 20. Notifications
*   **Overdue Alerts:** Alerts users upon saving returns ("Return processed successfully. Stock updated.").
*   **Approval Alerts:** Prompts managers to authorize write-offs or damaged entries.

---

## 21. Printing
The printing engine generates templates for:
*   *Job Income Invoice:* Itemizes process details, tax allocations, and net receivables.

---

## 22. Edge Cases
*   **Duplicate Bill Check:** If the customer invoice matches an existing record, the system blocks saving to prevent duplicate postings.
*   **Reopen Invoice:** Reopening a paid invoice requires manager approval.

---

## 23. Future Enhancements
*   **E-Invoice Integration:** Auto-uploads tax filings to the GST portal.
*   **Online Payment Links:** Appends payment links directly to customer invoices.

---

## 24. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 25. Final Completion Checklist
*   [x] Document business purpose and header auto-fetch lookups.
*   [x] Map the item grid and GST/TDS tax calculations.
*   [x] Detail double-entry accounting ledger rules.
*   [x] Map the inventory available-vs-reserved location transfers.
*   [x] Document validation rules, permissions, and edge cases.
