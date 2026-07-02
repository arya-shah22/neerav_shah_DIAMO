# DIAMO ERP – PHASE 4.1.3
## SALE BOOK – ITEM GRID & CALCULATION ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Item Grid and Calculation Engine of the Sale Book in DIAMO ERP. This specification outlines grid column attributes, formula rules, automatic calculation pipelines, tax routing logic (including exemptions for unregistered parties), and validation checks required to ensure real-time inventory and pricing accuracy during sales.

---

## 2. Item Grid Architecture
The Item Grid is a dynamic spreadsheet-style interface optimized for high-volume entry:
*   **Widescreen Grid Control:** Uses a virtualized scroll container supporting key-driven cell selection.
*   **Row Actions:** Supports row insertion, deletion, and copy/duplication operations.
*   **State Buffering:** Key changes recalculate row sums instantly before committing changes to the parent invoice state.

---

## 3. Column Specification

| Column Name | Type | Edit Rule | Validation Rules | Default | Business Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Row Number** | Integer | Read-Only | Sequential index starting at 1. | Auto | Identifies line sequence. |
| **Quality** | Dropdown | Editable | Must match active Quality Master. | None | References the diamond SKU. |
| **HSN** | Text | Read-Only | Auto-populated from Quality Master.| None | Harmonized tax classification code. |
| **Carat / Qty** | Decimal | Editable | Must be greater than zero. | 0.000 | Carat weight of the diamond lot. |
| **Rate** | Decimal | Editable | Must be non-negative. | 0.00 | Standard base rate per carat. |
| **Less %** | Decimal | Editable | Value range: 0.00 to 99.99. | 0.00 | Negotiated customer discount rate. |
| **Terms Rate** | Decimal | Read-Only | Derived value. | 0.00 | Net rate per carat after discount. |
| **Gross Amount**| Decimal | Read-Only | Derived value. | 0.00 | Line-item value before tax. |
| **GST %** | Decimal | Read-Only | Derived value (Zero if Unregistered).| 0.00% | Applicable tax rate. |
| **Net Amount** | Decimal | Read-Only | Derived value. | 0.00 | Line total including taxes. |

---

## 4. Quality Auto Fetch Logic
Selecting a diamond from the Quality dropdown triggers an auto-fetch sequence:
1.  **Grade Extraction:** Pulls Quality Name, HSN code, Unit, and UQC settings.
2.  **Base Rate Resolution:** Loads default Purchase/Sale rates from the Master.
3.  **Tax Rate Resolution:** Loads active GST and Cess percentages from the database.
    *   *Unregistered Exception:* If the selected Customer profile has a GST status of "Unregistered", the GST and Cess columns are automatically forced to `0.00%`, overriding the master tax rates.

---

## 5. Rate Behaviour
*   **Base Rate Loading:** Populates default selling rates from the Quality Master.
*   **Manual Overrides:** Users with the `override_invoice_rates` permission can edit base rates. Editing triggers an audit log storing the original rate, modified rate, and user ID.
*   **Formula Resolution:** If the selected item has an active Rate Formula (e.g., `Sale Rate = Purchase Rate * 1.15`), the system computes the rate dynamically.

---

## 6. Calculation Engine
The calculation engine operates reactively in the frontend. Any modification to a value (such as Carats, Rates, or Discounts) triggers recalculations across the active row and the bottom totals panel.

---

## 7. Formula Definitions
The engine uses the following mathematical formulations:

*   **Terms Rate:**
    $$\text{Terms Rate} = \text{Rate} - \left(\text{Rate} \times \frac{\text{Less \%}}{100}\right)$$
*   **Gross Amount:**
    $$\text{Gross Amount} = \text{Carats} \times \text{Terms Rate}$$
*   **Brokerage Amount:**
    $$\text{Brokerage Amount} = \text{Gross Amount} \times \frac{\text{Brokerage \%}}{100}$$
*   **GST Amount:**
    *   *If Party is Registered:*
        $$\text{GST Amount} = \text{Gross Amount} \times \frac{\text{GST \%}}{100}$$
    *   *If Party is Unregistered:*
        $$\text{GST Amount} = 0.00$$
*   **Net Amount:**
    $$\text{Net Amount} = \text{Gross Amount} + \text{GST Amount} + \text{Cess Amount} \pm \text{Round Off}$$
*   **Outstanding:**
    $$\text{Outstanding} = \text{Net Amount} - \text{Jama (Receipt Amount)}$$

---

## 8. Total Panel
The bottom totals card displays aggregate metrics:
*   **Weight Metrics:** Total Carats (sum of all line weights).
*   **Financial Aggregates:** Total Gross Amount, Total Discount, Total Brokerage.
*   **Tax Aggregates:** Total CGST, SGST, IGST, and Cess.
*   **Invoice Summary:** Net Amount, Cash Receipt (Jama), and Net Outstanding.

---

## 9. Validation Rules
*   **Weight Check:** Carat values must be greater than `0.000`.
*   **Rate Limits:** Sales Rates cannot be negative.
*   **Exceeding Margins:** Warn the user if the Sales Rate falls below the cost basis in the Quality Master.
*   **Duplicate Quality Row:** Allowed, but triggers a system confirmation message asking to merge rows or keep them separate.

---

## 10. Business Rules
1.  **Enforce Stock Limits:** Sales weight cannot exceed available warehouse stock carats unless the company configuration allows negative inventory.
2.  **GST Status Rule:** The GST engine must reference the customer's active GSTIN profile. If the party is Unregistered, GST is bypassed and set to `0.00` across all items.
3.  **Read-Only Calculations:** Columns representing formulas (Gross, GST Amount, Net Amount) are locked for direct manual input.

---

## 11. Keyboard Workflow
*   **Arrow Keys:** Navigate focus between active grid cells.
*   **Enter:** Commits cell value and moves focus to the next editable cell (or next row).
*   **Ctrl + Insert:** Appends a blank row to the bottom of the grid.
*   **Ctrl + Delete:** Removes the currently selected row.
*   **Ctrl + D:** Duplicates the current row's parameters.
*   **Ctrl + A:** Opens the Quality Master popup if focused on the Quality selector.

---

## 12. User Experience
*   **Buffered State Updates:** Cell inputs buffer keyboard values locally, preventing UI lag.
*   **High-Contrast Warnings:** Cells violating stock checks (e.g., negative stock warnings) are highlighted with a thin Amber border.

---

## 13. Dependencies
*   **Quality Master:** Houses HSN, UQC, default rates, and tax rules.
*   **Account Master:** Provides the customer's GST status.
*   **Broker Master:** Provides default brokerage rates.

---

## 14. Edge Cases
*   **Changing Customer Status Mid-Entry:** Swapping a customer from Registered to Unregistered after entering items re-triggers the calculation engine to strip all GST amounts from the item grid.
*   **Zero Rate Transactions:** Allowed for sample stones or promotional items (prompts for confirmation before saving).

---

## 15. Future Enhancements
*   **Barcode Scanning:** Focus the barcode command palette to append rows automatically using scan inputs.
*   **AI Price Predictor:** Auto-suggests sales discounts based on party history.

---

## 16. Architect Recommendations
1.  **Row Deletion Safety:** Keep a copy of deleted line items in the React component state memory to support "Undo" (`Ctrl + Z`) operations.
2.  **Float Precision Management:** Enforce javascript decimal math libraries (such as `decimal.js`) in the calculation engine to prevent rounding issues common with standard floats.

---

## 17. Final Completion Checklist
*   [x] Document layout, columns, and properties of the Sale Book Item Grid.
*   [x] Map auto-fetch logic from the Quality Master.
*   [x] Define calculations, taxes, round-offs, and outstanding balances.
*   [x] Integrate GST bypass logic for unregistered customers.
*   [x] Specify grid keyboard shortcuts and validation parameters.
