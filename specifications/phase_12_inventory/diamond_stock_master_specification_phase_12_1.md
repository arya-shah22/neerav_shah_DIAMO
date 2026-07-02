# DIAMO ERP – PHASE 12.1
## DIAMOND INVENTORY MANAGEMENT – STOCK MASTER ARCHITECTURE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Diamond Stock Master Architecture and Workflow module of DIAMO ERP. This module acts as the single source of truth for all diamond packets in the system, eliminating manual re-entry and ensuring packet-level tracking across Purchases, Sales, Job Books, and Challans.

---

## 2. Business Purpose
*   **Data Consistency:** Replaces redundant manual inputs with a central database record.
*   **Operational Context:**
    *   *Quality Master:* Standardizes classification grades (e.g., Color VVS2).
    *   *Stock Master:* Defines unique diamond units, mapping physical parameters to unique serial IDs.
    *   *Inventory:* Tracks active stocks across branch locations.

---

## 3. Stock Master Concept
Every Stock Master record represents one unique physical diamond unit. The record holds permanent parameter values (Shape, Weight, Color, Certifications) and updates dynamically to reflect transaction statuses, location movements, and valuation changes.

---

## 4. Stock Master Fields
*   **Identification:** Stock ID Number, Category (Certified/Non-Certified), Certificate Type, Registration Date.
*   **Physical Details:** Shape, Carat Weight, Count (Pieces), Dimensions (Length, Width, Depth).
*   **Quality Details:** Color, Purity (Clarity), Cut, Polish, Symmetry.
*   **Measurements:** Total Depth %, Table %.
*   **Certification:** Certificate Number (e.g., IGI, GIA, HRD).
*   **Media:** Photo Links, Video Links, and Certificate PDF attachments.

---

## 5. Business Workflow
1.  *Stock Creation:* Registered in database during Purchase Inward or opening stock migration.
2.  *Outsource Job Work:* Packet is issued to job workers, changing status to `Job Work`.
3.  *Inventory Updates:* Weight changes or class updates are recorded on job receipt.
4.  *Consignment Hold:* Issued on customer Jhanghad challans, changing status to `Hold`.
5.  *Sale:* Final sales invoices lock the packet, changing status to `Sold`.

---

## 6. Module Integration
*   **Purchase Module:** Users can select pre-registered memo packet IDs or register new stock details on purchase invoices.
*   **Sales Module:** Selecting a Stock ID on the Sales Invoice auto-fills all parameters (Carats, Shape, Quality, IGI details), verifying availability.
*   **Job Book:** Issuing diamonds updates their status to `Job Work`. Receiving diamonds updates weight parameters and resets status to `Available`.
*   **Challan Book:** Issuing consignment stock changes status to `Hold`. Unsold returns restore status to `Available`.
*   **Returns:** Sales Returns restore packet status to `Available` in the central vault. Purchase Returns mark packets as `Returned`.

---

## 7. Stock Lifecycle
Vouchers progress through these statuses:
*   `Created` $\rightarrow$ `Purchased` $\rightarrow$ `Available` $\rightarrow$ `Hold` $\rightarrow$ `Job Work` $\rightarrow$ `Sold` $\rightarrow$ `Returned` $\rightarrow$ `Archived`.

---

## 8. Stock ID Strategy
*   *Format A: STK-YYYY-XXXXXX* (Year-prefixed sequential ID).
    *   *Advantage:* Identifies age immediately.
    *   *Disadvantage:* Numbering sequences reset yearly.
*   *Format B: DM-XXXXXXX* (Unified alphanumeric sequential ID).
    *   *Advantage:* Simpler barcode generations.
    *   *Disadvantage:* No quick visual age indicators.
*   *System Recommendation:* Enforce **Format A** to assist age-based inventory write-downs.

---

## 9. Availability Status
Packets map to a single status code:
*   `Available` (Vault stock), `Hold` (Consignment), `Job Work` (Outsourced), `Sold` (Invoiced), `Returned`, `Damaged`, or `Archived`.

---

## 10. Owner / Source
Identifies asset custody:
*   **Company Stock:** Fully-owned physical inventory.
*   **Supplier Memo:** Third-party consignment stock held for approval.
*   **Customer Memo:** Customer-owned stones received for job-work processing.

---

## 11. Validation
*   **Integrity Rules:** Blocks saving duplicate Stock IDs or duplicate Certificate Numbers.
*   **Dimension Bounds:** Carat weights and millimeter dimensions must be positive values.

---

## 12. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 13. Search
Supports filters for: Stock ID, Certificate ID, Shape, Carat Weight, Color, and Clarity.

---

## 14. Filters
Provides filters for: Category (Certified/Non-Certified), Availability, Vault Location, and Date.

---

## 15. Report Impact
Saving or updating stock details automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 16. Permissions
Access is regulated by the following flags:
*   `create_stock_master` / `edit_stock_details`
*   `release_consignment_hold` / `adjust_stock_weights`

---

## 17. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 18. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 19. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 20. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 21. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 22. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 23. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
