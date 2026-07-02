# DIAMO ERP – PHASE 12.10
## DIAMOND INVENTORY MANAGEMENT – INVENTORY AUDIT & VERIFICATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Inventory Audit, Physical Stock Verification, Reconciliation, Security, and Finalization module of DIAMO ERP. This system structures physical packet counting cycles, compares counts against system records, enforces adjustment approval hierarchies, and manages year-end stock freezes.

---

## 2. Business Purpose
*   **Loss Prevention:** Establishes regular internal audit cycles to detect missing packets, weight variances, and location mismatches.
*   **Compliance Verification:** Generates certified year-end inventory valuation sheets that reconcile with the general ledger.

---

## 3. Physical Stock Verification
*   **Verification Columns:** Stock ID, IGI/GIA Certificate Number, Shape, Carat Weight, System Quantity (Pcs/Weight), Physical Quantity, Discrepancy, Verifier ID, Date/Time, and Remarks.

---

## 4. Verification Workflow
The verification pipeline operates as follows:
1.  **Count Initialization:** Supervisor starts an audit batch for a location or category.
2.  **Physical Entry:** Verifiers scan barcodes or enter packet IDs, recording physical weights.
3.  **Difference Logging:** The system compares physical counts with database stock records.
4.  **Approval Review:** Managers review and approve logged adjustments.
5.  **Audit Trail Entry:** Discrepancy details are written to the database logs.
6.  **Finalization:** The audit batch is finalized, updating the live inventory database.

---

## 5. Stock Reconciliation
*   **Math Models:**
    *   $\text{Discrepancy Quantity} = \text{Physical Quantity} - \text{System Quantity}$
    *   $\text{Discrepancy Weight} = \text{Physical Weight} - \text{System Weight}$
*   Identifies missing packets, extra unrecorded packets, carat weight variances, status discrepancies, and certificate mismatches.

---

## 6. Discrepancy Management
*   **Discrepancy Classes:** Missing Packet, Duplicate Packet, Location Mismatch, Status Mismatch, Weight Variance, and Certificate Mismatch. Renders alerts on matching panels.

---

## 7. Stock Adjustment
*   **Adjustment Actions:** Write-off (lost/damaged), write-in (found), weight correction, and status correction. Every adjustment requires a reason code and manager authorization.

---

## 8. Approval Workflow
*   **Multi-Tier Approval Hierarchy:**
    *   *Carat Weight Difference $\le$ 0.05 ct:* Supervisor Approval.
    *   *Carat Weight Difference $>$ 0.05 ct or Missing Packet:* Manager Approval $\rightarrow$ Auditor Verification.

---

## 9. Security Controls
*   **System Locks:**
    *   *Stock Freeze:* Stops transactions for a category/location during audits.
    *   *Period Lock:* Prevents back-dated entries in audited periods.
    *   *Approval Lock:* Restricts adjustment actions to authorized roles.

---

## 10. Year-End Inventory Closing
*   **Year-End Closing Workflow:**
    1.  Initiate a global stock freeze across all offices.
    2.  Perform a physical stock count and resolve discrepancies.
    3.  Approve all outstanding adjustments and post write-off entries.
    4.  Generate closing inventory valuation reports.
    5.  Roll over balances to create opening records for the new financial year.
    6.  Apply a read-only lock to the closed financial year.

---

## 11. Inventory Certification
Generates official closing documents:
*   *Verification Certificates:* Signed statements confirming audited values.
*   *Adjustment Sheets:* Logs summarizing write-offs and corrections.

---

## 12. Audit Reports
Provides lists for: Verification History, Outstanding Discrepancies, Approved Adjustments, User Action Logs, and Lock Overrides.

---

## 13. Search
Supports filters for: Verification Batch, Stock ID, Certificate Number, Verifier ID, and Date.

---

## 14. Filters
Provides filters for: Status (Pending/Approved/Rejected), Variance Found (Yes/No), and Location.

---

## 15. Sorting
Allows sorting by: Verification Date, Stock ID, Carat Variance, and Adjustment Amount.

---

## 16. Grouping
Supports grouping by: Batch ID, Location, Verifier, and Discrepancy Type.

---

## 17. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 18. PDF Engine
*   **Export Properties:** Renders encrypted, high-res PDF pages with automatic naming rules.

---

## 19. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 20. Report Impact
Automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 21. Validation
*   Validates audit entries, checking for duplicate packet scans, negative stock levels, and invalid verification dates.

---

## 22. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 23. Permissions
Access is regulated by the following flags:
*   `initiate_inventory_audit` / `perform_physical_verification`
*   `approve_stock_adjustments` / `apply_inventory_locks`

---

## 24. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 25. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 26. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 27. Error Handling
*   Handles duplicate verifications, database lock conflicts, and rollback failures with clear error messages.

---

## 28. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 29. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 30. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 31. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
