# DIAMO ERP – PHASE 6.3
## CHALLAN BOOK – ITEM GRID, CALCULATION ENGINE & STOCK RESERVATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Item Grid, Calculation Engine, and Stock Reservation Engine of the Challan Book in DIAMO ERP. This specification outlines column structures, real-time inventory checks, calculation rules, and stock reservation states required to track physical diamond dispatches without transferring legal asset ownership.

---

## 2. Item Grid Architecture
The Challan Item Grid is a virtualized spreadsheet-style table:
*   **Widescreen Grid Control:** Supports key-driven cell navigation and updates.
*   **Action Bindings:** Allows row insertion, deletion, and duplication.
*   **State Buffering:** Recalculates available and reserved weights in real-time.

---

## 3. Column Specification

| Column Name | Type | Edit Rule | Validation Rules | Default | Business Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Row Number** | Simple ID | Read-Only | Sequential index starting at 1. | Auto | Identifies line sequence. |
| **Quality** | Dropdown | Editable | Must match active Quality Master. | None | References the diamond SKU. |
| **HSN Code** | Text | Read-Only | Auto-populated from Quality Master.| None | Tax classification code. |
| **Pieces** | Integer | Editable | Must be greater than zero. | 0 | Count of diamond stones. |
| **Carat** | Decimal | Editable | Must be greater than zero. | 0.000 | Carat weight of the lot. |
| **Rate** | Decimal | Editable | Must be non-negative. | 0.00 | Consignment rate per carat. |
| **Terms** | Text | Editable | Checked for character length. | None | Return or payment terms rules. |
| **Amount** | Decimal | Read-Only | Derived value. | 0.00 | Line-item value. |
| **GST %** | Decimal | Read-Only | Auto-populated from Master. | 0.00% | Reference tax rate. |
| **Available Stock**| Decimal | Read-Only | Derived value. | 0.000 | Available carats in warehouse. |

---

## 4. Quality Auto Fetch Logic
Selecting a diamond from the Quality dropdown triggers an auto-fetch sequence:
1.  **Grade Extraction:** Pulls Quality Name, Description, HSN code, Unit, and default rates.
2.  **Stock Fetch:** Queries the database to retrieve Current Available Stock and Reserved Stock.
3.  **Tax Resolution:** Loads active GST and Cess percentages from the database.

---

## 5. Stock Availability Logic
Renders a visual indicator in the grid showing stock availability:

| Ratio | Indicator | System Behavior |
| :--- | :--- | :--- |
| $\text{Carat Input} \le \text{Available Stock}$ | **Green** | Sufficient stock. |
| $\text{Carat Input} > \text{Available Stock}$ | **Red** | Insufficient stock. Blocks saving (requires override). |

---

## 6. Calculation Engine
*   **Amount Calculation:**
    $$\text{Amount} = \text{Carats} \times \text{Rate}$$
*   **Average Rate:**
    $$\text{Average Rate} = \frac{\text{Total Amount}}{\text{Total Carats}}$$

---

## 7. Total Summary Panel
Renders aggregate transaction metrics:
*   Total Pieces (sum of all line pieces).
*   Total Carats (sum of all line weights).
*   Gross Amount (sum of all line values).
*   Average Rate per carat.
*   Total Reserved Weight.

---

## 8. Stock Reservation Engine
The engine manages physical transfers without changing legal ownership:
*   **Ownership Check:** Inventory remains on the company balance sheet.
*   **Carat Allocation updates:**
    *   *Saving:* Moves entered carats from Available Stock to Reserved Stock.
    *   *Status:* Sets item state to "Out on Challan".
*   *Tracking:* Links dispatches to custodian IDs and original Challan numbers.

---

## 9. Challan Stock Status
The system tracks the status of each lot:
*   `Available`: In-house, ready for dispatch or sale.
*   `Reserved / Out on Challan`: Dispatched to a custodian, waiting for return or conversion.
*   `Returned`: Restocked to available warehouse inventory.
*   `Converted to Sale / Converted to Purchase`: Ownership transferred (removed from company ledger).
*   `Lost / Damaged`: Transferred to discrepancy vaults.

---

## 10. Validation Rules
*   **Mandatory Fields:** Quality must be selected.
*   **Positive Values:** Carats and Pieces must be greater than `0`.
*   **Stock Boundaries:** If the entered carat weight exceeds the available stock, the system blocks saving and displays an error message.

---

## 11. Business Rules
1.  **Direct Master Fetching:** All HSN codes, default rates, and tax parameters must pull directly from the Quality Master.
2.  **Reserved Constraints:** Reserved stock is locked and cannot be sold, transferred, or linked to another Challan.
3.  **Real-Time Stock Updates:** Stock statistics must update in real-time.

---

## 12. Keyboard Workflow
*   **Arrow Keys:** Navigate focus between active grid cells.
*   **Enter:** Commits cell value and moves focus to the next editable cell (or next row).
*   **Ctrl + Insert / Ctrl + Delete:** Appends or removes rows.
*   **Ctrl + D:** Duplicates the current row's parameters.

---

## 13. User Experience
*   **Buffered States:** Grid edits buffer local changes to prevent UI lag.
*   **Search Autocomplete:** F4 opens the Quality dropdown with fuzzy autocomplete.

---

## 14. Dependencies
*   **Quality Master:** Provides SKU grades, HSN codes, and base rates.
*   **Stock Ledger:** Records physical in-out movements.
*   **Audit Engine:** Captures snapshot histories.

---

## 15. Edge Cases
*   **Insufficient Stock Override:** If a user with override permissions saves a Challan with insufficient stock, the system allows saving but logs the override in the audit trail.
*   **Double-Booking Prevention:** If two users edit separate Challans for the same Quality ID, database locks resolve conflicts.

---

## 16. Future Enhancements
*   **RFID Dispatches:** Scan RFID tags to automatically populate item rows.
*   **Packet History tracking:** Double-click a row to open its complete dispatch and return history.

---

## 17. Architect Recommendations
1.  **Stock Isolation Indexing:** Index database tables on `(quality_id, status)` to support fast available-stock calculations.
2.  **Float Precision Management:** Enforce javascript decimal math libraries (such as `decimal.js`) in the calculation engine to prevent rounding issues.

---

## 18. Final Completion Checklist
*   [x] Document column specifications for the Challan grid.
*   [x] Map auto-fetch logic from the Quality Master.
*   [x] Define calculations, total panels, and average rates.
*   [x] Map the Stock Reservation Engine carat allocation rules.
*   [x] Document Challan stock statuses and validation rules.
