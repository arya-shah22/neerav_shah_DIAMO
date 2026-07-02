# DIAMO ERP – PHASE 4.1.7
## SALE BOOK – OUTPUT ENGINE, PRINTING, SEARCH & FINALIZATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Output Engine, Printing System, Search System, List Page, Export Engine, and Document Finalization parameters of the Sale Book module in DIAMO ERP. This specification concludes the Sale Book module lifecycle, establishing standard procedures for invoice rendering, database queries, and version history auditing.

---

## 2. Print Engine
The Print Engine handles invoice output formatting:
*   **Print Preview:** Provides a high-contrast modal overlay showing exactly how printed copies look.
*   **Page Break Logic:** Automatically inserts page breaks when invoice lines exceed page limits. Long grids are split across pages:
    *   *First Page:* Primary header details + first 15 grid lines.
    *   *Middle Pages:* Grid lines 16 to 45 + simplified running header.
    *   *Final Page:* Remaining grid lines + calculations panel + terms box + signatory block.
*   **Status Watermarks:** Renders a high-contrast diagonal watermark in the background: "DRAFT" (unsaved vouchers) or "CANCELLED" (de-authorized vouchers).

---

## 3. Print Templates
The system supports multiple print layout templates depending on the transaction type:
*   **GST Invoice:** The standard domestic layout showing CGST/SGST/IGST tax grids, HSN codes, and own bank account details.
*   **Export Invoice:** Layout presenting values in USD or other foreign currencies, displaying SWIFT bank codes, and including custom shipping declarations.
*   **Compact Invoice:** Single-page A4 layout showing consolidated item totals (used for rapid trade desk billing).
*   **Detailed Invoice:** Fully itemized multipage layout showing cut, clarity, and packet history tags for every line.

---

## 4. PDF Engine
*   **Auto-Naming Scheme:** PDF files are generated using the template:
    $$\text{Filename} = \text{Invoice Number} + \text{"\_"} + \text{Customer Name} + \text{".pdf"}$$
    *Example:* `JD-SALE-2026-000452_Kiran_Diamonds.pdf`
*   **Archiving:** A copy of the PDF is written to the local NAS storage drive automatically upon invoice validation, serving as a read-only historical archive.

---

## 5. Export Engine
*   **Supported Formats:** Excel (.xlsx), CSV (.csv), and PDF (.pdf).
*   **File Naming:** Files are labeled using: `SaleBook_List_[YYYYMMDD]_[HHMM].xlsx`.
*   **Security:** Only users with `export_financial_reports` permissions can download listings.

---

## 6. Email Engine
*   **Email Sharing Workflow:**
    ```
    Approved Invoice -> Auto-generate PDF -> Attach to Custom Email Template -> Send via configured SMTP -> Write delivery logs
    ```
*   **Auditing:** Stores delivery logs showing recipient address, timestamps, and active status in the invoice history panel.

---

## 7. WhatsApp Engine (Future)
*   **Automated Delivery:** Sends a link to the PDF invoice or outstanding balance notices directly to the customer's mobile number.
*   **Payment Links:** Integrates billing coordinates to send invoice links to clients.

---

## 8. Sale Book List Page
The list page `/transactions/sales` provides a centralized operational grid:
*   **Sorting & Grouping:** Group invoices by Customer Name, Broker, Payment Status, or date.
*   **Infinite Scrolling:** Supports smooth vertical scrolling across large invoice databases without pagination lags.
*   **Saved Views:** Operators can save specific filters (e.g., "Unpaid Invoices > 30 Days") to the sidebar for quick access.

---

## 9. Search Engine
The global search engine uses indexed keywords to search the database:
*   **Fuzzy Searching:** Matches inputs despite spelling discrepancies.
*   **Combined Search Parameters:** Users can type compound searches (e.g., `Kiran VS2` searches both Customer name and Quality).

---

## 10. Filters
Provide standard sidebar selectors:
*   *Date Presets:* Today, Yesterday, This Week, This Month, Active Financial Year, Custom Range.
*   *Status Filters:* Active, Draft, Unpaid, Partially Paid, Paid, Overdue, Cancelled, Soft-Deleted.
*   *Value Filters:* High-value invoices (value exceeding $10,000 / INR 1,000,000).

---

## 11. List Actions
Right-clicking a row in the invoice listing grid displays a context menu:
*   **Open / Edit:** Opens the invoice entry form.
*   **Print / Preview:** Instantiates print previews.
*   **Duplicate:** Copies customer, broker, and item grid rows into a new draft invoice.
*   **Cancel / Delete:** Reverses transaction entries (requires override permission and input of reason).
*   **Quick Views:** Open Customer Ledger, Open Outstanding Statement, or Open Audit History.

---

## 12. Document Management (Future)
*   **Attachment Drive:** Allows uploading and linking supporting documents (such as transport receipts, custom POs, GIA grading certificates) directly under the invoice ID.

---

## 13. Audit History
Every transaction logs its lifecycle metrics:
*   `created_by`, `created_date`, `modified_by`, `modified_date`.
*   `cancelled_by`, `cancelled_date`, `deletion_reason` (if applicable).
*   Workstation name, database session ID, and approval signature references.

---

## 14. Version History
Modifying a saved invoice increments the record version tag:
*   **Version Comparison:** The history log saves a snapshot of each version, allowing managers to compare differences (e.g., highlighting that Version 2 modified the sales rate on Row 3 from INR 45,000 to INR 42,000).

---

## 15. Activity Timeline
Renders a vertical timeline in the detail pane showing:
1.  **Voucher Created:** Date, Time, User A.
2.  **Printed:** Date, Time, User A.
3.  **PDF Exported:** Date, Time, User A.
4.  **Edit Saved:** Date, Time, User B (Version 2).
5.  **Payment Received:** Date, Time, Cashier (outstanding balance updated).

---

## 16. Notifications
*   **Toast Notifications:** Alerts operators when actions finish (e.g., "PDF invoice generated successfully").
*   **Approval Alerts:** Alerts managers when a billing executive generates invoices that exceed customer credit limits.

---

## 17. Security
Permissions are controlled using granular access flags:
*   `print_sales_invoice` / `export_sales_reports`
*   `override_sales_price` / `cancel_sales_invoice`
*   `view_invoice_audit_history`

---

## 18. Performance
*   **Scalability Targets:** The list grid is designed to handle over 100,000 rows using react virtual listing libraries.
*   **Non-Blocking PDF Generation:** Electron handles PDF rendering in a background process, ensuring the UI remains responsive.

---

## 19. Future Enhancements
*   **AI Invoice Matcher:** Natural language searches (e.g., "Find invoices from Kiran Diamonds in May exceeding 5 Lakhs").
*   **Digital Seal & Signature:** Automatically applies cryptographic signatures to PDF layouts to prevent fraud.

---

## 20. Architect Recommendations
1.  **Background Thread PDF Engine:** Do not block Electron's main process during PDF generation. Route exports through headless Chromium renderers.
2.  **Optimized DB Queries:** Ensure listing pages only query index columns (`bill_number`, `invoice_date`, `customer_id`, `net_amount`) and load detail fields only when double-clicking to open an invoice.

---

## 21. Final Completion Checklist
*   [x] Document the print engine page-breaks, watermarks, and margin rules.
*   [x] Define GST, Export, and Compact print layout templates.
*   [x] Map PDF naming, email templates, and WhatsApp integration workflows.
*   [x] Detail the Sale Book List Page grid, global fuzzy searches, and filters.
*   [x] Document audit logs, version comparison details, and timeline behavior.
