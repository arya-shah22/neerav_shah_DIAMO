# DIAMO ERP – PHASE 10.2
## BANK BOOK – UNIFIED BANK TRANSACTION ENTRY SCREEN SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Unified Bank Transaction Entry Screen of DIAMO ERP. This module implements a single, unified entry screen for both bank payments and receipts, dynamically adjusting its validation models, ledger posting paths, and outstanding allocation behaviors based on the selected transaction state.

---

## 2. Page Overview
*   **Module Path:** Transactions $\rightarrow$ Bank Book $\rightarrow$ Unified Entry Screen.
*   **Interface Layout:** Features a split-pane layout. The left pane contains the transaction input fields, while the right pane displays party outstanding details and the recent transactions grid.

---

## 3. Header
Tracks voucher session metadata:
*   **Company / Financial Year:** Active tenant context.
*   **Transaction Type:** Toggle selector (`Bank Payment` / `Bank Receipt`).
*   **Bank Account:** Selects active bank ledgers (Account Group = Bank).
*   **Voucher Date:** Transaction posting date.
*   **Voucher Number:** Manual field for bank deposit slip/advice registration.

---

## 4. Transaction Type
*   **State Switching:** Changing the transaction type selector dynamically alters the database write target, ledger routing paths, and outstanding invoice lookup behaviors.

---

## 5. Bank Account
*   **Lookup Scope:** Dropdown list populated from the Account Master where the account group is `Bank`. Auto-populates branch details, masked account numbers, and current balances.

---

## 6. Party Selection
*   **Party Scope:** Dropdown field supporting lookup of Customers, Suppliers, Brokers, Employees, and Income/Expense Accounts.

---

## 7. Auto Fetch
Selecting a Party automatically fetches and displays:
*   Party Address, GSTIN, PAN, Phone Number, Current Outstanding Balance, and Credit Limit details.

---

## 8. Reference Bill
*   **Bill Linkages:** The entry links to a source document: Sale Invoice, Purchase Invoice, Sales Return, Purchase Return, or Job Book ID.

---

## 9. Outstanding Bill Popup
*   **Allocation Grid:** Triggers a popup displaying the selected party's outstanding bills.
*   **Display Columns:** Bill Number, Date, Invoice Value, Allocated Amount, and Net Outstanding Balance.

---

## 10. Payment Allocation
*   **Allocation Rules:** Supports full settlement, partial allocations across multiple bills, and advance collections/payments.

---

## 11. Manual Voucher Number
*   **Internal Linkage:** Provides a manual input field to record cheque numbers, electronic deposit slips, or bank advice IDs.

---

## 12. Payment Modes
*   **Modes:** Cheque, NEFT, RTGS, IMPS, UPI, Bank Transfer, Demand Draft, Cash Deposit.
*   **Dynamic Fields:**
    *   *Cheque:* Cheque Number, Cheque Date, Bank Branch.
    *   *Electronic:* UTR Number, Reference Date.

---

## 13. Transaction Details
*   **Inputs:** Amount, Remark 1, Remark 2, Remark 3, Internal Narration, and Audit Narration (system-generated).

---

## 14. Removed Fields
*   **Exclusions:** Excludes SGST, CGST, IGST, and RCM fields, as tax calculations are handled within the source invoice modules (Sales, Purchases, Job Books).

---

## 15. Auto Calculations
Calculates values in real-time:
*   **Formulas:**
    $$\text{Outstanding After} = \text{Outstanding Before} - \text{Voucher Value}$$
    $$\text{Bank Balance After} = \text{Bank Balance Before} \pm \text{Voucher Value}$$

---

## 16. Recent Transactions
*   **Sidebar Panel:** Displays the 10 most recent bank vouchers.
*   *Interaction:* Double-clicking a transaction details row loads that voucher for view or edit.

---

## 17. Keyboard Shortcuts
*   `Ctrl + N`: New Entry
*   `Ctrl + S`: Save Voucher
*   `Ctrl + L`: Open List Page
*   `Ctrl + P`: Print Slip
*   `Ctrl + F`: Search Field
*   `Esc`: Cancel / Clear Form
*   `Enter`: Focus Next Field

---

## 18. Validation
*   **Voucher Integrity:** Checks for duplicate manual voucher numbers or UTR references.
*   **Period Lock:** Postings must fall within the active financial year and after the lock date.
*   **Amount Check:** Voucher amounts must be greater than `0.00`.

---

## 19. Business Rules
1.  **Direct Allocation Rule:** Receipts and payments must adjust outstanding invoices first before recording advances.
2.  **No Edits on Posted Bank Books:** Adjustments require posting a Reversal Voucher.
3.  **Cross-Party Allocation Check:** Users cannot allocate bank allocations to bills belonging to other parties.

---

## 20. UI/UX Recommendations
*   **Data Entry Focus:** Designed for keyboard-first navigation with minimal mouse interaction.
*   **Responsiveness:** Fluid grid layout optimized for desktop resolutions (1920x1080).

---

## 21. List Page
*   **Features:** Grid listing with support for search, sorting, grouping, bulk printing, and Excel/PDF exporting.

---

## 22. Search
Supports filters for: Voucher Number, Party Name, Reference Bill, Amount, Narration, and Date.

---

## 23. Filters
Provides filters for: Bank Payment, Bank Receipt, Today, Yesterday, This Month, and Amount Range.

---

## 24. Printing
Generates print templates for:
*   *Office Voucher copy:* Standard receipt slip format containing transaction values, allocation tables, and audit details.

---

## 25. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 26. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
