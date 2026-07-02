# DIAMO ERP – PHASE 13.4
## VOUCHER & DOCUMENT NUMBERING CONFIGURATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Voucher and Document Numbering Configuration module of DIAMO ERP. This module provides a centralized numbering engine that manages prefixes, suffixes, and running sequences for all operational vouchers (Invoices, Challans, Receipts, Payments, and JVs) across active companies.

---

## 2. Business Purpose
*   **Audit Consistency:** Ensures that transaction vouchers use sequential, duplicate-free numbering, complying with tax regulations.
*   **Context Isolation:** Supports independent, company-wise numbering sequences to prevent transaction overlaps.

---

## 3. Supported Documents
Provides independent numbering sequences for:
*   Sales Invoices, Sales Returns, Sales Credit Notes, and Sales Debit Notes.
*   Purchase Invoices, Purchase Returns, Purchase Credit Notes, and Purchase Debit Notes.
*   Cash Receipts, Cash Payments, Bank Receipts, Bank Payments, and Journal Vouchers (JVs).
*   Job Book Income/Expense vouchers.
*   Challan books (Trading, Outsource, Sales/Purchase Orders).
*   Stock Entries, Stock Adjustments, and Physical Verification batches.

---

## 4. Numbering Methods
*   **Automatic Numbering:** Automatically generates sequential numbers.
*   **Manual Numbering:** Allows manual input (checked for duplicates on save).
*   **Override Mode:** Auto-generates numbers but allows authorized users to manually edit them.

---

## 5. Number Format
*   **Pattern Structure:** Prefix $\rightarrow$ Separator (e.g., `-`) $\rightarrow$ Financial Year $\rightarrow$ Running Number (e.g., `000001`) $\rightarrow$ Suffix. The UI displays a live preview of the generated document number.

---

## 6. Running Number Settings
*   **Sequence Parameters:** Starting number, current number, next number, digit length (e.g., 6 digits: `000001`), and reset trigger (e.g., reset annually on April 1st).

---

## 7. Prefix Settings
*   Supports configuring static prefixes (e.g., `SAL` for sales), company code prefixes, branch prefixes, or financial year prefixes.

---

## 8. Suffix Settings
*   Supports configuring static suffixes, financial year labels, company codes, or custom text.

---

## 9. Number Preview
*   **Live Simulator:** The UI displays the sample number, next number, and last generated number, updating instantly as configuration settings change.

---

## 10. Number Reservation
*   **State Rules:**
    *   *Draft:* Assigns a temporary draft number (e.g., `TEMP-001`).
    *   *Save/Post:* Reserves and writes the next sequence number to the database.
    *   *Cancellation:* The assigned voucher number is permanently preserved and marked as `Cancelled` (never reused) to maintain audit trails.

---

## 11. Cancellation Rules
*   **Sequence Gaps:** To comply with tax audit rules, cancelled document numbers are preserved in a Cancellation Register and never reused.

---

## 12. Financial Year Behaviour
*   **Period Boundary Rules:** Allows copying the previous year's prefix/suffix configurations while restarting the running sequence at the start of the new financial year.

---

## 13. Company-wise Numbering
*   **Sequence Isolation:** Each company maintains independent running sequences. For example, Company A and Company B can both start sales invoices at `SAL-2026-000001` without duplicate key errors.

---

## 14. Search
Supports filters for: Module Name, Voucher Type, Prefix, and Financial Year.

---

## 15. Filters
Provides filters for: Method (Automatic/Manual), Active Status, and Company ID.

---

## 16. Sorting
Allows sorting by: Voucher Type, Financial Year, and Next Number.

---

## 17. Validation
*   Validates format lengths, checks for duplicate document numbers within a company, and prevents overlapping configuration dates.

---

## 18. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 19. Module Impact
*   Directly affects document generation in Sales, Purchases, Cash/Bank books, JVs, Challans, and Stock Master records.

---

## 20. Permissions
Access is regulated by the following flags:
*   `view_numbering_configs` / `modify_numbering_configs`
*   `reset_running_sequence` / `override_voucher_number`

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
*   Handles sequence conflicts, duplicate overrides, and database rollback failures with clear error messages.

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
