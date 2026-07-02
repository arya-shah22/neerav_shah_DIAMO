# DIAMO ERP – PHASE 5.1.3
## PURCHASE BOOK – ITEM GRID & CALCULATION ENGINE SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Item Grid and Calculation Engine of the Purchase Book in DIAMO ERP. This specification outlines grid column attributes, formula rules, automatic calculation pipelines, rate behaviors, and validation checks required to ensure real-time inventory and pricing accuracy during purchasing.

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
| **Row Number** | Simple ID | Read-Only | Sequential index starting at 1. | Auto | Identifies line sequence. |
| **Quality** | Dropdown | Editable | Must match active Quality Master. | None | References the diamond SKU. |
| **HSN Code** | Text | Read-Only | Auto-populated from Quality Master.| None | Harmonized tax classification code. |
| **Item Code** | Text | Read-Only | Auto-populated from Quality Master.| None | Short SKU reference code. |
| **Carat / Qty** | Decimal | Editable | Must be greater than zero. | 0.000 | Carat weight of the diamond lot. |
| **Purchase Rate**| Decimal | Editable | Must be non-negative. | 0.00 | Standard base rate per carat. |
| **Less %** | Decimal | Editable | Value range: 0.00 to 99.99. | 0.00 | Negotiated supplier discount rate. |
| **Terms Rate** | Decimal | Read-Only | Derived value. | 0.00 | Net rate per carat after discount. |
| **Gross Amount**| Decimal | Read-Only | Derived value. | 0.00 | Line-item value before tax. |
| **GST %** | Decimal | Read-Only | Derived value from Master. | 0.00% | Applicable tax rate. |
| **Net Amount** | Decimal | Read-Only | Derived value. | 0.00 | Line total including taxes. |

---

## 4. Quality Auto Fetch Logic
Selecting a diamond from the Quality dropdown triggers an auto-fetch sequence:
1.  **Grade Extraction:** Pulls Quality Name, HSN code, Item Code, Unit, and UQC settings.
2.  **Base Rate Resolution:** Loads default Purchase rates from the Master.
3.  **Tax Rate Resolution:** Loads active GST and Cess percentages from the database.
    *   *Unregistered Exception:* If the selected Supplier profile has a GST status of "Unregistered", the GST and Cess columns are automatically forced to `0.00%`, overriding the master tax rates.

---

## 5. Purchase Rate Behaviour
*   **Base Rate Loading:** Populates default purchasing rates from the Quality Master.
*   **Manual Overrides:** Users with the `override_purchase_rates` permission can edit base rates. Editing triggers an audit log storing the original rate, modified rate, and user ID.
*   **Future Tracking:** The engine supports linking default rates to a Supplier Price List or referencing the latest and average purchase price calculations.

---

## 6. Calculation Engine
The calculation engine operates reactively in the frontend. Any modification to a value (such as Carats, Rates, or Discounts) triggers recalculations across the active row and the bottom totals panel.

---

## 7. Formula Definitions
The engine uses the following mathematical formulations:

*   **Terms Rate:**
    $$\text{Terms Rate} = \text{Purchase Rate} - \left(\text{Purchase Rate} \times \frac{\text{Less \%}}{100}\right)$$
*   **Gross Amount:**
    $$\text{Gross Amount} = \text{Carats} \times \text{Terms Rate}$$
*   **Brokerage Amount:**
    $$\text{Brokerage Amount} = \text{Gross Amount} \times \frac{\text{Brokerage \%}}{100}$$
*   **GST Amount:**
    *   *If Supplier is Registered:*
        $$\text{GST Amount} = \text{Gross Amount} \times \frac{\text{GST \%}}{100}$$
    *   *If Supplier is Unregistered:*
        $$\text{GST Amount} = 0.00$$
*   **Net Amount:**
    $$\text{Net Amount} = \text{Gross Amount} + \text{GST Amount} + \text{Cess Amount} \pm \text{Round Off}$$
*   **Balance Due:**
    $$\text{Balance Due} = \text{Net Amount} - \text{Amount Paid}$$

---

## 8. Total Panel
The bottom totals card displays aggregate metrics:
*   **Weight Metrics:** Total Carats (sum of all line weights).
*   **Financial Aggregates:** Total Gross Amount, Total Discount, Total Brokerage.
*   **Tax Aggregates:** Total CGST, SGST, IGST, and Cess.
*   **Invoice Summary:** Net Amount, Amount Paid (immediate payment outlays), and Balance Due.

---

## 9. Validation Rules
*   **Weight Check:** Carat values must be greater than `0.000`.
*   **Rate Limits:** Purchase Rates cannot be negative.
*   **Exceeding Margins:** Warn the user if the Purchase Rate exceeds historical averages.
*   **Duplicate Quality Row:** Allowed on purchase transactions to accommodate separate packets of the same grade.

---

## 10. Business Rules
1.  **Direct Master Association:** All item HSN codes and base rates must default from the Quality Master.
2.  **GST Status Rule:** The GST engine must reference the supplier's active GSTIN profile. If the party is Unregistered, GST is bypassed and set to `0.00` across all items.
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
*   **Row Reordering:** Supports drag-and-drop row handles to rearrange lines for print matching.

---

## 13. Dependencies
*   **Quality Master:** Houses HSN, Item Code, default rates, and tax rules.
*   **Account Master:** Provides the supplier's GST status.
*   **Broker Master:** Provides default brokerage rates.

---

## 14. Edge Cases
*   **Supplier Rate Variation:** If the supplier's invoice rate differs from the local master rate, the purchase operator edits the rate field. This change triggers an alert in the system but allows the save to proceed.
*   **Zero Rate Transactions:** Allowed for sample stones or promotional items (prompts for confirmation before saving).

---

## 15. Future Enhancements
*   **Barcode Scanning:** Focus the barcode command palette to append rows automatically using scan inputs.
*   **Supplier Price Comparison:** Display historical cost comparison metrics for the selected item grade across different vendors.

---

## 16. Architect Recommendations
1.  **Prisma Version Validation:** Enforce Prisma version flags on Quality inventory records to prevent concurrent stock adjustments from colliding during high-frequency posting hours.
2.  **Float Precision Management:** Enforce javascript decimal math libraries (such as `decimal.js`) in the calculation engine to prevent rounding issues common with standard floats.

---

## 17. Final Completion Checklist
*   [x] Document layout, columns, and properties of the Purchase Book Item Grid.
*   [x] Map auto-fetch logic from the Quality Master.
*   [x] Define calculations, taxes, round-offs, and balances due.
*   [x] Integrate GST bypass logic for unregistered suppliers.
*   [x] Specify grid keyboard shortcuts and validation parameters.
