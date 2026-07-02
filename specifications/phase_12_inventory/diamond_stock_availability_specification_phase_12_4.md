# DIAMO ERP – PHASE 12.4
## DIAMOND INVENTORY MANAGEMENT – STOCK AVAILABILITY ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Stock Availability Engine and Inventory Status Control module of DIAMO ERP. This module validates whether diamond packets can participate in transaction workflows, managing reservations, memo holds, and status locks.

---

## 2. Business Purpose
*   **Conflict Prevention:** Ensures that a single diamond cannot be simultaneously sold, sent for job work, or put on hold by different users.
*   **Operational Context:**
    *   *Availability:* Tracks current transaction accessibility (e.g., `Available`, `Reserved`).
    *   *Current Owner:* Tracks physical custody of the packet (e.g., Company, Job Worker).
    *   *Status Lock:* Prevents editing locked records without manager approval.

---

## 3. Availability Status
Packets map to a single availability status:
*   `Available` (Vault stock), `Hold` (Consignment/Jhanghad), `Reserved` (Sales Order), `Job Work` (Outsource processing), `Sold` (Invoiced), `Returned`, `Damaged`, `Lost`, `Found`, `In Transit` (Inter-branch movements), `Quality Check` (Lab certifications), or `Archived`.

---

## 4. Status Workflow
Vouchers progress through these statuses:
*   `Created` $\rightarrow$ `Purchased` $\rightarrow$ `Available` $\rightarrow$ `Reserved` $\rightarrow$ `Hold` $\rightarrow$ `Job Work` $\rightarrow$ `Sold` $\rightarrow$ `Returned` $\rightarrow$ `Archived`.

---

## 5. Automatic Status Changes
Availability updates automatically when transactions are posted or reversed:
*   *Sales Invoices:* Change status to `Sold`.
*   *Job Work Vouchers:* Change status to `Job Work`.
*   *Jhanghad Challans:* Change status to `Hold`.
*   *Returns:* Restore status to `Available`.

---

## 6. Reservation Engine
*   **Allocation Triggers:** Sales Orders reserve packets, assigning them to a target Customer/Broker.
*   **Expiry Control:** Reservations hold a configuration date limit; once reached, the reservation expires, restoring the status to `Available`.

---

## 7. Hold Management
*   **Consignment Holds:** Jhanghad issue notes put packets `On Hold`, recording the date, reason, customer ID, and hold expiry. Releasing or extending holds requires manager approval.

---

## 8. Job Work Status
*   **Outsource Tracking:** Issuing packets changes status to `Job Work`, linking to the Job Worker ID, issue date, and expected return date. Pending days are tracked on the dashboard.

---

## 9. Sales Status
*   **Posting Interlock:** Before posting a Sales Invoice, the engine verifies the packet status.
*   *Constraint:* If status is not `Available` or `Reserved` (for the specific order), the sale is blocked. Successful invoices set the status to `Sold`.

---

## 10. Purchase Return Status
*   **Posting Action:** Returning stock to a supplier changes status to `Returned`, linking to the source Purchase Return voucher ID.

---

## 11. Sales Return Status
*   **Posting Action:** Accepting returns from customers restores the status to `Available`, making the packet accessible for subsequent sales.

---

## 12. Manual Status Change
*   **Adjustments:** Statuses like `Damaged`, `Lost`, `Found`, or `Archived` can only be set via manual adjustment vouchers, requiring reason codes and manager approvals.

---

## 13. Availability Check Engine
*   **Pre-Flight Validations:** Prior to opening or updating any transaction screen, the system runs an availability check on the selected Stock IDs. If a stone is locked (`Sold`/`Job Work`), the screen disables input actions for that packet.

---

## 14. Real-Time Availability
*   **Status Summaries:** The UI displays live stock statuses (Available, Reserved, Hold, Sold) across search grids, purchase receipts, and sales screens.

---

## 15. Conflict Detection
*   **Block Warnings:** Flags and prevents double-bookings, double-reservations, or duplicate job-work issues, returning user-friendly warnings.

---

## 16. Search
Supports filters for: Stock ID, Certificate ID, Shape, Weight, Availability Status, Owner, and Date.

---

## 17. Filters
Provides filters for: Available, Reserved, Hold, Sold, Returned, Job Work, Damaged, Category, and Weight Range.

---

## 18. Sorting
Allows sorting by: Availability, Stock ID, Purchase Date, Weight, and Reservation Date.

---

## 19. Dashboard
*   **KPI Metrics:** Renders available count, reserved count, hold count, job work count, sold count, and overall inventory utilization %.

---

## 20. Validation
*   **Validation Pipeline:** Validates status transitions, ensuring reference vouchers exist, and blocks double sales or duplicate movement records.

---

## 21. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 22. Report Impact
Automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 23. Permissions
Access is regulated by the following flags:
*   `view_stock_availability` / `reserve_stock_units`
*   `release_consignment_hold` / `adjust_stock_weights`

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
*   Handles broken voucher references, concurrent status conflicts, and database rollback failures with clear error messages.

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
