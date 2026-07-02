# DIAMO ERP – PHASE 5.1.6
## PURCHASE BOOK – VALIDATION, BUSINESS RULES & SECURITY SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Validation, Business Rules, Permissions, Error Handling, and Security structures of the Purchase Book in DIAMO ERP. This specification maps the transaction validation pipeline, permission levels, user alerts, and system boundaries required to prevent incorrect accounting entries or inventory logs.

---

## 2. Validation Philosophy
The validation engine processes checks in a strict sequence. If any validation fails, the transaction save sequence is blocked, and the system displays a descriptive diagnostic error:

```
Field Check -> Business Rules -> Master Active check -> Financial locks -> GST Checks -> Stock ledger limits -> Permissions Check -> Duplicate Check -> Commit
```

---

## 3. Header Validation
*   **Purchase Bill Number:** Checked for format compliance (`JD-PUR-YYYY-######`) and database uniqueness.
*   **Supplier Invoice Number:** Must be populated. Checked for uniqueness:
    $$\text{Unique Constraint} = \text{supplier\_id} + \text{supplier\_invoice\_number}$$
*   **Purchase Date:** Verified to fall within the active financial year and after the transaction lock date.

---

## 4. Supplier Validation
*   **Active Status:** Verifies the supplier is active and not blocked/blacklisted.
*   **Company Match:** Verifies the supplier account is linked to the active company partition.
*   **GST Parameters:** Verifies the supplier's GSTIN matches the state code and Place of Supply.

---

## 5. Broker Validation
*   **Conditional Constraint:** If the item grid or header commission value is greater than `0.00%`, a Broker select is mandatory.
*   **Active Verification:** Verifies the broker profile is active in the Master database.

---

## 6. Quality Validation
*   **SKU Matching:** Verifies that all grid Quality IDs exist and are active in the Quality Master.
*   **HSN Code Matching:** Checks that HSN codes match the records in the Quality Master.

---

## 7. Quantity & Rate Validation
*   **Carat Limit:** Carat weights must be greater than `0.000`. Negative or zero weights are blocked.
*   **Rate Limits:** Purchase Rates must be greater than `0.00` per carat. Negative rates are blocked.
*   **Decimal Precision:** Weights are validated against a 3-decimal precision limit (`0.000`).

---

## 8. Discount & Brokerage Validation
*   **Less % Limit:** Must fall in the range `0.00%` to `99.99%`.
*   **Commission Caps:** Brokerage % must not exceed the configured company cap (e.g., maximum `2.00%`). Values above this limit prompt for an administrator override code.

---

## 9. GST Validation
*   **Master Alignment:** Tax percentages in the grid must match the rates configured in the Quality Master.
*   **State Code Alignment:** The first two digits of the Supplier GSTIN must match the supplier state code, resolving CGST/SGST vs. IGST calculations.

---

## 10. Payment Validation
*   **Payment Limits:** The immediate payment value (`Amount Paid`) must be greater than or equal to `0.00` and cannot exceed the Net Invoice Value.

---

## 11. Total Validation
*   **Positive Totals:** Gross, Taxable Value, GST, Cess, and Net Amount sums must be non-negative.
*   **Math Reconciliation:** The Net Amount must reconcile with the line totals:
    $$\text{Net Amount} = \sum(\text{Gross}) + \sum(\text{GST}) + \sum(\text{Cess}) \pm \text{Round Off}$$

---

## 12. Save/Edit/Delete Validation
*   **Edit Constraints:** Permitted only if the invoice status is "Draft" or "Saved" and the transaction date is after the lock date.
*   **Delete Restrictions:** Allowed only for unpaid purchase bills. Invoices with partial or full payment records are locked against deletion. Deletions use the soft delete pattern.

---

## 13. Duplicate Detection
Before committing the save pipeline, the engine checks for duplicate transactions:
*   **Criteria:** Flags potential duplicates if a transaction has the same Supplier ID, Supplier Invoice Number, and Net Invoice Value.
*   **Action:** Displays a warning modal asking the user to confirm before proceeding.

---

## 14. Permission Matrix

| Operation | Purchase Executive | Accounts Manager | Admin |
| :--- | :--- | :--- | :--- |
| **Create Invoice** | Yes | Yes | Yes |
| **Edit Saved Invoice** | No (Draft Only) | Yes | Yes |
| **Soft Delete Voucher**| No | No | Yes |
| **Rate Overrides** | No | Yes (With Warning)| Yes |
| **Backdated Posting** | No | No | Yes |

---

## 15. Error Handling
Error dialogs display simple, user-friendly instructions:
*   *Incorrect HSN:* "Selected HSN code is invalid or missing in Quality Master. Please update Quality Master."
*   *Lock Violation:* "Purchase date is prior to the lock date of [DD/MM/YYYY]. Save blocked."
*   *Supplier Blocked:* "Selected Supplier is currently blocked. Please contact the administrator."

---

## 16. Warning Messages
The system displays amber warnings in the following cases:
*   *Rate Variance:* Rate differs by more than 15% from the last purchase rate.
*   *Outstanding Warning:* Supplier outstanding exceeds the credit limit.
*   *High-Value Warning:* Invoice total exceeds $50,000 / INR 5,000,000.

---

## 17. Success Messages
*   "Purchase Bill [JD-PUR-2026-000452] saved successfully."
*   "Purchase Bill [JD-PUR-2026-000452] cancelled successfully. Ledger entries reversed."

---

## 18. Edge Cases
*   **Double-Click Save:** The UI disables the save button during posting to prevent duplicate requests.
*   **Network Failure:** If the connection drops mid-save, the transaction rolls back, and the client displays: "Network connection lost. Transaction rolled back successfully."

---

## 19. Security Rules
*   **Company Isolation:** Ensures data is isolated so users can only access records matching their active company session.
*   **Financial Year Isolation:** Restricts transaction modifications to the active financial year partition.

---

## 20. Audit Rules
Logs all transaction edits, cancellations, and deletions, tracking:
*   `created_by`, `created_date`, `modified_by`, `modified_date`, `workstation_id`.
*   Before and after JSON snapshots representing the record changes.

---

## 21. Performance Rules
*   **Local Caching:** Active Supplier and Quality lists are cached locally to support instant autocompletion.
*   **Asynchronous Val:** Duplicate invoice checks are run in a background worker process.

---

## 22. Future Enhancements
*   **AI Duplicate Detection:** Compares grid contents and rates to flag potential double-billing issues.
*   **Real-Time GSTIN Lookup:** Checks supplier GSTIN status directly against GST portal APIs before saving.

---

## 23. Architect Recommendations
1.  **Unique Constraint Index:** Enforce a composite index on the database table: `UNIQUE(supplier_id, supplier_invoice_number, deleted_at)`.
2.  **Stateless Validation:** Perform validation checks on both the client (for UX responsiveness) and the server (to prevent API bypass).

---

## 24. Final Completion Checklist
*   [x] Document the validation pipeline sequence.
*   [x] Define header, supplier, broker, and quality grid validation rules.
*   [x] Establish the role-based permission matrix.
*   [x] Map duplicate detection criteria and warning alerts.
*   [x] Map soft delete constraints and audit log rules.
