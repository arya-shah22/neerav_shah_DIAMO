# DIAMO ERP – PHASE 12.11
## DIAMOND INVENTORY MANAGEMENT – BARCODE & SCANNING ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Barcode, QR Code, Label Printing, and Scanning Management Engine of DIAMO ERP. This module automatically assigns unique barcodes and QR codes to Stock IDs, layouts packet label formats, processes hardware scanner streams, and integrates scanning with transaction records.

---

## 2. Business Purpose
*   **Operational Velocity:** Eliminates manual data entry errors by allowing packet dispatches, receipts, and inventory counts to be processed via scanning.
*   **Warehouse Automation:** Integrates physical vault audits with the database, maintaining transaction logs for physical tracking.

---

## 3. Barcode Generation
*   **Unique Generation Schema:**
    *   On packet registration, the system auto-generates a Code 128 barcode representing the unique Stock ID (e.g., `DM-2026-000001`).
    *   Barcodes remain permanently associated with the Stock ID and are never reused.

---

## 4. QR Code Generation
*   **Dynamic Matrix:**
    *   Generates a unique QR code linked to the Stock ID, pointing to an internal query URL (e.g., `diamo://stock/DM-2026-000001`) to support future mobile app checks.

---

## 5. Supported Barcode Formats
*   **Recommended Format:** Code 128 (high-density alphanumeric format, compact size, compatible with standard label printers).

---

## 6. QR Code Contents
*   **Encoded Information:** Stored data is limited to the Stock ID to prevent stale metadata issues when weight, location, or status updates occur in the database.

---

## 7. Label Printing
*   **Printing Modes:** Supports single packet labels, multiple selected packets, batch prints for entire invoices, and duplicate reprints.

---

## 8. Label Design
*   **Pre-defined Templates:**
    *   *Diamond Packet Label:* Includes shape, weight, color, clarity, certificate number, barcode, and QR code.
    *   *Jewellery Tag:* Foldable, thin layout for mounting on mount rings.
    *   *Warehouse Tag:* Standard 2x1 inch tag for box storage.

---

## 9. Label Customization
*   **User Adjustments:** Paper dimensions, print margins, font selections, barcode placement, and field visibility settings.

---

## 10. Scanning Engine
*   **Hardware Interface:** Listens to keyboard emulation streams from USB/Wireless barcode scanners, camera feeds, and RFID scanners.

---

## 11. Global Scan
*   **Global Listener:** Scanning a barcode from any active page opens the Stock Details drawer, displaying availability, status, and timeline logs.

---

## 12. Purchase Integration
*   Scanning a barcode during purchase imports updates the corresponding supplier invoice grid, pre-filling weights and certificate details.

---

## 13. Sales Integration
*   Scanning during sales entry adds the stone to the billing grid. Blocks dispatches if status checks reveal the packet is reserved or sold.

---

## 14. Job Book Integration
*   Scanning packets during issue/receipt processes updates the Outsource Job worker's pending inventory ledger.

---

## 15. Challan Integration
*   Scanning packet barcodes pre-fills the issue/return rows, automatically updating stock availability indicators.

---

## 16. Physical Stock Verification
*   Allows users to scan a batch of packets. The system compares the scanned IDs against system database lists to generate mismatch reports.

---

## 17. Bulk Label Printing
*   Supports printing entire groups of labels by filtering by: Supplier, Purchase Bill Number, Sales Bill Number, Date Range, or Shape.

---

## 18. Search
Supports filters for: Stock ID, Barcode String, QR Link, and Certificate Number.

---

## 19. Filters
Provides filters for: Barcode Printed (Yes/No), QR Generated, Availability, and Purchase Date.

---

## 20. Validation
*   Validates generated barcodes for uniqueness, flags missing codes, and detects read failures from scanner inputs.

---

## 21. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 22. Print Engine
Generates print templates for:
*   *Print Formats:* Renders company logos, headers, footers, page counts, and draft or cancelled watermarks.

---

## 23. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **Export Ranges:** Supports exporting selected accounts, filtered transaction dates, or the entire financial year.

---

## 24. Report Impact
Automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 25. Permissions
Access is regulated by the following flags:
*   `print_barcode_labels` / `customize_label_templates`
*   `override_scan_validation` / `delete_print_jobs`

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
*   Handles offline printers, disconnected scanners, unreadable codes, and database rollback failures with clear error messages.

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
