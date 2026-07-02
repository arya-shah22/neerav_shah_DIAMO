# DIAMO ERP – PHASE 13.5
## PRINT TEMPLATE & DOCUMENT LAYOUT CONFIGURATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Print Template and Document Layout Configuration module of DIAMO ERP. This module enables companies to configure existing document templates, structure print options, choose watermarks, align multiple signatures, and assign company-specific terms without modifying the core template files.

---

## 2. Business Purpose
*   **Corporate Branding consistency:** Assures all dispatches, tax bills, and reports render unified trade logos, legal identifiers, and aligned signatories.
*   **Print Document Security:** Allows embedding watermarks (e.g., `Draft`, `Duplicate`) depending on voucher status, preventing unauthorized document distribution.

---

## 3. Supported Documents
Supports configuration controls for:
*   Sales Invoices, Purchase Invoices, Sales Returns, and Purchase Returns.
*   Credit Notes, Debit Notes, Cash/Bank Receipts, Cash/Bank Payments, and Journal Vouchers.
*   Outsource Job cards and Challans (Trading, Outsource, Sales/Purchase Orders).
*   Ledgers, Trial Balances, Balance Sheets, Profit & Loss reports, and GST/Stock summary sheets.

---

## 4. Template Configuration
*   **Template Mapping Selector:** Allows setting active layouts (e.g., Default GST Template vs. Export Invoice Template) for specific document registries on a company-wise basis.

---

## 5. Header Configuration
*   **Auto-fetch Layout Rules:** Automatically updates header text blocks (Company Legal Name, GSTIN, PAN, Address, Contact details) based on the session's active company ID.

---

## 6. Footer Configuration
*   **Signatory Profiles:** Supports up to 3 authorized signatories. Captures Name, Designation, and Signature Image (PNG with transparent background). Signatures automatically mount onto sales invoice print templates.
*   **Layout Grid Alignment:** Automatically positions signatory segments based on the number selected:
    *   *One Signatory:* Right-aligned (`Authorized Signatory`).
    *   *Two Signatories:* Split left-right (`Manager` and `Director`).
    *   *Three Signatories:* Evenly spread (`Manager`, `Accountant`, and `Director`).

---

## 7. Watermark Configuration
*   **Opacity Layer Properties:** Toggles options (No Watermark, `Draft`, `Original`, `Duplicate`, `Cancelled`, `Paid`) with configurable opacity (10% to 50%), text rotation (diagonal vs. horizontal), and visibility checkboxes for preview and PDF export.

---

## 8. Document Options
*   **Visibility Toggle Controls:** Independent checkboxes for: Show Logo, Show GSTIN, Show Bank Account details, Show T&C, Show Page Numbers, Show Barcode, and Show Print Timestamp.

---

## 9. Terms & Conditions
*   **Text Block Configurator:** Custom multi-paragraph terms and conditions can be saved per document type and automatically appended to dispatches or invoices.

---

## 10. Print Settings
*   **Page Layout Metrics:** Selectable page size (A4, A5, Custom), margins (top, bottom, left, right), header/footer padding values, and orientation (Portrait vs. Landscape).

---

## 11. PDF Settings
*   **Export Properties:** Configurable compression levels (High, Medium, Low quality), vector logo embedding toggle, and automated file name patterns (e.g., `[VoucherNo]_[CompanyName].pdf`).

---

## 12. Print Preview
*   **Visual Simulator Component:** Renders draft layouts with zoom options, multiple-page navigation, and PDF-rendering previews inside Electron desktop panels.

---

## 13. Company-wise Configuration
*   **Layout Partitioning:** Assures template layouts, terms, and signatures of one legal entity are fully isolated from other registered entities.

---

## 14. Search
Supports filters for: Document Type, Template Name, and Status.

---

## 15. Filters
Provides filters for: Active Status, Company ID, and Watermark type.

---

## 16. Sorting
Allows sorting by: Company, Document Type, and Date Modified.

---

## 17. Validation
*   Checks for missing required signature files, alerts if header logos are blank, and flags invalid paper margins.

---

## 18. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 19. Module Impact
*   Impacts the printing and export output of all transaction entry screens, registers, general ledgers, and financial reports.

---

## 20. Permissions
Access is regulated by the following flags:
*   `view_print_configurations` / `modify_print_layouts`
*   `override_signatories` / `bypass_watermark_rules`

---

## 21. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 22. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 23. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 24. Error Handling
*   Handles missing signatory assets, corrupt template paths, and PDF export failures with clear error messages.

---

## 25. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 26. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 27. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 28. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
