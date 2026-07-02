# DIAMO ERP – PHASE 7.3
## JOB BOOK – EXPENSE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Job Book Expense module of DIAMO ERP. This module records labor and processing costs billed by internal or external job workers. The engine pulls data from Receive From Job Work vouchers (Phase 7.1), calculates GST and TDS tax allocations, updates financial ledgers, and capitalizes processing costs into the diamond lot cost basis (Phase 7.2).

---

## 2. Business Purpose
Recording processing expenses ensures accurate accounting and inventory valuation:
*   **Operational Context:** Capitalizes technician bills to update the cost basis of polished diamonds.
*   **Operational Distinctions:**
    *   *Purchase Book:* Lot acquisition transactions.
    *   *Job Expense:* Inward processing service bills.
    *   *General Expense:* Indirect business overheads (e.g., rent, utility).

---

## 3. Header
Tracks voucher metadata:
*   **Expense Number:** Auto-generated key following the format: `JOBEXP-YYYY-#####`.
*   **Bill Number / Bill Date:** Vendor invoice references.
*   **Job Worker:** selected vendor account.
*   **Reference Receive Number:** Lookup linking the Jhanghad return voucher.

---

## 4. Auto Fetch
Selecting a Receive From Job Work ID auto-fills the following fields:
*   Job Worker, Quality, Packet Numbers, pieces, weights, labor rates, and estimated fees.

---

## 5. Job Worker Details
*   **Supplier Details:** Selecting a supplier account auto-populates billing details, active outstanding balance, GSTIN, PAN, and payment terms. Renders a performance card displaying historical yield rates.

---

## 6. Item Grid
The item grid adds fields to calculate processing costs:
*   **Packet Number / Quality / Process:** Line details.
*   **Pieces / Carat / Labour Rate:** Cost inputs.
*   **Base Amount:** Calculated processing cost.
*   **GST % / GST Amount:** Tax inputs.
*   **TDS % / TDS Amount:** TDS deductions.
*   **Net Amount:** Final payable amount for the line.

---

## 7. Expense Types
Supports configurable service types:
*   *Values:* Sawing Charges, Laser Charges, Polishing Charges, Certification Charges, Transport Charges, Packing Charges, Miscellaneous Charges.

---

## 8. Labour Calculation
Calculates labor fees based on rate configurations:
*   **Labor Types:** Choice of: Per Carat (input weight), Per Carat (output weight), Per Piece, or Fixed Fee.

---

## 9. GST
The system calculates GST allocations dynamically:
*   **Supply Type:** If the job worker's state prefix matches the company's registration prefix, the system applies CGST + SGST; otherwise, it applies IGST.
*   **Tax Rates:** Pulled from the Quality Master or configuration settings.

---

## 10. TDS
Computes Tax Deducted at Source (TDS) for services:
*   **Threshold Audit:** If cumulative contractor billings exceed Section 194C thresholds (e.g., ₹30,000 single bill or ₹1,00,000 annual aggregate), the system applies TDS.
*   **Formula:**
    $$\text{TDS Base} = \text{Base Amount} - \text{GST Amount}$$
    $$\text{TDS Deduction} = \text{TDS Base} \times \text{TDS Rate}$$
    $$\text{Net Payable} = \text{Base Amount} + \text{GST Amount} - \text{TDS Deduction}$$

---

## 11. Accounting Impact
Logs double-entry ledger postings:
*   *Debit:* Job Processing Expense Account (Base Amount).
*   *Debit:* GST Input Tax Credit Account (GST Amount).
*   *Credit:* Job Worker Accounts Payable (Net Payable).
*   *Credit:* TDS Payable Account (TDS Amount).

---

## 12. Costing Impact
Updates the diamond cost basis in the Costing Engine:
*   **Cost Capitalization:** Appends processing costs to the lot's cost basis, updating the inventory asset value:
    $$\text{New Cost Basis} = \text{Raw Cost} + \text{Base Amount} + \text{Other Expenses}$$

---

## 13. Payment Status
Tracks payable status:
*   *Statuses:* Unpaid, Partially Paid, Paid, Cancelled.
*   *Settlement:* Payment status updates automatically upon posting payment entries.

---

## 14. Report Impact
Saving a Job Expense entry updates:
*   *Registers:* Expense Register, GST Purchase Register, TDS Register, Stock Ledger.

---

## 15. Validation
*   **Reference Check:** Reference Receive Number must be active.
*   **TDS Audit:** TDS PAN references are required for TDS calculations.
*   **Duplication Prevention:** A Jhanghad return voucher can only generate one Job Expense entry.

---

## 16. Business Rules
1.  **GST Compliance:** GST rates must follow HSN and state prefix rules.
2.  **Lock Periods:** Closed or paid vouchers cannot be edited.
3.  **Soft Deletes:** Deletions use the soft delete pattern, reversing ledger postings.

---

## 17. Permissions
Access is regulated by the following flags:
*   `create_job_expense` / `approve_job_expense`
*   `override_gst_rates` / `override_tds_settings`

---

## 18. Audit
Logs all status changes:
*   Tracks tax adjustments, labor rate overrides, and ledger updates.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Overdue Alerts:** Alerts users upon saving returns ("Return processed successfully. Stock updated.").
*   **Approval Alerts:** Prompts managers to authorize write-offs or damaged entries.

---

## 20. Printing
The printing engine generates templates for:
*   *Expense Voucher:* Itemizes process details, tax allocations, and net payables.

---

## 21. Edge Cases
*   **Duplicate Bill Check:** If the supplier invoice matches an existing record, the system blocks saving to prevent duplicate postings.
*   **Reopen Expense:** Reopening a paid expense requires manager approval.

---

## 22. Future Enhancements
*   **OCR Bill Upload:** Scan supplier PDF bills to extract items and rates automatically.
*   **E-Invoice Integration:** Auto-uploads tax filings to the GST portal.

---

## 23. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 24. Final Completion Checklist
*   [x] Document business purpose and header auto-fetch lookups.
*   [x] Map the item grid and GST/TDS tax calculations.
*   [x] Detail double-entry accounting ledger rules.
*   [x] Map the inventory available-vs-reserved location transfers.
*   [x] Document validation rules, permissions, and edge cases.
