# DIAMO ERP – PHASE 6.6
## CHALLAN BOOK – VALIDATION, BUSINESS RULES & SECURITY SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Validation Rules, Business Rules, Permissions, Security, and Error Handling structures of the Challan Book in DIAMO ERP. This specification outlines the validation pipeline, stock availability checks, conversion constraints, and security isolation rules required to prevent double-allocations or untraceable stock movements.

---

## 2. Validation Philosophy
The validation engine processes checks in a strict sequence. If any validation fails, the transaction save sequence is blocked, and the system displays a descriptive diagnostic error:

```
Field Check -> Master Validation -> Inventory Check -> Business Rules -> Permissions Check -> Duplicate Check -> Commit
```

---

## 3. Header Validation
*   **Challan Number:** Checked for format compliance (`JD-CH-YYYY-######`) and database uniqueness.
*   **Reference Number:** Optional input field. Warns if a duplicate reference is entered.
*   **Challan Date:** Must fall within the active financial year and after the transaction lock date.
*   **Expected Return Date:** Mandatory for Job Work, Jhanghad, Customer Approval, and Broker Samples. Must be greater than or equal to the Challan Date.

---

## 4. Party Validation
*   **Active Status:** Verifies the party is active and not blocked.
*   **Consignment Check:** Warns if the party has exceeded maximum overdue Challan counts (e.g., more than 3 outstanding overdue Jhanghad dispatches).

---

## 5. Broker Validation
*   **Conditional Selection:** Optional field.
*   **Active Verification:** Verifies the broker profile is active in the Master database.

---

## 6. Quality Validation
*   **Quality Match:** Verifies that all grid Quality IDs exist and are active in the Quality Master.
*   **HSN Code Matching:** Checks HSN allocations against the master records.

---

## 7. Stock Validation
*   **Carat Limit:** Carat weights must be greater than `0.000` and less than or equal to the available warehouse stock.
*   **Reservation Guard:** If a packet is already flagged as "Reserved" or "Out on Challan" under another active document ID, saving is blocked.

---

## 8. Return & Conversion Validation
*   **Return Limit:** Returned weights cannot exceed the original issued weight.
*   **Conversion Guard:** Converted Challans are locked against further returns or modifications. Cancelled or deleted Challans cannot be converted.

---

## 9. Date Validation
*   **Date Limits:** Date must fall within active financial year boundaries.
*   **Lock Check:** Must be strictly after the company's active `Lock Transaction Upto Date`.

---

## 10. Total Validation
*   **Positive Totals:** Gross carats, pieces, and values must be non-negative.
*   **Recalculation:** Values are recalculated instantly upon modifying weight or rate fields.

---

## 11. Save/Edit/Delete Validation
*   **Edit Constraints:** Permitted only if the Challan status is `Draft` or `Issued` and the date is after the lock date.
*   **Delete Restrictions:** Converted or returned Challans cannot be deleted. Deletions use the soft delete pattern.

---

## 12. Duplicate Detection
Before committing the save pipeline, the engine checks for duplicate transactions:
*   **Criteria:** Flags potential duplicates if a transaction has the same Party ID, Purpose, and Net Consignment Value.
*   **Action:** Displays a warning modal asking the user to confirm before proceeding.

---

## 13. Permission Matrix

| Operation | Sales Executive | Warehouse Staff | Admin |
| :--- | :--- | :--- | :--- |
| **Create Challan** | Yes | Yes | Yes |
| **Process Return** | No | Yes | Yes |
| **Soft Delete Challan**| No | No | Yes |
| **Stock Overrides** | No | No | Yes |
| **Status Reopen** | No | No | Yes |

---

## 14. Error Handling
Error dialogs display simple, user-friendly instructions:
*   *Incorrect Return:* "Returned quantity exceeds the original issued weight. Save blocked."
*   *Lock Violation:* "Challan date is prior to the lock date of [DD/MM/YYYY]. Save blocked."
*   *Stock Insufficient:* "Insufficient stock available for selected Quality ID."

---

## 15. Warning Messages
The system displays amber warnings in the following cases:
*   *Duplicate Reference:* Reference number has already been used on another Challan.
*   *Expected Return Near:* Expected return date is within 24 hours.

---

## 16. Success Messages
*   "Challan [JD-CH-2026-000084] created successfully."
*   "Return processed successfully. Stock updated."

---

## 17. Security Rules
*   **Company Isolation:** Ensures data is isolated so users can only access records matching their active company session.
*   **Financial Year Isolation:** Restricts transaction modifications to the active financial year partition.

---

## 18. Audit Rules
Logs all transaction edits, cancellations, returns, and conversions, tracking:
*   `created_by`, `created_date`, `modified_by`, `modified_date`, `workstation_id`.
*   Before and after JSON snapshots representing the record changes.

---

## 19. Edge Cases
*   **Double-Click Save:** The UI disables the save button during posting to prevent duplicate requests.
*   **Power Failure:** System timeouts trigger automated database rollbacks to prevent inventory mismatches.

---

## 20. Performance Rules
*   **Asynchronous Val:** Duplicate reference and stock availability checks are run in a background worker process.
*   **Index Optimization:** Enforce database indexes on `(quality_id, status)` to support fast available-stock calculations.

---

## 21. Future Enhancements
*   **AI Duplicate Detection:** Compares grid contents and rates to flag potential double-billing issues.
*   **Digital Signatures:** Capture recipient signatures on mobile apps to confirm dispatches.

---

## 22. Architect Recommendations
1.  **Unique Constraint Index:** Enforce a composite index on the database table: `UNIQUE(challan_number, financial_year_id, deleted_at)`.
2.  **Stateless Validation:** Perform validation checks on both the client (for UX responsiveness) and the server (to prevent API bypass).

---

## 23. Final Completion Checklist
*   [x] Document the validation pipeline sequence.
*   [x] Define header, party, broker, and quality validation rules.
*   [x] Establish the role-based permission matrix.
*   [x] Map duplicate detection criteria and warning alerts.
*   [x] Map soft delete constraints and audit log rules.
