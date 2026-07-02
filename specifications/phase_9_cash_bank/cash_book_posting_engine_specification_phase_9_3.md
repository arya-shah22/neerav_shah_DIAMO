# DIAMO ERP – PHASE 9.3
## CASH BOOK – CASH POSTING ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Cash Posting Engine of DIAMO ERP. This engine manages validation, ledger updates, outstanding allocations, advance management, and reporting updates for all cash payments and receipts.

---

## 2. Business Purpose
Automating cash transactions prevents balance mismatches:
*   **Operational Context:** Ensures physical currency movements reconcile with party ledger balances and outstanding customer/supplier invoices.
*   **Operational Distinctions:**
    *   *Bill Settlement:* Allocates payments directly to outstanding invoices.
    *   *Advance Ledger:* Records payments without matching outstanding invoices.

---

## 3. Posting Logic
Ledger postings are executed in a single database transaction:
*   **Cash Payment:**
    *   *Debit:* Selected Party / Expense Account.
    *   *Credit:* Active Cash Account.
*   **Cash Receipt:**
    *   *Debit:* Active Cash Account.
    *   *Credit:* Selected Party / Income Account.

---

## 4. Outstanding Management
Manages customer/supplier balances:
*   **Outstanding Adjustment:** Reduces outstanding invoices by the transaction amount.
*   **Split Allocation:** Allows splitting a single cash entry across multiple unpaid bills.

---

## 5. Advance Management
*   **Advance Postings:** Payments or receipts without matching bills are posted to the Party's Advance Account.
*   **Reconciliation:** When a new invoice is posted, the system prompts the user to allocate the advance balance to the bill.

---

## 6. Partial Payment
*   **Balance Reduction:** Tracks partial payments, updating the invoice's outstanding balance:
    $$\text{Pending Balance} = \text{Original Value} - \sum \text{Payments}$$

---

## 7. Payment Status
Vouchers update invoice statuses:
*   `Pending`: No payments received.
*   `Partial`: Payments received, outstanding balance remains.
*   `Completed`: Fully paid.
*   `Advance`: Cash received with no invoice.

---

## 8. Auto Calculations
Calculates values in real-time:
*   **Formula:**
    $$\text{Outstanding After} = \text{Outstanding Before} - \text{Voucher Value}$$
    $$\text{Cash Balance After} = \text{Cash Balance Before} \pm \text{Voucher Value}$$

---

## 9. Ledger Impact
Automatically updates:
*   *Ledgers:* Cash Ledger, Party Ledger, Accounts Outstanding, General Ledger, Trial Balance, Balance Sheet, Profit & Loss.

---

## 10. Validation
*   **Negative Balance Validation:** Blocks transactions that reduce office cash below zero.
*   **Inactive Check:** Blocks transactions involving deactivated accounts.
*   **Period Lock:** Postings must fall within the active financial year.

---

## 11. Business Rules
1.  **Direct Allocation Rule:** Receipts and payments must adjust outstanding invoices first before recording advances.
2.  **No Edits on Posted Cash Books:** Adjustments require posting a Reversal Voucher.
3.  **Cross-Party Allocation Check:** Users cannot allocate cash allocations to bills belonging to other parties.

---

## 12. Reversal
*   **Reversal Workflow:** Posted vouchers cannot be modified. Corrections require posting a Reversal Voucher, which automatically generates opposing debit/credit lines and restores invoice outstanding balances.

---

## 13. Report Impact
Saving a voucher updates:
*   *Reports:* Cash Book, Trial Balance, Profit & Loss, Balance Sheet, Accounts Outstanding.

---

## 14. Search
Supports filters for: Voucher Number, Party Name, Reference Bill, Amount, and Date.

---

## 15. Filters
Provides filters for: Cash Payment, Cash Receipt, Advance, Pending, and Financial Year.

---

## 16. Permissions
Access is regulated by the following flags:
*   `post_cash_voucher` / `reverse_cash_voucher`
*   `override_negative_cash` / `bypass_outstanding_limits`

---

## 17. Audit
Logs all status changes:
*   Tracks cash allocations, advance adjustments, and balance modifications.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 18. Error Handling
*   **Rollback Protection:** System timeouts or validation failures during posting trigger database rollbacks to prevent ledger imbalances.

---

## 19. Edge Cases
*   **Advance Exceeding Outstanding:** Excess values are logged in the Party's Advance Account.
*   **Concurrent Postings:** Locks the Party Account table during posting to prevent double-allocations.

---

## 20. Future Enhancements
*   **AI Auto-Allocation:** Recommends optimal payment allocations based on invoice aging and discount terms.
*   **UPI QR Integration:** Generates dynamic UPI QR codes for cash-counter collections.

---

## 21. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 22. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
