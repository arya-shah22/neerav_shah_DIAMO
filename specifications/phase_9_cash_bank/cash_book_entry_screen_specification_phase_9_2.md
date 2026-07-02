# DIAMO ERP – PHASE 9.2
## CASH BOOK – CASH TRANSACTION ENTRY SCREEN SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Cash Book Entry Screen of DIAMO ERP. This module merges cash payment and cash receipt operations into a single unified transaction interface. It details field layouts, allocation math, keyboard shortcuts, and validations.

---

## 2. Page Overview
The Cash Book screen provides a single entry layout:
*   **Dual-State UI:** Selecting `Cash Payment` or `Cash Receipt` dynamically switches transaction logic and database write paths.
*   **Fast Data Entry Layout:** Features a single column for ledger details, cash balance counters, and reference bill lists.

---

## 3. Header
Tracks voucher metadata:
*   **Company / Financial Year:** Active tenant context.
*   **Transaction Type:** Toggle selector (`Cash Payment` / `Cash Receipt`).
*   **Cash Account:** Selects active currency accounts (e.g., Office Cash).
*   **Voucher Date:** Transaction posting date.
*   **Voucher Number:** Manual field for office voucher registration.

---

## 4. Transaction Type
Changing the Transaction Type updates:
*   **Ledger Postings:** Switches cash accounts from debit to credit balances.
*   **Party Invoices:** Filters invoices by type (payments display purchase bills; receipts display sale bills).

---

## 5. Party Selection
*   **Party Select Lookups:** Search field to select accounts from the Account Master (Customer, Supplier, Broker, Expense, Employee).

---

## 6. Auto Fetch
Selecting a party populates:
*   Address, PAN, mobile number, outstanding balance, credit limit, and account status.

---

## 7. Reference Bill
*   **Invoice Linkages:** The entry links to a source document: Sale Invoice, Purchase Invoice, Sales Return, Purchase Return, or Job Book ID.

---

## 8. Outstanding Bill Popup
Clicking the reference bill search opens a lookup grid:
*   **Grid Columns:** Invoice ID, Bill Date, Type, Original Value, Paid Value, Pending Outstanding Balance, Due Date.
*   *Allocation Types:* Supports single bill allocations, multi-bill splits, partial payments, and automatic allocation (allocates payments to the oldest bills first).

---

## 9. Payment Allocation
Manages invoice balances:
*   **Formula:**
    $$\text{Outstanding After} = \text{Outstanding Before} - \text{Transaction Amount}$$
    If the transaction amount exceeds outstanding values, the variance is logged as an advance payment.

---

## 10. Manual Voucher Number
*   **Manual Entry:** Features a manual voucher input field to link entries to physical paper slips, manual receipts, or internal reference books.

---

## 11. Transaction Details
*   **Voucher Parameters:** Amount (numeric value), Narration, Internal Remarks, and audit stamps.

---

## 12. Removed Fields
The following fields from the old software are excluded:
*   `SGST`, `CGST`, `IGST`, `RCM` (taxes are managed in invoice books).
*   `Cheque Number`, `Bank Name` (bank parameters are managed in bank books).

---

## 13. Auto Calculations
Calculates totals in real-time:
*   **Formula:**
    $$\text{Cash Balance After} = \text{Cash Balance Before} \pm \text{Voucher Amount}$$

---

## 14. Recent Transactions
*   **Panel:** Renders a list of the 10 most recent cash vouchers on the right side of the screen.
*   *Interaction:* Double-clicking a row opens the voucher in View/Edit mode.

---

## 15. Keyboard Shortcuts
Enforces fast data entry workflows:
*   `Ctrl + N`: New Voucher.
*   `Ctrl + S`: Save Transaction.
*   `Ctrl + L`: Open Listing Grid.
*   `Ctrl + P`: Print Slip.
*   `Esc`: Cancel Edit.

---

## 16. Validation
*   **Balance Validation:** If a payment reduces cash below `0.00`, the system blocks saving or displays warnings based on company policy.
*   **Status Check:** Blocks changes to posted or locked vouchers.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Posted Cash Books:** Adjustments require posting a Reversal Voucher.
3.  **Cross-Party Allocation Check:** Users cannot allocate cash allocations to bills belonging to other parties.

---

## 18. UI/UX Recommendations
*   Optimize the interface for keyboard navigation, allowing users to move between fields using the `Enter` key.

---

## 19. List Page
Displays cash adjustments:
*   *Columns:* Voucher Number, Date, Transaction Type, Party Name, Amount, status (Draft/Posted/Reversed), and User.

---

## 20. Search
Supports filters for: Voucher Number, Party Name, Reference Bill, Amount, Narration, and Date.

---

## 21. Filters
Provides filters for: Cash Payment, Cash Receipt, Today, Yesterday, This Month, and Amount Range.

---

## 22. Printing
Generates print templates for:
*   *Cash Receipt/Payment Voucher:* Renders company logo, party details, narration, manual voucher number, and signature blocks.

---

## 23. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 24. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
