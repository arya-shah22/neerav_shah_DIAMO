# DIAMO ERP – PHASE 2 PART 3.4
## COMPANY MASTER – ENTERPRISE FUNCTIONAL SPECIFICATION

---

## 1. Executive Summary
This document establishes the Enterprise Functional Specification Document (FSD) for the Company Master module in DIAMO ERP. The Company Master manages the setup of the user's corporate entities, capturing legal business names, tax configurations (GSTIN, PAN, TAN), E-way/GSTR credentials, bank routing, and contact details. It serves as the primary data source for document printing (invoices, vouchers) and data partitioning within the multi-company architecture.

---

## 2. Business Purpose
The Company Master is the foundational master required before recording any business transactions:
*   **Legal Identity Definition:** Defines the organization name, PAN, and tax credentials printed on all client-facing documents.
*   **Multi-Company Database Partitioning:** Establishes isolated ledger environments for different business units under a single database installation.
*   **API Gateway Configuration:** Holds encrypted GSTR and E-way bill portal credentials to automate tax filings.
*   **Internal Routing:** Differentiates own bank accounts from customer/supplier bank accounts.

---

## 3. Business Importance
*   **Document Printing:** Populates the letterhead, address details, bank routing fields, and GST declarations on Sales Invoices and Memos.
*   **Tax Compliance:** Feeds own GSTIN/PAN metadata to GST returns (GSTR-1, GSTR-3B) and TDS returns.
*   **System Integrity:** Governs the generation of independent invoice numbering series per company.

---

## 4. Page Overview
*   **Primary Objective:** Provide a detailed form to create and configure the company's legal entities.
*   **Secondary Objectives:** Validate tax registrations and establish credentials for government portals.
*   **Success Criteria:** Correct legal formatting on all printed layouts, separate multi-company accounting balances, and error-free tax integrations.

---

## 5. Users & Permissions

| Role | Permissions | Operation Scope |
| :--- | :--- | :--- |
| **Owner / Executive** | View, Export | Reviewing company credentials, banking details, and database status. |
| **System Administrator** | Full Access | Creating/editing companies, credential updates, archiving. |
| **Accounts Head** | Create, Edit, View | Initializing new sister companies, updating active bank profiles. |
| **Auditor** | View | Verifying legal credentials and tax registration histories. |

*   *Restrictions:* Standard sales, purchase, and inventory operators are strictly blocked from accessing this module.

---

## 6. Navigation
*   **Module:** Masters
*   **Sub-Module:** Business Masters
*   **Breadcrumb Path:** `Masters / Business Masters / Company Master`
*   **Target Page URI:** `/masters/business/companies`

---

## 7. Existing Screen Review
The Company Master screen uses a single-page, section-based form layout designed for widescreen displays:
*   **Sections:** Information is organized into six clean panels (Basic Info, Tax Credentials, Address, Contact details, Bank Details, and Status Settings).
*   **Toolbar (Top):** Command buttons (Add, List, Save, Close) aligned to match the global UI standards.

---

## 8. Section Review
1.  **Basic & Group Information:** Configures the primary legal name, company code (3-character unique ID), business type, and group classification.
2.  **Taxation & Portal Credentials:** Stores GSTIN, PAN, TAN, Udyam MSME, IEC (Import Export Code), and encrypted E-Way/GSTR portal API keys.
3.  **Address Panel:** Separate inputs for Address lines, city, state, country, and distance (used in e-Way calculations).
4.  **Contact Registry:** Mobile, phone, email, and company website details.
5.  **Bank Information:** Primary clearing bank account number, branch, IFSC, and SWIFT code for export transactions.
6.  **GST Status Configuration:** Activates or suspends GST calculations along with the effective registration date.

---

## 9. Field Review

| Field Name | Type | Section | Required? | Validation Rules | Default | Business Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Company Name** | Text | Basic Info | Yes | Unique. Max 150 chars. | None | Legal registration name. |
| **Company Code** | Text | Basic Info | Yes | Unique 3-letter uppercase code.| None | Used as prefix in lot IDs and invoice numbers. |
| **GSTIN** | Text | Tax Info | Optional | 15-character alphanumeric. | None | Own GST Registration Number. |
| **PAN** | Text | Tax Info | Yes | 10-character alphanumeric. | None | Permanent Account Number. |
| **TAN** | Text | Tax Info | Optional | 10-character alphanumeric. | None | Tax Deduction Account Number. |
| **GST Enabled** | Boolean | GST Status| Yes | Toggle check box. | True | Enables tax calculations on invoices. |
| **Active Status** | Dropdown | Status | Yes | Active, Inactive, Suspended. | Active | Governs transaction posting authorization. |

---

## 10. Button Behaviour
*   **Add (`Ctrl + N`):** Clears the form fields, focus-targets the "Company Name" input, and switches the form to Edit Mode.
*   **Save (`Ctrl + S`):** Runs formatting validations. If valid, writes the profile record to the database and alerts the user with a success toast.
*   **Close (`Esc` / Cancel):** Discards form inputs and navigates back to the Dashboard.
*   **List:** Toggles the view to a grid showing all configured companies.

---

## 11. Business Rules
1.  **Unique Identity Codes:** The Company Code (e.g., "DMO") must be unique and cannot be modified once invoices are posted.
2.  **GST State Matching:** GSTIN first two digits must match the Pincode state directory mapping to prevent invoice tax errors.
3.  **No Deletion with Active Logs:** A Company profile cannot be deleted if there are any recorded transactions in the Sales, Purchase, or General Ledger tables.
4.  **One Default Company:** Only one company can be configured as the default entity that auto-loads upon user login.

---

## 12. Validation Rules
*   **GSTIN Regex:** `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
*   **PAN Regex:** `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
*   **TAN Regex:** `^[A-Z]{4}[0-9]{5}[A-Z]{1}$`
*   **IFSC Regex:** `^[A-Z]{4}0[A-Z0-9]{6}$`

---

## 13. Dependencies
*   **Financial Year Master:** Each company record maintains independent financial year intervals.
*   **Transactions (Sales/Purchase):** Invoices pull company header data and tax codes from this master.
*   **Users:** User permissions are filtered by active company access codes.

---

## 14. Transaction Impact
*   **Sales & Purchase Book:** Tax postings verify own GSTIN state against client GSTIN state to automatically apply SGST/CGST (intra-state) or IGST (inter-state) rates.
*   **Payment Receipts:** Populates own bank details in payment voucher records.

---

## 15. Report Usage
*   **Invoice / Bill PDF:** Populates letterhead text, logos, bank coordinates, and GST compliance footer boxes.
*   **Financial Statements:** Restricts data querying to the currently active company partition.

---

## 16. User Experience Review
*   **Tab-Traversal flow:** Input focus flows smoothly across sections.
*   **Inline Editing Warnings:** Warns users clearly when editing sensitive tax fields (such as GSTIN) that impact historic audits.

---

## 17. Edge Cases
*   **Changing GSTIN Mid-Year:** If a company updates its GSTIN (e.g., due to a change in constitution), the system blocks modifications to the active record. The user must create a new Company master record to ensure historical tax records remain audit-compliant.
*   **Duplicate PAN across Sister Concerns:** Allowed in the system, as sister companies can operate under a single PAN with distinct GST registrations in different states.

---

## 18. Future Enhancements
*   **Logo & Sign Drive:** Digital upload tool for company logos, digital signatures, and seals to automate PDF invoice printing.
*   **Branch Registers:** Support multiple branches (and distinct GSTINs) operating under a single primary Company Master.
*   **SMTP Setup:** Configures SMTP profiles per company to email invoices directly to clients.

---

## 19. Architect Recommendations
1.  **Cryptographic Credential Storage:** Ensure the NestJS backend encrypts E-way and GSTR portal passwords before storing them in MySQL.
2.  **State Code Lookup:** Build a local state-code lookup table to validate Pin Codes against GSTIN state prefixes during the form validation phase.

---

## 20. Final Completion Checklist
*   [x] Document business purpose and role of the Company Master.
*   [x] Review screen layout sections (Basic, Tax, Address, Bank details, Status).
*   [x] Map field properties, required flags, and format validations.
*   [x] Define validation rules, business constraints, and transaction impact.
*   [x] Formulate dependencies, report usage, edge cases, and future enhancements.
