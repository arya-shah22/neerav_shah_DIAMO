# DIAMO ERP – PHASE 8.4
## JOURNAL VOUCHER (JV BOOK) – GST, TDS & RCM ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the GST, TDS, and Reverse Charge Mechanism (RCM) Engine of DIAMO ERP. This engine manages tax calculations, validations, and double-entry postings for the Journal Voucher module, ensuring compliance with tax codes while minimizing manual entries.

---

## 2. Business Purpose
Automating tax entries ensures regulatory compliance:
*   **Operational Context:** Minimizes manual entry errors for complex tax adjustments.
*   **Tax Categories:**
    *   *GST:* CGST + SGST (Intrastate) vs. IGST (Interstate) on transactions.
    *   *TDS:* Tax deducted at source based on payment thresholds.
    *   *RCM:* Reverses the tax liability from supplier to recipient.

---

## 3. GST Engine
Calculates GST output allocations:
*   **Supported Types:** CGST, SGST, IGST, Exempt, Nil Rated, Non-GST, Reverse Charge, Inclusive, and Exclusive.

---

## 4. GST Auto Detection
*   **Decision Logic:** If the vendor's state prefix matches the company's registration prefix, the system applies CGST + SGST; otherwise, it applies IGST. Exempt and composition designations are pulled from the Account Master.

---

## 5. GST Calculation
Computes tax values based on configuration rules:
*   **Exclusive GST:**
    $$\text{Taxable Value} = \text{Amount}$$
    $$\text{GST Amount} = \text{Taxable Value} \times \text{GST Rate}$$
    $$\text{Total Amount} = \text{Taxable Value} + \text{GST Amount}$$
*   **Inclusive GST:**
    $$\text{Taxable Value} = \frac{\text{Amount}}{1 + \text{GST Rate}}$$
    $$\text{GST Amount} = \text{Amount} - \text{Taxable Value}$$

---

## 6. GST Validation
*   **Tax Code Validation:** Validates the state code prefix of the GSTIN against the customer's state details.
*   **Override Check:** Manual overrides require authorization flags.

---

## 7. GST Ledger Posting
Generates ledger entries:
*   *CGST Input / Output:* Dedicated ledger postings.
*   *SGST Input / Output:* Dedicated ledger postings.
*   *IGST Input / Output:* Dedicated ledger postings.

---

## 8. TDS Engine
Computes TDS deductions:
*   **Supported Sections:** 194C (Contractors), 194H (Commission), 194J (Professional fees), 194I (Rent), 194A (Interest), 194Q (Goods Purchase).

---

## 9. TDS Auto Detection
*   **Deduction Rules:** TDS applicability is determined by matching the Account Master's configuration with regulatory thresholds.

---

## 10. TDS Calculation
*   **Formula:**
    $$\text{TDS Base} = \text{Amount}$$
    $$\text{TDS Deduction} = \text{TDS Base} \times \text{TDS Rate}$$
    $$\text{Net Amount} = \text{Amount} - \text{TDS Deduction}$$

---

## 11. TDS Validation
*   **PAN Verification:** Checks PAN details to prevent higher default deduction rates (e.g., 20%).
*   **Duplicate Check:** Enforces checks to prevent duplicate deductions on a single invoice.

---

## 12. TDS Ledger Posting
Generates ledger postings:
*   *TDS Receivable / Payable:* Dedicated ledger postings.
*   *Vendor Ledger / Customer Ledger:* Net posting adjustments.

---

## 13. RCM Engine
Supports Reverse Charge Mechanism (RCM):
*   **Supported Types:** RCM Applicable, RCM Not Applicable.

---

## 14. RCM Auto Detection
*   **RCM Determination:** RCM is applied if the transaction matches RCM-applicable SAC codes or is marked as RCM-applicable in the Account Master.

---

## 15. RCM Calculation
*   **RCM Formula:**
    $$\text{Liability Amount} = \text{Taxable Value} \times \text{GST Rate}$$
    RCM postings generate matching input tax credit and output tax liability entries.

---

## 16. RCM Validation
*   **RCM Eligibility Check:** Verifies RCM rates against active GST schemas.

---

## 17. Auto Calculations
Calculates transaction totals in real-time:
*   **Formula:**
    $$\text{Voucher Difference} = \text{Debit Total} - \text{Credit Total} = 0.00$$

---

## 18. Auto Fetch
Selecting an account automatically fetches:
*   GSTIN, PAN, State prefix, TDS Section details, TDS Rates, outstanding balances, and RCM configurations.

---

## 19. Posting Logic
Saving a voucher executes the following updates in a single transaction scope:
1.  Validates that debits equal credits.
2.  Posts updates to the General Ledger.
3.  Recalculates balances for the Trial Balance, Profit & Loss, and Balance Sheet.
4.  Logs the action in the system audit trail.

---

## 20. Report Impact
Saving a JV updates:
*   *Reports:* GST Register, Trial Balance, Profit & Loss, Balance Sheet, TDS Register, RCM Register.

---

## 21. Search
Supports filters for: GSTIN, PAN, TDS Section, Voucher Number, and Date.

---

## 22. Filters
Provides filters for: CGST, SGST, IGST, RCM, TDS, and Financial Year.

---

## 23. Validation
*   **Tax Rate Validation:** Blocks negative tax values and duplicate tax postings.
*   **Period Lock:** Postings must fall within the active financial year and after the lock date.

---

## 24. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Posted JVs:** Corrections must use the Reversal Voucher workflow.
3.  **Soft Deletes:** Deletions use the soft delete pattern, reversing ledger postings.

---

## 25. Permissions
Access is regulated by the following flags:
*   `override_gst_rates` / `override_tds_settings`
*   `approve_tax_override` / `reverse_tax_postings`

---

## 26. Audit
Logs all status changes:
*   Tracks tax rate overrides, PAN updates, and RCM entries.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 27. Notifications
*   **Validation Alerts:** Alerts users if GST or PAN validations fail.
*   **Approval Alerts:** Prompts managers when a tax rate override requires approval.

---

## 28. Printing
Generates print templates for:
*   *Tax Summary:* Itemizes taxable values, CGST/SGST/IGST, TDS deductions, and RCM liabilities.

---

## 29. Edge Cases
*   **Tax Schema Changes:** Rate changes only apply to vouchers posted after the active date.
*   **Rollback Protection:** System timeouts during posting trigger database rollbacks to prevent ledger imbalances.

---

## 30. Future Enhancements
*   **GSTR-2B Auto Recon:** Reconciles internal purchase entries against GSTR-2B portal data automatically.
*   **TDS E-Filing Integration:** Formats and exports TDS quarterly returns.

---

## 31. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 32. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
