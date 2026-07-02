# DIAMO ERP – PHASE 12.2
## DIAMOND INVENTORY MANAGEMENT – STOCK MASTER ENTRY SCREEN SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Stock Master Entry Screen of DIAMO ERP. This module provides single diamond entries, bulk CSV/Excel imports, and media attachments to streamline inventory management and prevent data entry duplication.

---

## 2. Module Overview
The Stock Master Entry Screen is the primary interface for creating and managing physical inventory records. It supports single-form entries, bulk file imports, and media attachments, automatically updating stock registers in real time.

---

## 3. Entry Modes
The page supports two entry modes, toggleable via a header switch:
*   **Single Entry Mode:** Renders a detailed, structured form for entering individual stones.
*   **Bulk CSV Import Mode:** Renders a file upload zone with validation and preview options.

---

## 4. Header
*   **Voucher Metadata:** Company Name, Financial Year, Entry Date, Entry Type (Single vs. CSV), Prepared By, Approved By, and Status (Draft/Approved/Posted).

---

## 5. Single Diamond Entry
*   **Main Fields:** Stock ID Number, Purchase Date, Category (Certified/Non-Certified), and Availability Status (Available/Hold/Sold).

---

## 6. Physical Details
*   **Parameters:** Shape, Length, Width, Depth, Piece Count (Pieces), and Carat Weight.

---

## 7. Quality Details
*   **Parameters:** Color, Clarity (Purity), Cut, Polish, and Symmetry.

---

## 8. Measurements
*   **Parameters:** Total Depth % and Table %.

---

## 9. Certification
*   **Fields:** Certificate Type (IGI, GIA, HRD, SGL) and Certificate Number.

---

## 10. Media Management
*   **Media Handling:** Supports local image/video uploads, drag-and-drop actions, external URL mapping, and PDF certificate attachments.

---

## 11. Live Preview
*   **Real-Time Rendering:** Shows thumbnail images, video loops, certificate metadata, carat weight summaries, and diamond dimensions in a sidebar panel.

---

## 12. CSV Import
*   **File Formats:** Supports CSV and Excel (.xlsx) file uploads.

---

## 13. CSV Workflow
1.  *Upload File:* Select or drag a CSV file into the upload zone.
2.  *Validate Data:* Parse rows and validate field structures.
3.  *Preview Records:* Show parsed rows in a grid, highlighting validation errors in red.
4.  *Correct & Import:* Users can correct values inline before final import.
5.  *Log Results:* Generate a summary report of successful and failed rows.

---

## 14. CSV Template
*   **Required Columns:** `StockID`, `PurchaseDate`, `Shape`, `Weight`, `Colour`, `Purity`, `Cut`, `Polish`, `Symmetry`, `IGINumber`, `PhotoLink`, `VideoLink`, and `Category`.

---

## 15. Import Validation
*   Validates input values against master lists, checking for duplicate Stock IDs, incorrect dimension formats, and future purchase dates.

---

## 16. Import Preview
*   Shows a preview grid with columns for Row Number, Stock ID, Validation Status (Success/Error), and Reason. Users can choose to "Import All," "Import Selected," or "Skip Errors."

---

## 17. Import Report
*   Generates a summary of: Total Records, Successful Imports, Failed Imports, Duplicate Records, Validation Errors, and Processing Time.

---

## 18. Duplicate Detection
*   **Detection Checks:** Blocks duplicate Stock IDs or duplicate Certificate Numbers.
*   **Duplicate Prevention:** Alerts users when a stone matches the shape, weight, color, and clarity of an existing available stock record.

---

## 19. Keyboard Shortcuts
*   `Ctrl + N`: New Entry
*   `Ctrl + S`: Save
*   `Ctrl + I`: Import CSV
*   `Ctrl + P`: Preview Layout
*   `Enter`: Move to Next Field

---

## 20. Search
Supports filters for: Stock ID, Certificate ID, Shape, Carat Weight, Color, and Clarity.

---

## 21. Filters
Provides filters for: Category (Certified/Non-Certified), Availability, Vault Location, and Date.

---

## 22. Validation
*   **Validation Pipeline:** Automatically validates required fields, formats, and duplicates before saving.

---

## 23. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 24. List Page
*   **Grid Columns:** Stock ID, Shape, Weight, Color, Clarity, Certificate Number, Availability, and Date.
*   **Actions:** View, Edit, Duplicate, and Archive.

---

## 25. Permissions
Access is regulated by the following flags:
*   `create_stock_master` / `edit_stock_details`
*   `release_consignment_hold` / `adjust_stock_weights`

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
*   Handles upload failures, invalid file encodings, and missing columns, displaying clear error messages.

---

## 30. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 31. Future Enhancements
*   **AI Auto-Tagging:** Automatically tags color and clarity parameters using physical stone photos.
*   **OCR Integration:** Scans paper certificates to auto-fill details.

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
