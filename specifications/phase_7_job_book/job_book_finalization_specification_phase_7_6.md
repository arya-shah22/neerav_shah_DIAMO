# DIAMO ERP – PHASE 7.6
## JOB BOOK – VALIDATION, SECURITY, PRINTING & FINALIZATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Validation, Security, Printing, Search, Export, Audit, and Finalization of the Job Book module in DIAMO ERP. This specification outlines listing page grids, print engine templates, PDF packaging rules, version history comparisons, and data isolation controls.

---

## 2. Validation
Reconciles validation rules across the Job Book:
*   **Receive Validation:** Checks that the returned carat weight does not exceed the pending carat balance.
*   **Costing Validation:** Ensures calculated values are positive.
*   **Tax Validation:** Reconciles state prefixes and PAN validations for GST and TDS.

---

## 3. Business Rules
1.  **Reference Verification:** Expenses must reference a valid Job Work Challan.
2.  **No Double-Expense Booking:** A Receive From Job Work ID can generate only one expense entry.
3.  **Read-Only Rules:** Once closed or paid, vouchers are locked against edits.

---

## 4. Search
*   **Global Search:** Searches by Job Card ID, Worker Name, Customer Reference, Packet Number, and HSN.
*   **Saved Queries:** Users can save search filter configurations for quick retrieval.

---

## 5. Filters
Provides filters for: Today, Yesterday, This Week, This Month, Pending, Completed, Overdue, and Quality Grade.

---

## 6. List Page
The list page features a dashboard grid:
*   **Grid Columns:** Auto-sized columns, groupable rows (e.g., group by worker), pagination, and infinite scroll for large datasets.
*   **Status Badges:** Renders color-coded status badges (`Draft` (Gray), `Issued` (Yellow), `Received` (Blue), `Completed` (Green), `Overdue` (Red)).

---

## 7. List Actions
Allows row-level actions via context menus:
*   *Actions:* Edit, Duplicate, Cancel, Print GRN, View Audit Trail, View Cost Sheet, View Version History.

---

## 8. Print Engine
Generates print templates for:
*   *Receive Slip / Goods Received Note:* Confirms weight, pieces, and wastage values.
*   *Job Cost Sheet:* Itemizes process and labor costs for a diamond lot.

---

## 9. PDF Engine
*   **Branding Configuration:** Auto-appends the company logo and letterhead details.
*   **Security Configuration:** Supports password protection for exported files.

---

## 10. Export
*   **Supported Formats:** Excel, PDF, CSV, and Print.
*   **File Naming Rules:**
    $$\text{Filename} = \text{InvoiceNo} + "\_" + \text{PartyName} + "\_" + \text{Timestamp} + ".pdf"$$

---

## 11. Email
*   **Email Templates:** Auto-attaches transaction PDFs to system-generated email notifications.

---

## 12. Audit
Logs all status changes:
*   Tracks location updates, custodian transfers, and conversion histories.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 13. Version History
Tracks voucher modifications:
*   **Version Comparison:** Modifying a voucher creates a new version history entry (e.g., v1 to v2), highlighting field modifications in a comparison view.

---

## 14. Notifications
Generates alerts for:
*   Consignments due for return tomorrow.
*   Critical overdue dispatches (triggers warnings).
*   Losses or damages requiring manager approval.

---

## 15. Security
Access is regulated by the following flags:
*   `view_dashboard` / `manual_status_override`
*   `force_close_challan` / `reopen_challan`

---

## 16. Performance
*   **Search Optimization:** Enforce database indexes on `(quality_id, status)` to support fast available-stock calculations.
*   **Asynchronous Calculations:** Costing calculations run in a background worker process.

---

## 17. Future Enhancements
*   **OCR Bill Upload:** Scan supplier PDF bills to extract items and rates automatically.
*   **AI Yield Predictions:** Analyzes rough diamond shapes to predict polished yield weights.

---

## 18. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Costing API:** Run costing calculations in background worker processes to prevent UI lag.

---

## 19. Final Completion Checklist
*   [x] Document validation rules and search/filter parameters.
*   [x] Map the list page grid and row context actions.
*   [x] Detail the print engine and PDF export formatting.
*   [x] Map audit logs, version histories, and security rules.
*   [x] Document performance thresholds and indexing rules.
