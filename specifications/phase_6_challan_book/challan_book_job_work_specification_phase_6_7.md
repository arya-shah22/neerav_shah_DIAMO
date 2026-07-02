# DIAMO ERP – PHASE 6.7
## CHALLAN BOOK – ISSUE FOR JOB WORK SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Issue for Job Work module of the Challan Book in DIAMO ERP. This module manages dispatches of diamonds to polishers, markers, planning departments, or outsource contractors. It inherits layout styles and location tracking from the Challan Book while establishing job-work-specific workflows for process types, labour costing, wastage tracking, and quality transformation logs.

---

## 2. Business Purpose
Job Work dispatches manage cutting and polishing operations without transferring ownership:
*   **Voucher Context:** Used when diamond lots are sent to external contractors or internal units for processing (e.g., planning, bruting, faceting).
*   **Operational Distinctions:**
    *   *Sales/Purchases:* Involves financial transactions and ownership transfers.
    *   *Jhanghad Consignments:* Goods sent for inspection by potential buyers.
    *   *Job Work:* Goods issued to technicians for refining, processing, or grading, remaining company assets throughout the lifecycle.

---

## 3. Job Worker
Selecting a job worker from the Account Master auto-populates:
*   Supplier Name, GSTIN, PAN, and contact information.
*   **Performance Metrics Card:** Displays active jobs count, total carats currently held, average job completion time (days), and historical loss rates.

---

## 4. Job Types
The system supports configurable process categories:
*   *Standard Processes:* Planning, Sawing, Laser cutting, Bruting, Polishing, Boiling/Cleaning, Sorting/Grading, Lab Certification, Repair/Repolish.

---

## 5. Item Grid
The item grid adds fields to track work instructions:
*   **Packet Number:** Unique barcode reference.
*   **Process Required:** Dropdown mapping the target process (e.g., Polishing).
*   **Expected Output Weight:** Target weight post-processing.
*   **Estimated Loss (Carats):** Anticipated process wastage weight.
*   **Estimated Labour:** Projected processing fees.

---

## 6. Process Details
Tracks granular processing parameters:
*   *Source Quality:* Grade before processing (e.g., Rough Lot A).
*   *Target Quality:* Intended grade post-processing (e.g., Polished VS2).
*   *Expected Pieces:* Quantity count changes (common in splitting/sawing).

---

## 7. Labour Details
Processes labor calculations:
*   **Labour Type:** Choice of: Per Carat (input weight), Per Carat (output weight), Per Piece, or Fixed Fee.
*   **Calculations:** Computes estimated labor fees in real-time.
*   **Actual Costing:** Captured during return steps to log variance details.

---

## 8. Inventory Behaviour
*   **Vault Tracking:** Dispatches transfer carats from the primary warehouse vault to the "Job Work Outward Vault" (retaining ownership on the balance sheet).
*   **Carat Allocation updates:**
    $$\text{Job Work Stock} = \text{Current Job Work Stock} + \text{Inward Weight}$$
    $$\text{Available Stock} = \text{Current Available Stock} - \text{Inward Weight}$$

---

## 9. Receiving Workflow
Supports multiple return configurations:
*   **Full Receipt:** Processes the return of the entire lot weight.
*   **Partial Receipt:** Processes returns in splits, keeping the remaining weight pending.
*   **Split/Merge Packets:** Splitting a rough lot into multiple polished stones or merging smaller stones into a single parcel.

---

## 10. Quality Transformation
*   **Transformation Mapping:** Documents the transition from Rough Quality (Source) to Polished Quality (Target).
*   **Stock Adjustment:** Deducts source carats from the Job Work Vault and restocks target carats to the available warehouse vault.

---

## 11. Wastage Tracking
Tracks weight loss from processing:
*   **Formula:**
    $$\text{Actual Weight Loss} = \text{Issued Weight} - \text{Returned Finished Weight} - \text{Returned Scrap Weight}$$
    $$\text{Wastage Variance} = \text{Actual Weight Loss} - \text{Expected Loss}$$
*   **Control Rules:** If the wastage variance exceeds the configured threshold (e.g., 2% deviation), saving requires manager approval.

---

## 12. Job Status
Vouchers progress through these statuses:
*   `Draft`: Saved entry.
*   `Issued`: Dispatched to worker.
*   `In Process`: Work started.
*   `Partial Receipt`: Portions returned.
*   `Completed`: All weight returned or accounted for.
*   `Overdue`: Expected completion date exceeded.

---

## 13. Job Costing
Computes the total cost basis for the processed diamonds:
*   **Formula:**
    $$\text{Total Processing Cost} = \text{Actual Labour} + \text{Transit Fees} + \text{Lab Fees} + \text{Miscellaneous Outlays}$$
*   **Cost Capitalization:** Appends the processing cost to the polished diamond's cost basis.

---

## 14. Report Impact
Saving a Job Work entry updates:
*   *Registers:* Job Work Register, Pending Job Work Report, Quality-wise Yield Report.
*   *Ledgers:* Worker Performance Logs, Stock Ledger.

---

## 15. Validation
*   **Custodian Verification:** The worker must be active in the Account Master.
*   **Weight Constraints:** Weight must be greater than `0.000` carats.
*   **Return Date Check:** Expected Completion Date must be equal to or after the Issue Date.

---

## 16. Business Rules
1.  **Strict Reference Constraint:** Incoming finished goods must reference the original Job Work Challan.
2.  **No Double-Booking:** Packets already at a job worker cannot be sent to another process.
3.  **Read-Only Weights:** Original issue weights are locked during return processing.

---

## 17. Permissions
Access is regulated by the following flags:
*   `issue_job_work` / `receive_job_work`
*   `approve_wastage_overrides` / `override_labour_rates`

---

## 18. Audit
Logs all process updates:
*   Logs changes to lot weights, split configurations, and labor rate variations.
*   Captures before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Edge Cases
*   **Weight Discrepancies:** If returned weights deviate from estimates, the variance is logged to the worker's performance card.
*   **Lost Packet:** Deducts weight from the Job Work Vault, logs the cost to "Stock Loss", and requires manager approval.

---

## 20. Printing
The printing engine generates templates for:
*   *Job Card:* Technical instructions for the polisher (HSN, target finish, expected weight).
*   *Receipt Slip:* Printed slip confirming receipt of finished stones.

---

## 21. Future Enhancements
*   **AI Yield Prediction:** Analyzes rough diamond shapes to predict polished yield weights.
*   **Worker Mobile App:** Allows polishers to confirm receipt and report completions.

---

## 22. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Yield Variance Monitoring:** Track cumulative worker yield variances to flag low-performance contractors.

---

## 23. Final Completion Checklist
*   [x] Document business purpose and differences for the Job Work module.
*   [x] Map the item grid and process details fields.
*   [x] Detail labor calculation types and costing formulas.
*   [x] Map the inventory available-vs-reserved location transfers.
*   [x] Document validation rules, permissions, and edge cases.
