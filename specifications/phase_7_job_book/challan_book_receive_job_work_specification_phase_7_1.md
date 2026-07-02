# DIAMO ERP – PHASE 7.1
## RECEIVE FROM JOB WORK SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Receive From Job Work module of DIAMO ERP. This module processes finished diamond returns from polishers, laser cutters, or outsource departments. The module reconciles returned carats against original dispatches issued under the Issue for Job Work module (Phase 6.7), updating available stock, logging processing costs, calculating wastage deviations, and recording quality transformations.

---

## 2. Business Purpose
Reconciling processed dispatches provides essential inventory tracking:
*   **Voucher Context:** Used when technicians return processed stones to the warehouse.
*   **Operational Distinctions:**
    *   *Issue for Job Work:* Transfers available stock to reserved Jhanghad/Job Work vaults.
    *   *Receive From Job Work:* Evaluates weight loss, records grade changes, capitalizes labor expenses, and updates available stock.
    *   *Purchase/Sale:* Involves vendor transfers and accounts payable/receivable updates.

---

## 3. Header
The header includes fields to identify the return transaction:
*   **Receive Number:** Auto-generated key following the format: `JOB-REC-YYYY-#####`.
*   **Receive Date:** Transaction entry date.
*   **Job Work Challan Number:** Search field to look up pending Challans.
*   **Job Worker:** Read-only custodian name.
*   **Prepared By / Approved By:** User session references.

---

## 4. Auto Fetch
Selecting a pending Jhanghad Challan auto-populates the following details in the form:
*   Broker ID, department (e.g., Polishing), expected completion date, pending carat weights, and item grid rows.

---

## 5. Item Grid
The item grid adds fields to reconcile processed stones:
*   **Packet Number / Certificate Number:** Item identifiers.
*   **Quality Before / Quality After:** Grade mappings.
*   **Pieces Issued / Pieces Received / Difference:** Piece reconciliation.
*   **Carat Issued / Carat Received / Difference:** Weight reconciliation.
*   **Labour Rate / Labour Amount:** Cost calculations.

---

## 6. Quality Verification
*   **Upgrade/Downgrade Logging:** Documents changes to color, clarity, shape, symmetry, and fluorescence.
*   **Certification Tracking:** If items were graded by a lab (e.g., GIA), the certificate number is saved to the packet profile.

---

## 7. Weight Verification
The system calculates weight differences for returned lots:
*   **Formula:**
    $$\text{Weight Difference} = \text{Carat Issued} - \text{Carat Received}$$
    $$\text{Percentage Difference} = \left( \frac{\text{Weight Difference}}{\text{Carat Issued}} \right) \times 100$$
*   **Tolerance Check:** If the percentage difference exceeds the grade's configured yield tolerance (e.g., 3%), the system prompts for manager approval.

---

## 8. Piece Verification
Reconciles piece count changes (common in sawing or laser splitting):
*   *Splitting:* Splitting one rough stone into multiple polished packets.
*   *Merging:* Merging smaller stones into a single lot.
*   *Variances:* Flags missing or extra pieces for investigation.

---

## 9. Wastage
Tracks process weight loss:
*   **Formula:**
    $$\text{Wastage} = \text{Carat Issued} - \text{Carat Received}$$
    $$\text{Wastage Variance} = \text{Wastage} - \text{Expected Loss}$$
*   **Approval Gate:** Wastage variances exceeding configured thresholds require manager approval to save the return.

---

## 10. Labour
Calculates processing costs:
*   **Labour Calculation:** Options include: Per Carat (input weight), Per Carat (output weight), Per Piece, or Fixed Fee.
*   **Expense Tracking:** Tracks transport fees, insurance, and certification charges.
*   **Formula:**
    $$\text{Total Labour Expense} = \text{Base Labour} + \text{Transit Outlays} + \text{Lab Fees} + \text{Misc Outlays}$$

---

## 11. Inventory Behaviour
*   **Vault Restocking:** Removes returned weights from the Job Work Vault and adds them back to the Available Stock Vault.
*   **Inventory updates:**
    $$\text{Job Work Stock} = \text{Current Job Work Stock} - \text{Returned Weight}$$
    $$\text{Available Stock} = \text{Current Available Stock} + \text{Returned Weight}$$

---

## 12. Partial Receive
*   **Workflow:** Technicians return portions of a lot in splits.
*   **Calculations:** Deducts the returned weight from Reserved Stock. The remaining weight stays in the Job Work Vault under a `Pending` status.

---

## 13. Auto Generation
Saving the return updates related records:
*   *Ledgers:* Logs stock ledger additions and labor expense accounts.
*   *Vouchers:* Recommends generating quality change records and labor invoices.

---

## 14. Report Impact
Saving updates related operational registers:
*   *Registers:* Pending Job Work Register, Yield Analysis Report, Wastage Variance Report, Worker Performance Dashboard.

---

## 15. Validation
*   **Lookup Check:** Job Work Challan Number must be active.
*   **Weight Check:** Received carats cannot exceed issued weights.
*   **Quality Check:** Target Quality IDs must exist in the Quality Master.

---

## 16. Business Rules
1.  **Strict Reference Constraint:** Incoming finished goods must reference the original Job Work Challan.
2.  **No Double-Booking:** Packets already at a job worker cannot be sent to another process.
3.  **Read-Only Weights:** Original issue weights are locked during return processing.

---

## 17. Permissions
Access is regulated by the following flags:
*   `receive_job_work` / `override_wastage_limits`
*   `override_weight_discrepancy` / `generate_job_expense`

---

## 18. Audit
Logs all status changes:
*   Logs changes to lot weights, split configurations, and labor rate variations.
*   Captures before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Overdue Alerts:** Alerts users upon saving returns ("Return processed successfully. Stock updated.").
*   **Approval Alerts:** Prompts managers to authorize write-offs or damaged entries.

---

## 20. Printing
The printing engine generates templates for:
*   *GRN / Receive Slip:* Confirms received carat weights, pieces, and calculated wastage.

---

## 21. Edge Cases
*   **Lost Packet:** Deducts weight from the Job Work Vault, logs the cost to "Stock Loss", and requires manager approval.
*   **Rate Changes:** If actual processing fees deviate from estimated rates, the cost variance is logged in the worker rating system.

---

## 22. Future Enhancements
*   **AI Wastage Analysis:** Analyzes rough diamond shapes to predict polished yield weights.
*   **Worker Performance Score:** Ratings calculated from yield rates and turn-around times.

---

## 23. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Yield Variance Monitoring:** Track cumulative worker yield variances to flag low-performance contractors.

---

## 24. Final Completion Checklist
*   [x] Document business purpose and header lookup validations.
*   [x] Map the quality, weight, and piece verification rules.
*   [x] Detail labor costing methods and wastage calculations.
*   [x] Map the inventory available-vs-reserved location transfers.
*   [x] Document validation rules, permissions, and edge cases.
