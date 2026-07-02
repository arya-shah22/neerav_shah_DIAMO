# DIAMO ERP – PHASE 12.5
## DIAMOND INVENTORY MANAGEMENT – BULK IMPORT & MIGRATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Bulk CSV Import, Export, Data Validation, and Inventory Migration Engine of DIAMO ERP. This module provides utility pipelines to import, export, and map diamond inventory packets in bulk, verifying data structures and auditing changes.

---

## 2. Business Purpose
*   **Rapid Onboarding:** Allows legacy inventories to be migrated during initial setup.
*   **Supplier Uploads:** Supports uploading supplier stock lists directly without manual entry.
*   **Data Consistency:** Enforces strict data quality checks on imports to prevent system corruption.

---

## 3. Supported Import Formats
*   **Supported File Types:** CSV (.csv) and Excel (.xlsx) formats.

---

## 4. Supported Export Formats
*   **Supported File Types:** CSV, Excel, PDF, and Print.

---

## 5. Import Workflow
1.  *Select File:* Choose a local file.
2.  *Validate Columns:* Verify that all required fields are present.
3.  *Parse Data:* Validate field formats, weights, and date entries.
4.  *Detect Duplicates:* Search for existing Stock IDs or Certificate Numbers.
5.  *Import Preview:* Show records in a grid, highlighting errors.
6.  *Execute & Log:* Save valid records, log failures, and create an import report.

---

## 6. CSV Template
*   **Columns:** Stock ID, Purchase Date, Shape, Pieces, Weight (Carat), Color, Clarity, Cut, Polish, Symmetry, Depth %, Table %, IGI Number, Photo Link, Video Link, Category, and Availability.

---

## 7. Import Validation
*   **Validation Checks:** Validates input formats, checks weight and carat parameters, identifies future purchase dates, and flags duplicate Stock IDs or Certificate Numbers.

---

## 8. Duplicate Detection
*   **Matches:** Automatically blocks exact duplicate Stock IDs or duplicate Certificate Numbers.
*   **Warnings:** Alerts users if a packet matches the physical dimensions, shape, weight, color, and clarity of an existing available stock record.

---

## 9. Import Preview
*   Renders a grid displaying Row Number, parsed Stock ID, Status (Success/Error), and Reason. Users can choose to "Import All," "Import Selected," or "Skip Errors."

---

## 10. Error Management
*   Highlights errors in red (e.g., "Missing Carat Weight" or "Invalid Color Grade") and allows users to make corrections inline before finalizing the import.

---

## 11. Import Report
*   **Summary Log:** Logs Import ID, date/time, filename, user, success count, skipped count, failed count, duplicate count, and total processing duration.

---

## 12. Export Engine
*   **Selectable Ranges:** Users can export the entire active inventory, filtered stock lists (e.g., "Available GIA Round cut"), or specific selected records.

---

## 13. Bulk Update
*   **Mass Adjustments:** Allows modifying attributes like Category, Vault Location, Status, Photo/Video Links, or Remarks in bulk for selected packets, creating a permanent audit history.

---

## 14. Migration Engine
*   **Legacy Mapping Utility:** Enables mapping custom column names from legacy systems (e.g., mapping a column named "Wgt" to the target field "Weight") and converting values (e.g., mapping color code "D" to "D Color").

---

## 15. Search
Supports filters for: Import ID, File Name, Stock ID, Certificate ID, Date, and User.

---

## 16. Filters
Provides filters for: Import Date, User, Status (Success/Failed/Warning), and Stock Category.

---

## 17. Sorting
Allows sorting by: Import Date, Stock ID, Processing Time, and Status.

---

## 18. Validation
*   **Validation Pipeline:** Validates import structures, file extensions, column mappings, duplicate entries, and data formatting.

---

## 19. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 20. Report Impact
Saving or updating stock details automatically updates: Stock Registers, Stock Ledgers, Packet History sheets, and Outstanding Receivables.

---

## 21. Permissions
Access is regulated by the following flags:
*   `import_bulk_stock` / `export_inventory_data`
*   `approve_bulk_migration` / `execute_mass_updates`

---

## 22. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 23. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 24. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 25. Error Handling
*   Handles corrupted file formats, missing template columns, database timeout rollbacks, and validation failures with clear error messages.

---

## 26. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 27. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 28. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 29. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
