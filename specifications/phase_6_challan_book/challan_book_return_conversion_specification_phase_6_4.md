# DIAMO ERP – PHASE 6.4
## CHALLAN BOOK – RETURN, CONVERSION & INVENTORY MOVEMENT ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Return Engine, Conversion Engine, and Inventory Movement Engine of the Challan Book in DIAMO ERP. This specification outlines post-dispatch workflows, tracking mechanisms for returned or damaged goods, conversions to Sales/Purchases, automated status updates, and audit trail captures.

---

## 2. Return Types
The return engine processes incoming dispatches under these categories:
*   **Full Return:** Restocks all issued carats to Available Stock.
*   **Partial Return:** Restocks returned carats while keeping the remaining balance in "Pending" status.
*   **Damaged Return:** Restocks items to discrepancy or repair vaults rather than the primary warehouse.
*   **Lost Goods:** Reverses stock balances and flags items as write-offs.
*   **Replacement / Exchange:** Replaces or swaps items under a linked transaction.
*   **Conversion:** Transfers item ownership to final Sales/Purchases.

---

## 3. Full Return Workflow
The full return workflow executes these steps:
1.  **Select Active Challan:** Select an active Challan in `Pending` status.
2.  **Verify Quantity:** Verifies returned carat weights match the original dispatch.
3.  **Stock Ledger Update:** Logs a positive carat update on the stock ledger.
4.  **Stock Adjustments:** Removes dispatches from Reserved Stock and adds them back to Available Stock:
    $$\text{New Available Stock} = \text{Current Available Stock} + \text{Returned Weight}$$
    $$\text{New Reserved Stock} = \text{Current Reserved Stock} - \text{Returned Weight}$$
5.  **Status Update:** Challan status changes to `Returned` or `Closed`.

---

## 4. Partial Return Workflow
Tracks split consignments:
*   *Action:* Custodian returns a portion of the packet carats.
*   *Carat Management:* Deducts the returned carat weight from Reserved Stock and adds it to Available Stock, leaving the remainder in Reserved Stock:
    $$\text{Pending Weight} = \text{Original Issued Weight} - \text{Cumulative Returned Weight}$$
*   *Status:* Challan status changes to `Partial Return`, remaining in `Pending` status.

---

## 5. Damaged Return
*   **Inventory Vault Transfer:** Diverts damaged diamonds from active warehouses to the "Repair Vault" (isolated from available stock calculations).
*   **Quality Flag:** Marks the lot with a "Damaged" status flag in the Quality registry.
*   **Approval:** Saving a damaged return requires authorization from an Inventory Manager.

---

## 6. Lost Goods
Handles missing dispatches:
*   **Write-off Update:** Deducts the lost carat weight from Reserved Stock.
*   **Accounting Registry:** Logs the loss under a "Stock Loss Adjustment" ledger (requires manager authorization and insurance references).
*   **Liability:** Records whether the loss liability falls on the customer, broker, or transport carrier.

---

## 7. Replacement
*   **Workflow:** Custodian returns a diamond parcel, and the system issues a replacement of equivalent grade under a new Challan.
*   **History Link:** Links the original Challan ID and the replacement Challan ID to maintain history.

---

## 8. Exchange
*   **Workflow:** Custodian returns a diamond parcel and receives a parcel of a different quality or value.
*   **Calculations:** Adjusts stock ledgers for both items. The exchange value difference is recorded under a linked journal entry.

---

## 9. Convert to Sale
This process transfers item ownership:
1.  **Voucher Selection:** User links a pending Jhanghad Challan within the Sale Book form.
2.  **Party Mapping:** Auto-populates Customer, Broker, terms, and item lines.
3.  **Billing Generation:** Generates a Sale Invoice.
4.  **Stock Deduction:** Converts reserved carats into final sales stock deductions:
    $$\text{Reserved Stock} = \text{Current Reserved Stock} - \text{Converted Weight}$$
    $$\text{Net Inventory} = \text{Total Warehouse Inventory} - \text{Converted Weight}$$
5.  **Status Update:** The parent Challan status changes to `Converted to Sale` and is closed.

---

## 10. Convert to Purchase
Used for returnable purchase dispatches:
*   **Workflow:** Converted Challans populate the Purchase Book entry form.
*   **Stock Ledger:** Deducts carats from Reserved Stock and updates cost ledger accounts.

---

## 11. Convert to Job Work
*   **Workflow:** Links dispatches to job cards, moving items from the "Outward Challan Vault" to the "Job Work Vault".
*   **Close:** The Challan is closed once the job card returns.

---

## 12. Status Engine
Transitions are triggered automatically based on transactions:

| Current Status | Trigger Event | Target Status |
| :--- | :--- | :--- |
| `Issued` | Delivery confirmation | `Pending` |
| `Pending` | Partial return saved | `Partial Return` |
| `Pending` / `Partial Return` | Remaining balance returned | `Returned` |
| `Pending` / `Partial Return` | Linked Sale Invoice saved | `Converted to Sale` |
| `Pending` | Void voucher saved | `Cancelled` |

---

## 13. Inventory Movement
Handles location transfers:
*   *Issue:* Available Stock $\rightarrow$ Reserved Stock (Out on Challan).
*   *Return:* Reserved Stock $\rightarrow$ Available Stock.
*   *Conversion:* Reserved Stock $\rightarrow$ Deducted/Sold.
*   *Lost:* Reserved Stock $\rightarrow$ Write-off.

---

## 14. Ledger Impact
*   **Sale Conversion:** Records a customer ledger debit, sales credit, and GST liability.
*   **Purchase Conversion:** Records a supplier ledger credit and purchase debit.
*   **Consignments (Pending/Returned):** No financial ledger impact.

---

## 15. Report Impact
Saving updates to a Challan updates:
*   *Registers:* Pending Challans List, Converted Challans List, Stock Ledger.
*   *History:* Customer Consignment History and Broker Commision Logs.

---

## 16. Validation Rules
*   **Over-Return Guard:** Returned carat weights cannot exceed the original issued weight.
*   **Status Check:** Block conversions for cancelled or deleted Challans.
*   **Double-Conversion Prevention:** Block conversions for already converted lines.

---

## 17. Business Rules
1.  **Single Status:** A Challan line can have only one final status (Returned or Converted).
2.  **Locked Converted Lines:** Converted Challans are locked against edits or deletions.
3.  **Manager Overrides:** Lost or damaged returns require manager approval.

---

## 18. Permissions
Access is regulated by the following flags:
*   `return_challan` / `convert_challan_to_sale`
*   `approve_damaged_returns` / `approve_lost_adjustments`

---

## 19. Audit
Logs all status changes:
*   Captures transaction type (Return, Conversion, Lost).
*   Logs before and after JSON snapshots, user IDs, and workstation codes.

---

## 20. Notifications
*   **Toast Notifications:** Alerts users upon saving returns ("Return processed successfully. Stock updated.").
*   **Approval Alerts:** Prompts managers to authorize write-offs or damaged entries.

---

## 21. Edge Cases
*   **Concurrent Editing Conflict:** If a user attempts to save a return while another user converts the same Challan, the system blocks the second operation and displays an error message.
*   **Database Rollback:** If a stock update or status transition fails, the database rolls back to prevent inventory mismatches.

---

## 22. User Experience
*   **Status Timeline:** Renders a progress bar showing:
    `Draft -> Issued -> Pending -> Partially Returned -> Converted`
*   **Wizard Helper:** A wizard guides operators through partial return weight entries.

---

## 23. Future Enhancements
*   **Barcode Returns:** Scan lot tags to automatically resolve Challan IDs and populate the return grid.
*   **Digital Signatures:** Capture recipient signatures on mobile apps to confirm dispatches.

---

## 24. Architect Recommendations
1.  **Accumulator Checks:** Implement database functions to check cumulative returned weights before saving new returns.
2.  **Unified Transaction Scope:** Wrap inventory restocks and status transitions in a single database transaction block.

---

## 25. Final Completion Checklist
*   [x] Document return types and workflow transitions.
*   [x] Map the Convert to Sale, Purchase, and Job Work pipelines.
*   [x] Define the automated Status Engine rules.
*   [x] Map the inventory available-vs-reserved location transfers.
*   [x] Document validation rules, permissions, and edge cases.
