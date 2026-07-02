# DIAMO ERP – PHASE 4.1.2
## SALE BOOK – HEADER, PARTY & BROKER SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Header Section, Customer Details, and Broker Details of the Sale Book in DIAMO ERP. This specification outlines field properties, auto-generation numbering formats, auto-fetch logic, due date calculations, and validation parameters required to automate entry workflows and maintain database integrity.

---

## 2. Header Section
The Header Section displays the operational parameters of the transaction voucher.

*   **Voucher Number:** System-generated unique transactional ID (used for ledger audit trails).
*   **Challan Number:** Dropdown selector to import stones from an active delivery or memo challan.
*   **Transaction Status:** Choice of: Draft, Saved, Approved, Cancelled.
*   **Metadata Fields:** Created By, Created Date, Modified By, Modified Date (read-only audit details).

---

## 3. Bill Number Strategy
The Bill Number is the legal invoice identifier printed on document templates:
*   **Generation Format:**
    $$\text{Bill Number} = \text{Company Prefix} - \text{SALE} - \text{YYYY} - \text{Sequential Number}$$
    *Example:* `JD-SALE-2026-000452` (Jadhav Diamonds, Sales Invoice, Year 2026, Sequence #452).
*   **Behavior Rules:**
    *   *Uniqueness:* Indexed in the database as a unique field per company partition.
    *   *Sequencing:* Resets to `000001` at the beginning of each financial year.
    *   *Overrides:* The field is read-only. Manual overrides can be unlocked only by administrators through System Configuration settings.

---

## 4. Invoice Date Rules
*   **Default Value:** Current System Date.
*   **Calendar Boundaries:** Must fall within the active Financial Year's From/To date limits.
*   **Lock Date Check:** Must be strictly after the company's active `Lock Transaction Upto Date`. If prior, voucher saving is blocked.

---

## 5. Company & Financial Year Behaviour
*   **Company Resolution:** Automatically resolved by the active workspace session. Users cannot swap companies mid-transaction.
*   **Financial Year Resolution:** Resolves based on the selected Invoice Date. If the date changes to a range outside the active financial year, the ERP warns the user to swap active years or correct the input date.

---

## 6. Customer Section
Selecting a customer from the Account Master auto-populates the following parameters:
*   **Customer Name & Billing/Shipping Address:** Legal billing details printed on invoices.
*   **GSTIN & PAN:** Used to evaluate local/state tax calculations.
*   **State & Place of Supply:** Sets tax routing criteria (CGST/SGST vs. IGST).
*   **Outstanding & Credit Limit:** Displays current credit exposure warnings.

---

## 7. Broker Section
Selecting a broker from the Broker Master auto-populates the following parameters:
*   **Broker Name & Contact Details:** Reference parameters for sales commissions.
*   **Brokerage %:** Defaults commission calculations based on the broker's master file terms.
*   **Settlement Status:** Choice of: Unpaid, Paid, Held.

---

## 8. Auto Fetch Logic
The auto-fetch flow executes sequentially upon selecting a party or broker:

```mermaid
graph TD
    A[Select Customer] --> B[Fetch Address, GSTIN, PAN]
    B --> C[Fetch Billing State & Determine Place of Supply]
    C --> D[Fetch Credit Days & Auto-Calculate Due Date]
    D --> E[Query DB Ledger balances & Display Outstanding]
    F[Select Broker] --> G[Fetch Default Brokerage % from Master]
    G --> H[Display Broker Mobile & Email Details]
```

---

## 9. Due Date Logic
The system computes the payment due date automatically:
$$\text{Due Date} = \text{Invoice Date} + \text{Credit Days}$$
*   **Interaction:** If the user manually edits the Credit Days input, the Due Date updates instantly. If the user edits the Due Date calendar, the Credit Days count is recalculated.

---

## 10. Outstanding Information
The Outstanding panel provides immediate risk warnings using a color-coded indicator:

| Outstanding Ratio | Indicator Color | System Behavior |
| :--- | :--- | :--- |
| $\text{Outstanding} < \text{Credit Limit}$ | **Green** | Clear to proceed. |
| $\text{Outstanding} \ge 90\% \text{ of Credit Limit}$ | **Amber** | Warn user of credit saturation. |
| $\text{Outstanding} > \text{Credit Limit}$ | **Red** | Block invoice saving (requires override). |

---

## 11. Validation Rules
*   **Mandatory Inputs:** Customer, Invoice Date, Company, and Financial Year must be filled.
*   **Broker Matching:** If Brokerage % is greater than `0.00%`, a Broker must be selected.
*   **Status Verifications:** Block selection of Inactive Customers or Inactive Brokers.

---

## 12. Business Rules
1.  **Direct Master Association:** All customer tax parameters (GSTIN, PAN) must pull directly from the Account Master and remain read-only in the Invoice screen.
2.  **Outstanding Read-Only:** Debtor balances are non-editable and pull directly from database ledger balances.
3.  **Financial Year Validation:** Invoice saving is blocked if no matching financial year is active.

---

## 13. Keyboard Workflow
*   **F4 (Customer Search):** Opens the Customer search dropdown.
*   **F6 (Broker Search):** Opens the Broker search dropdown.
*   **Ctrl + A (Inline Master):** Open Quick Create Customer (if focused on Customer) or Quick Create Broker (if focused on Broker).
*   **Ctrl + Enter (Ledger Open):** Opens the selected customer's ledger report in a new tab.

---

## 14. Dependencies
*   **Account & Broker Masters:** Provide party coordinates, tax IDs, and default commission terms.
*   **Company & Financial Year Masters:** Restrict transaction boundaries and provide invoice numbering prefixes.

---

## 15. Edge Cases
*   **Deleted Customer Profile:** If a customer is deleted, historic invoices are locked. New invoices cannot select the profile.
*   **Blocked Customer Override:** If a customer is marked "Blocked", the invoice blocks saving unless an Administrator inputs an override key.
*   **Manual Bill Number Override:** If enabled, the system verifies that the manual input sequence does not collide with existing numbers.

---

## 16. Future Enhancements
*   **Customer Credit Score:** Display credit safety ratings based on historical payment performance.
*   **Risk Analysis Engine:** Automated warnings flagging customers with aging payments.
*   **Favorite Customers:** Pin frequently billed customers to the top of the search list.

---

## 17. Architect Recommendations
1.  **Transactional Sequence Locks:** Implement database sequence locks in MySQL during invoice saves to prevent two terminals from generating the same Bill Number.
2.  **State Lookup Integration:** Ensure the Place of Supply automatically resolves to "Inter-State" if the customer's GSTIN state prefix differs from the active Company state code.

---

## 18. Final Completion Checklist
*   [x] Document fields, validation rules, and numbering strategies for the Header section.
*   [x] Map customer details, auto-fetch variables, and credit day warnings.
*   [x] Map broker terms, default commissions, and optional matches.
*   [x] Detail due date calculations and credit limit alert levels.
*   [x] Map keyboard workflow shortcuts and dependencies.
