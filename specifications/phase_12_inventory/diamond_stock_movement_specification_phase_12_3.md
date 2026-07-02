# DIAMO ERP – PHASE 12.3
## DIAMOND INVENTORY MANAGEMENT – STOCK MOVEMENT ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Stock Movement Engine and Inventory Lifecycle Management module of DIAMO ERP. This module functions as the background transaction processor that tracks diamond state transitions, ownership changes, and location movements.

---

## 2. Business Purpose
*   **Complete Traceability:** Captures every event in a diamond's lifecycle to ensure a permanent audit trail.
*   **Operational Context:**
    *   *Stock Master:* Defines the physical properties of a diamond packet.
    *   *Stock Movement:* Logs each transaction event (e.g., Purchase, Challan Issue).
    *   *Inventory History:* Tracks chronological location and ownership updates.

---

## 3. Stock Movement Concept
Every inventory transaction automatically generates a permanent stock movement record, tracking the packet from its creation to its final sale or archive.

---

## 4. Movement Sources
*   **Integrated Transaction Sources:** Purchase, Purchase Return, Sales, Sales Return, Job Books, Challan Books, Manual Adjustments, and Opening Stock entries.

---

## 5. Movement Types
*   **Movement Classifications:** `Stock Creation`, `Purchase`, `Purchase Return`, `Sales`, `Sales Return`, `Job Work Issue`, `Job Work Receive`, `Trading Challan`, `Manual Adjustment`, `Correction`, and `Archive`.

---

## 6. Automatic Status Changes
*   **Status Rules:**
    *   *Purchase Inward:* Moves status to `Available`.
    *   *Sales Invoice:* Moves status to `Sold`.
    *   *Sales Return:* Restores status to `Available`.
    *   *Job Work Issue:* Moves status to `Job Work`.
    *   *Challan Issue:* Moves status to `Hold`.

---

## 7. Owner Movement
*   **Ownership Updates:**
    *   *Purchase Inward:* Transitions ownership to `Company`.
    *   *Job Work Issue:* Registers custody with the selected `Job Worker`.
    *   *Consignment Challan:* Assigns custody to the target `Customer` or `Broker`.

---

## 8. Movement History
*   **Audit Fields:** Movement ID, Date, Stock ID, Source Module, Destination Module, Movement Type, Reference Voucher, Previous/Current Status, Previous/Current Owner, User ID, and Remarks.

---

## 9. Lifecycle Tracking
*   **Visual History:** Displays a chronological vertical timeline of all packet transitions. A single click opens the source transaction voucher.

---

## 10. Real-Time Inventory
*   **Live Aggregations:** Updates vault stock balances, holding values, job work metrics, and dashboard charts immediately upon voucher post or rollback.

---

## 11. Purchase Integration
*   **Posting Action:** Creates the primary `Stock Creation` movement, setting the owner to `Company` and the status to `Available`.

---

## 12. Sales Integration
*   **Posting Action:** Verifies packet availability, reserves the stone, generates a `Sales` movement record, and updates status to `Sold`.

---

## 13. Job Book Integration
*   **Posting Action:** Issuing packets records a `Job Work Issue` movement and updates the custodian. Receiving packets updates weights and returns status to `Available`.

---

## 14. Challan Integration
*   **Posting Action:** Outlining trading challans creates a `Trading Challan` movement, shifting status to `Hold` and documenting consignment custody.

---

## 15. Returns
*   **Posting Action:** Returns restore the original status and update ownership fields based on whether they are sales or purchase returns.

---

## 16. Manual Stock Adjustment
*   **Stock Modifications:** Allows weight corrections, damages, or lost/found entries.
*   *Validation:* Requires a reason code and manager approval, logging the adjustment.

---

## 17. Search
Supports filters for: Stock ID, Certificate ID, Movement ID, Voucher Number, Party Name, and Date.

---

## 18. Filters
Provides filters for: Movement Type, Availability Status, Owner, Company Name, and Date Range.

---

## 19. Sorting
Allows sorting by: Movement Date, Stock ID, Voucher Number, and Movement Type.

---

## 20. Timeline View
*   **Chronological Log:** Shows a vertical layout containing Date/Time, Transaction Type, Status change, Owner change, User name, and reference link.

---

## 21. Validation
*   **Validation Pipeline:** Validates status changes, ensures reference vouchers exist, and blocks double sales or duplicate movement records.

---

## 22. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 23. Report Impact
Generates print templates for:
*   Updates Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 24. Permissions
Access is regulated by the following flags:
*   `view_stock_timeline` / `create_manual_adjustments`
*   `approve_manual_adjustments` / `reverse_stock_movements`

---

## 25. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 26. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 27. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 28. Error Handling
*   Handles broken voucher references, concurrent status conflicts, and database rollback failures with clear error messages.

---

## 29. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 30. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

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
