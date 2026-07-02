# DIAMO ERP – PHASE 2 PART 3.3
## BROKER MASTER – ENTERPRISE FUNCTIONAL SPECIFICATION

---

## 1. Executive Summary
This document defines the Enterprise Functional Specification Document (FSD) for the Broker Master module in DIAMO ERP. The Broker Master is a specialized extension of the Account Master, inheriting its core financial, address, bank, and tax (GST/PAN/TDS/TCS) validation rules. It adds broker-specific attributes to manage commissions, transaction tracking, and outstanding settlements within the diamond trading pipeline.

---

## 2. Business Purpose
Brokers play an essential role in the diamond industry by facilitating transactions between buyers and sellers:
*   **Market Intermediation:** Brokers leverage networks to match specific diamond qualities to buyers, maintaining deal momentum.
*   **Consignment & Memo Custody:** Brokers act as custodians when showcasing high-value parcels to prospective clients.
*   **Commission Tracking:** The Broker Master acts as the database for broker profiles, ensuring commission records match billing contracts.
*   **Duplicate Prevention:** Unique broker profiles prevent payment reconciliation errors.

---

## 3. Business Importance
*   **Sales & Purchase Book Integration:** Automates brokerage commission calculations upon invoice finalization.
*   **Financial Control:** Records TDS on brokerage under Section 194H of the India Income Tax Act.
*   **Liquidity & Settlement:** Tracks outstanding brokerage debts independent of standard trade payables.
*   **Performance Metrics:** Feeds analytics dashboards to evaluate broker success rates and sales volume.

---

## 4. Page Overview
*   **Primary Objective:** Provide a keyboard-first page to configure and manage broker terms and ledgers.
*   **Secondary Objectives:** Validate tax structures (PAN, GSTIN) and assign custom brokerage percentages.
*   **Success Criteria:** Instantly matching sales commissions during invoice generation and resolving outstanding brokerage settlements without manual computation.

---

## 5. Users & Permissions

| Role | Permissions | Operation Scope |
| :--- | :--- | :--- |
| **Owner / Executive** | View, Export | Analyzing broker commission, deal volume, and outstanding liabilities. |
| **Administrator** | Full Access | Creating/editing profiles, adjusting default rates, database overrides. |
| **Accountant** | Create, Edit, View | Initializing broker profiles, posting commission vouchers. |
| **Sales Department** | Read-Only | Selecting active brokers during sales order entry. |
| **Purchase Department**| Read-Only | Selecting active brokers during rough lot importing. |
| **Auditor** | View, Export | Reviewing brokerage TDS entries. |

---

## 6. Navigation
*   **Module:** Masters
*   **Sub-Module:** Business Masters
*   **Breadcrumb Path:** `Masters / Business Masters / Broker Master`
*   **Target Page URI:** `/masters/business/brokers`

---

## 7. Existing Screen Review
The screen layout mirrors the split-pane structure of the Account Master:
1.  **Search Pane (Left):** Instant search bar for filtering broker records.
2.  **Detail Pane (Right):** Multi-tab view utilizing Account Master components:
    *   *Tab 1: Basic Information* (Inherited fields + Default Brokerage %, Default Commission type).
    *   *Tab 2: Tax & KYC details* (Inherited GSTIN, PAN, Udyam MSME).
    *   *Tab 3: Bank Details* (Inherited IFSC, Account details, Branch).
    *   *Tab 4: Address & Contact Details* (Inherited location fields).
3.  **Command Toolbar (Top Right):** Standard actions (New, Edit, Save, Cancel, Delete, Export, Print).

---

## 8. Section Review
1.  **Basic & Settlement Profile:** Captures default brokerage percentage and commission type (Add/Less of billing price).
2.  **Address & Location:** Billing address, area, and pincode used to verify transit distances for compliance (e-Way bills).
3.  **TDS / TCS Profiles:** Maps TDS on Brokerage (e.g., Section 194H) and applicable TCS rules.
4.  **Bank Registry:** Stores bank records to facilitate automated brokerage clearing.

---

## 9. Field Review
The Broker Master inherits all fields from the Account Master. Key fields and extensions include:

| Field Name | Type | Section | Required? | Validation Rules | Default | Business Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Account Name** | Text | Basic Info | Yes | Unique name. Max 150 chars. | None | Legal name of the broker. |
| **Account Group**| Dropdown | Basic Info | Yes | Must resolve to "Brokers" group. | Brokers | Parent category in General Ledger. |
| **Brokerage %** | Decimal | Settlement | Yes | Non-negative. Range: 0.00% to 10.00%.| 0.00% | Default commission rate. |
| **Add / Less** | Dropdown | Settlement | Yes | Choice of: Add, Less. | Less | Determines if brokerage is added to or subtracted from net sales. |
| **TDS Ledger** | Dropdown | Tax details | Optional | References a valid TDS Liability Ledger. | None | Routing ledger for TDS deduction. |
| **TDS %** | Decimal | Tax details | Optional | Non-negative. Range: 0.00% to 30.00%.| 5.00% | Withholding rate under Section 194H. |

---

## 10. Button Behaviour
*   **Add / New (`Ctrl + N`):** Clears detail fields, defaults the Account Group to "Brokers", and sets focus to the "Account Name" field.
*   **Save (`Ctrl + S`):** Validates inputs (duplicate checks, broker percentage range). On success, writes to database and displays a toast alert.
*   **Close (`Esc` / Cancel):** Reverts the detail pane to a read-only state.

---

## 11. Business Rules
1.  **Inherited Uniqueness:** Broker names must be unique within the Account table, preventing collisions with clients or suppliers.
2.  **Parent Group Constraint:** The Account Group for Broker records must be set to "Brokers" (or its children) to ensure correct Balance Sheet classification.
3.  **Active Status Control:** Inactive brokers are excluded from transaction dropdown menus.
4.  **Brokerage Cap:** Enforce a maximum default brokerage rate of 10.00% to prevent input errors.

---

## 12. Validation Rules
*   **Brokerage Rate Range:** Must satisfy $0.00 \leq \text{Brokerage \%} \leq 10.00$.
*   **GSTIN/PAN Formats:** Enforce standard regex checks inherited from the Account Master.
*   **TDS Percentage Range:** Must satisfy $0.00 \leq \text{TDS \%} \leq 30.00$.

---

## 13. Dependencies
*   **Account Master:** The Broker Master writes directly to the core Account database table.
*   **Sales & Purchase Book:** Vouchers read the default brokerage percentage during invoicing.
*   **Financial Vouchers:** Cash payments post debit entries directly to the broker's outstanding ledger.

---

## 14. Transaction Impact
*   **Sale Book:** Invoices route default commission amounts to "Brokerage Outstanding" liabilities.
*   **Journal Vouchers:** Used to manually adjust broker commissions or write off differences.

---

## 15. Report Usage
*   **Broker Ledger Report:** Running statement of credit commissions and debit payments.
*   **Broker Outstanding Report:** Outstanding broker bills sorted by invoice dates.
*   **TDS 194H Summary:** Report showing brokerage paid, TDS deducted, and net settlements.

---

## 16. User Experience Review
*   **Inline Master Creation (Ctrl + A):** When selecting a broker during invoicing, pressing `Ctrl + A` opens the Broker Master form to create a new profile on-the-fly.
*   **Grid Filtering:** Listing grid displays broker rates, names, and contact details with low-latency search filters.

---

## 17. Edge Cases
*   **Altering Brokerage Mid-Cycle:** Changing the default brokerage percentage in the Master does not alter completed sales invoices, protecting historic audit data.
*   **Deleting Active Brokers:** Deletion is blocked if the broker has transaction logs. The user must toggle the status to "Inactive" instead.

---

## 18. Future Enhancements
*   **Commission Slab Matrix:** Support changing commission rates based on diamond sizes or sales volumes.
*   **Broker Performance Dashboard:** Visual charts displaying monthly sales value generated per broker.
*   **KYC Verification:** Integrate digital document uploads (Aadhaar, GSTIN certificates) directly under the broker profile.

---

## 19. Architect Recommendations
1.  **Unified Table Design:** Implement the Broker database model as a record in the main `Account` table with a `is_broker: true` flag to reuse validation code.
2.  **Trigger-Driven Commission Logs:** Ensure that whenever a sales invoice is created or edited, commission updates are handled within transaction blocks to avoid mismatches.

---

## 20. Final Completion Checklist
*   [x] Document business purpose and role of brokers in the diamond industry.
*   [x] Integrate the specification with approved Account Master fields.
*   [x] Specify broker-specific parameters (default brokerage, commission flags, TDS ledger).
*   [x] Define validation rules, transaction impacts, and edge case parameters.
*   [x] Document user experience targets, keyboard navigation rules, and report usage.
