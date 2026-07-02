# DIAMO ERP – PHASE 13.3
## INVENTORY SETTINGS & BARCODE CONFIGURATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Inventory Settings, Stock Number Generation, and Barcode Configuration module of DIAMO ERP. This module centralizes rules for packet numbering schemas, label tag properties, barcode configurations, thermal printer parameters, and validation logs, ensuring consistent barcode-based tracking.

---

## 2. Business Purpose
*   **Packet Standardization:** Standardizes packet ID and barcode formatting across branches, preventing duplicate numbering or unreadable labels.
*   **Operational Velocity:** Automated barcode assignment eliminates keying errors, speeding up warehouse operations and dispatches.

---

## 3. Stock Number Generation
*   **Numbering Strategies:**
    *   *Automatic Numbering:* Auto-generates IDs based on prefix, year, and running number.
    *   *Manual Numbering:* Allows manual input (for imported or legacy stock).
    *   *Prefix/Suffix Settings:* Configures prefix codes (e.g., `DM-` or `STK-`) and running length numbers (e.g., 6 digits: `000001`).

---

## 4. Stock Number Format
*   **Configuration Layout:** Prefix $\rightarrow$ Separator (e.g., `-`) $\rightarrow$ Financial Year $\rightarrow$ Running Number Length. The UI renders a live preview of the generated Stock ID before save approval.

---

## 5. Barcode Settings
*   **Format Selection:** Enforces Code 128 (high-density alphanumeric format, compact size, compatible with standard label printers).

---

## 6. Barcode Label Settings
*   **Label Layout Controls:** Paper size, layout margins, orientation (portrait/landscape), field alignment, logo placement, and barcode position.

---

## 7. Barcode Label Content
*   **Dynamic Tag Fields:** Selectable fields include: Company Logo, Stock ID, Barcode, Shape, Weight, Color, Clarity, IGI/GIA Number, and Purchase Date.

---

## 8. Barcode Printer Settings
*   **Printer Parameters:** Default printer selector, paper size, print density, speed, and automatic printing options (e.g., auto-print immediately on saving a new stock item).

---

## 9. Barcode Printing
*   **Printing Operations:** Single label reprint, batch printing from purchase bills, printing selected stock items from search grids, and filtered list printing.

---

## 10. Barcode Validation
*   Validates generated barcodes for uniqueness, flags missing codes, and prevents duplicate barcodes from being assigned.

---

## 11. Stock Identification
*   **Unique Association Rules:** Every packet must link to one unique Stock ID and one unique barcode. A barcode can never map to multiple active inventory records.

---

## 12. Search
Supports filters for: Stock ID, Barcode, IGI Number, and Purchase Date.

---

## 13. Filters
Provides filters for: Barcode Printed (Yes/No), Category, Availability, and Company.

---

## 14. Sorting
Allows sorting by: Stock ID, Barcode, and Weight.

---

## 15. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 16. Module Impact
*   Automatically affects Stock Masters, Stock Entry screens, Purchases, Sales, Outsource Job books, Challan Books, and Inventory audits.

---

## 17. Permissions
Access is regulated by the following flags:
*   `view_inventory_settings` / `modify_inventory_settings`
*   `print_barcode_labels` / `override_barcode_validation`

---

## 18. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 20. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 21. Error Handling
*   Handles offline printers, unreadable codes, duplicate barcodes, and network rollback failures with clear error messages.

---

## 22. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 23. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 24. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 25. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
