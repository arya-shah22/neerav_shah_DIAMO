# DIAMO ERP – PHASE 12.8
## DIAMOND INVENTORY MANAGEMENT – STOCK LIFECYCLE & TRACEABILITY SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Stock Lifecycle, Inventory History, Traceability, and Packet Journey Engine of DIAMO ERP. This module aggregates and displays the historical record of each diamond, tracing movements, ownership revisions, and certificate audits from creation to archival.

---

## 2. Business Purpose
*   **Packet Provenance:** Provides complete visibility into the journey of a diamond, detailing which job workers processed it, which brokers handled it, and its historical cost valuation changes.
*   **Operational Context:**
    *   *Stock Movement Engine:* Focuses on updating balances and running transactional logs.
    *   *Lifecycle & Traceability:* Formulates a chronological history sheet of all operations on a specific packet.

---

## 3. Stock Lifecycle
Maintains a chronological record of packet movements:
*   `Created` $\rightarrow$ `Purchased` $\rightarrow$ `Available` $\rightarrow$ `Reserved` $\rightarrow$ `Hold` $\rightarrow$ `Job Work` $\rightarrow$ `Sold` $\rightarrow$ `Returned` $\rightarrow$ `Archived`.

---

## 4. Lifecycle Events
Triggers automated entries upon:
*   Stock Registry creation, Purchase receipts, Purchase Returns, Sales dispatches, Sales Returns, Job issues, Job receipts, Consignment Challans, Owner modifications, Media replacements, and Weight/Value adjustments.

---

## 5. Timeline View
*   **Visual Log:** Renders a vertical layout displaying Date/Time, Source Module, Action, Voucher Number, Party Name, Status, Owner, and User ID.

---

## 6. Complete History
*   **History Logs:** Outlines detailed panels for Purchase, Sales, Returns, Job Works, Challans, Status changes, Ownership changes, Media versions, and Audit logs.

---

## 7. Purchase History
*   **Metadata:** Purchase Date, Supplier Name, Invoice Number, Purchase Rate, Net Amount, Broker Name, User, and Remarks.

---

## 8. Sales History
*   **Metadata:** Sales Date, Customer Name, Invoice Number, Sales Rate, Net Amount, Profit Margin, Broker Name, User, and Remarks.

---

## 9. Job Work History
*   **Metadata:** Job Worker Name, Issue Date, Receive Date, Labor Charges, Status, and Overdue Days.

---

## 10. Challan History
*   **Metadata:** Challan Type (Trading, Outsource, Order), Issue Date, Return Date, Current Status, and Remarks.

---

## 11. Owner History
*   **Metadata:** Previous Owner, Current Owner, Date/Time, User ID, and Reason code.

---

## 12. Availability History
*   **Metadata:** Previous Status, Current Status, Date/Time, User ID, and Reference Voucher Link.

---

## 13. Media History
*   **Metadata:** Photo Added, Photo Replaced, Video Added, Video Replaced, Certificate Uploaded, Certificate Replaced, Version ID, Date, and User.

---

## 14. Certificate History
*   **Metadata:** Certificate Type (IGI, GIA), Certificate Number, Verification Status, Issue Date, and Replacement Reason code.

---

## 15. Adjustment History
*   **Metadata:** Adjustment Type (Weight Correction, Loss, Damaged, Found), Reason, Approved By, Date, and Time.

---

## 16. Audit History
*   **System Action Logger:** Logs all dashboard views, report prints, file exports, and status overrides, detailing user ID and workstation MAC address.

---

## 17. Graphical Lifecycle
*   **Flow Chart:** Displays a workflow diagram of the packet's lifecycle. Users can click any node to open the corresponding voucher.

---

## 18. Timeline Filters
Provides filters for: Purchases, Sales, Returns, Job Works, Challans, Status changes, and Owner changes.

---

## 19. Search
Supports filters for: Stock ID, Certificate ID, Voucher Number, Supplier, Customer, and Date.

---

## 20. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 21. Print
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 22. Validation
*   Validates history logs against vouchers, flagging orphan records, broken links, or missing transaction steps.

---

## 23. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 24. Report Impact
Automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 25. Permissions
Access is regulated by the following flags:
*   `view_stock_timeline` / `view_cost_pricing`
*   `export_stock_history` / `approve_adjustments`

---

## 26. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 27. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 28. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 29. Error Handling
*   Handles broken voucher references, concurrent status conflicts, and database rollback failures with clear error messages.

---

## 30. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 31. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 32. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 33. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
