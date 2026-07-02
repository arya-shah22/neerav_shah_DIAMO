# DIAMO ERP – PHASE 2 PART 3.6
## QUALITY MASTER – ENTERPRISE FUNCTIONAL SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Quality Master module in DIAMO ERP. The Quality Master establishes the system-wide catalog of diamond stock identities, mapping grading profiles (color, clarity, cut), HSN codes, default units (UQC), batch codes, tax matrices (GST/Cess), and stock thresholds. It acts as the core registry for physical stock valuation, sales margins, and manufacturing yield calculations.

---

## 2. Business Purpose
In diamond operations, "Quality" defines the physical properties that govern valuation:
*   **Stock Identity Differentiation:** Distinguishes varying diamond grades (e.g., Round 0.50ct VS1 F vs. Round 0.50ct VVS2 G) that command distinct price profiles.
*   **Compliance Classification:** Maps items to standard HSN codes and UQC codes required for GST billing.
*   **Price Standardization:** Houses default pricing policies (MRP, Purchase Rate, Sales Margin formulas) to speed up invoice creation.
*   **Re-assortment Reference:** Provides standard targets during the sorting and mixing of polished lots.

---

## 3. Business Importance
*   **Stock Ledger Core:** Every incoming purchase lot and outgoing sales invoice references a Quality Master ID to record stock movements.
*   **Valuation Accuracy:** Serves as the source for generating current inventory valuation reports.
*   **Production Analysis:** Tracks expected yield versus actual polished output quality in manufacturing lines.

---

## 4. Page Overview
*   **Primary Objective:** Provide a fast, keyboard-driven UI to configure and manage quality catalog entries.
*   **Secondary Objectives:** Validate HSN structures, maintain GST tax history logs, and enforce safety stock warning levels.
*   **Success Criteria:** Zero duplicate stock profiles, automated price computation on invoice entry, and low-latency inventory lookups.

---

## 5. Users & Permissions

| Role | Permissions | Operation Scope |
| :--- | :--- | :--- |
| **Owner / Executive** | View, Export | Reviewing stock valuations, pricing rules, and catalog ranges. |
| **Administrator** | Full Access | Creating/editing catalog entries, adjusting cost formulas, overrides. |
| **Inventory Controller**| Full Access | Stock adjustments, batch creations, catalog management. |
| **Sales Department** | Read-Only | Searching stock profiles and default pricing during quotes. |
| **Purchase Department**| View, Edit | Verifying HSN codes and assigning opening stock rates. |
| **Auditor** | View, Export | Reconciling tax codes and stock balances. |

---

## 6. Navigation
*   **Module:** Masters
*   **Sub-Module:** Diamond Masters
*   **Breadcrumb Path:** `Masters / Diamond Masters / Quality Master`
*   **Target Page URI:** `/masters/diamond/qualities`

---

## 7. Existing Screen Review
The screen uses a comprehensive layout:
*   **Details Panel (Left):** Split into logical sections: General Information, Inventory Details, Pricing, GST Details, Stock Controls, Status.
*   **History Grid (Bottom):** Displays a history grid showing GST tax rate changes and historical formula structures.
*   **Grid Panel (Right):** Multi-column grid containing the active catalog, enabling rapid filters.
*   **Action Buttons (Toolbar):** Add, Delete, Save, List, Import Quality.

---

## 8. Field Review

| Field Name | Type | Required? | Validation Rules | Default | Business Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Quality** | Text | Yes | Unique name. Max 100 chars. | None | Primary grading/item identifier. |
| **Item Code** | Text | Yes | Unique code. Max 30 chars. | None | Short SKU prefix for barcodes. |
| **HSN Number** | Text | Yes | 8-digit numeric code. | None | Harmonized System of Nomenclature code. |
| **UQC** | Dropdown | Yes | Choice of: CTS (Carats), PCS (Pieces). | CTS | Standard Unit Quantity Code for GST. |
| **Purchase Rate** | Decimal | Yes | Non-negative numeric value. | 0.00 | Default benchmark cost per carat. |
| **Sale Rate** | Decimal | Yes | Non-negative numeric value. | 0.00 | Standard selling rate per carat. |
| **Min Level** | Decimal | Optional | Cannot exceed Max Level. | 0.00 | Warning threshold for low stock. |
| **Max Level** | Decimal | Optional | Cannot be lower than Min Level. | 0.00 | Warning threshold for over-stocking. |
| **Active Status** | Dropdown | Yes | Active, Inactive, Locked. | Active | Controls transactional selection. |

---

## 9. Business Rules
1.  **Unique Catalog Entries:** Quality names and Item Codes must be unique.
2.  **No Deletion with History:** A Quality profile cannot be deleted if referenced in any transaction logs or stock movements.
3.  **Active Selector Constraint:** Inactive items are excluded from purchase and sales search menus.
4.  **GST Tax History Consistency:** Historical GST rate edits are locked if they belong to a closed financial year.

---

## 10. Stock Management Logic
*   **Opening Balance:** Entered upon company initialization. Updates the starting stock balance.
*   **Current Stock Formulation:**
    $$\text{Current Stock} = \text{Opening Bal} + \sum(\text{Purchases}) + \sum(\text{Sales Returns}) - \sum(\text{Sales}) - \sum(\text{Purchase Returns}) \pm \sum(\text{Adjustments})$$
*   **Negative Stock Guard:** The system blocks invoicing if the transaction weight exceeds the available Current Stock weight.
*   **Stock Level Alerts:** Dashboard alerts trigger when Current Stock falls below the configured Minimum Level.

---

## 11. Pricing Logic
*   **Rate Formula:** Supports relative rate calculations (e.g., `Sale Rate = Purchase Rate * 1.15`).
*   **MRP:** Represents the maximum retail price printed on labels for retail transactions.
*   **Price Revision:** Editing purchase or sales rates updates default inputs in subsequent transaction forms without altering historical invoices.

---

## 12. GST Configuration
*   **Cess & GST %:** Configured per Quality item to match government tax slabs.
*   **GST Apply Date:** Establishes the date when a tax rate change becomes active.
*   **History Grid:** Tracks historical rate modifications. The transaction engine selects the GST rate by matching the invoice date against the GST Apply Date windows.

---

## 13. Validation Rules
*   **HSN Format:** Enforce 8-digit numeric constraints.
*   **Stock Tolerances:** Carat weights are validated up to 3 decimal places.
*   **Limit Range:** Enforce: $0.00 \leq \text{Min Level} \leq \text{Max Level}$.

---

## 14. Dependencies
*   **Transactions (Sales/Purchase):** Invoices pull HSN codes, default rates, and tax metrics from the Quality Master.
*   **Stock Ledger:** Transactions update stock columns mapped directly to the Quality record.

---

## 15. Transaction Impact
*   **Purchase Book:** Records incoming lot weights, updating the Quality item's Current Stock and average cost.
*   **Sales Book:** Records outgoing carat weights, verifying negative stock controls.

---

## 16. Report Usage
*   **Stock Valuation Report:** Computes total on-hand value grouped by Quality item and average cost.
*   **Slow Moving Inventory:** Identifies Quality items with no sales activity within 90 days.

---

## 17. User Experience Review
*   **Import Quality Button:** Allows bulk CSV/Excel imports of standard diamond qualities.
*   **Shortcut Traverse:** Supports `Enter` key traversal across the form fields.

---

## 18. Edge Cases
*   **Changing UQC with Active Stock:** Changing default units (e.g., from Carats to Pieces) while stock is on-hand is blocked. The user must adjust stock to zero first.
*   **Importing Duplicates:** The import engine checks for existing Quality names and Item Codes, flagging matches as exceptions instead of creating duplicates.

---

## 19. Future Enhancements
*   **Barcode / RFID Tagging:** Auto-generate barcode labels during polished assortments.
*   **Price Matrix Integration:** Sync price books directly with international index lists (e.g., RapNet API).

---

## 20. Architect Recommendations
1.  **Composite Indexing:** Index the Quality table in MySQL on `(id, item_code, active_status)` to optimize transaction dropdown searches.
2.  **Date-Effective Tax Resolution:** Build database queries that fetch tax rates using:
    ```sql
    SELECT gst_pct FROM quality_gst_history WHERE quality_id = ? AND apply_date <= ? ORDER BY apply_date DESC LIMIT 1
    ```

---

## 21. Final Completion Checklist
*   [x] Document business purpose and role of the Quality Master.
*   [x] Review screen sections (General, Inventory, Pricing, GST, Stock Control).
*   [x] Map field properties, validation parameters, and HSN formatting rules.
*   [x] Detail stock management logic (Current stock, negative guards, alerts).
*   [x] Define pricing formulas, GST history grids, and dependency mappings.
*   [x] Map edge cases, user experience benchmarks, and import validation rules.
