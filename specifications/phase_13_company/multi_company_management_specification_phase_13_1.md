# DIAMO ERP – PHASE 13.1
## MULTI-COMPANY MANAGEMENT & COMPANY PROFILE CONFIGURATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Multi-Company Management and Company Profile Configuration module of DIAMO ERP. This module enables a single installation of DIAMO ERP to host multiple distinct diamond trading and manufacturing companies. It enforces isolation of general ledgers, inventory packets, bank configurations, and printing templates under a unified company switcher context.

---

## 2. Business Purpose
*   **Operational Consolidation:** Supports diamond brokers and manufacturer groups operating under multiple legal entities (e.g., Pvt Ltd, LLP, Prop) to run their operations from a single system.
*   **Entity Isolation:** Ensures that masters, transaction logs, tax registrations (GSTIN/PAN/TAN), and financial books remain isolated, preventing mixed entries.

---

## 3. Company Management
*   **Company Actions:** Create Company, Edit Company, Deactivate Company, Reactivate Company, Delete Draft Company, View Company Profile, and Copy Configurations (importing chart of accounts or print designs from another company).

---

## 4. Multi-Company Switcher
*   **Context Re-routing:** A dropdown selector in the main header allows instant switches between legal entities. Selecting a company updates the active company ID in the session, automatically loading its respective stock lists, ledger balances, and transaction registries.

---

## 5. Company Profile
*   **Parameters:** Registered Company Name, Trade Name, GSTIN, PAN, TAN, Corporate Identification Number (CIN), Address, City, State, Pin Code, Phone Number, Email, and Website.

---

## 6. Bank Details
*   **Primary Bank Accounts:** Stores Bank Name, Branch, Account Holder Name, Account Number, IFSC Code, SWIFT Code (for foreign trade), and UPI ID.

---

## 7. Authorized Signatories
*   **Signatory Profiles:** Supports up to 3 authorized signatories. Captures Name, Designation, and Signature Image (PNG with transparent background). Signatures automatically mount onto sales invoice print templates.

---

## 8. Financial Year
*   **Period Configurator:** Start Date, End Date, default financial year, and status (Open, Closed, Locked). A closed status blocks transaction entries but allows report generation.

---

## 9. Company Status
*   **Status Classifications:**
    *   *Active:* Full read-write operational status.
    *   *Inactive:* Read-only mode; blocks new transactions.
    *   *Draft:* Incomplete profile registration.
    *   *Archived:* Historical reference state; hidden from default search grids.

---

## 10. Default Company
*   **Autoload Flag:** Allows one active company to be set as the Default Company. Upon login, the system automatically opens this entity's dashboard.

---

## 11. Logo Management
*   **Asset Processing:** Supports drag-and-drop uploads for JPG/PNG files (Max 2 MB). Validates dimensions (square layout, min 300x300px), automatically mapping it as a header element in reports.

---

## 12. Company Documents
*   **Document Vault:** Stores local PDF attachments of PAN card, GST registration certificate, Cancelled Cheque, MSME registration certificate, and Partnership Deed/CIN registration copy.

---

## 13. Search
Supports filters for: Company Name, Trade Name, GSTIN, PAN, and State.

---

## 14. Filters
Provides filters for: Company Status, State, and Financial Year.

---

## 15. Sorting
Allows sorting by: Company Name, Creation Date, and Active Status.

---

## 16. Validation
*   Checks for duplicate GSTIN/PAN/TAN entries, validates email syntax, matches state GST prefix codes, and verifies that financial year start/end boundaries do not overlap.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 18. Print & Report Impact
*   Selecting a company updates the layout metadata. Documents like Invoices, Challans, and Registers will automatically display the active company's logo, trade name, GSTIN, bank details, and signatory images.

---

## 19. Permissions
Access is regulated by the following flags:
*   `create_company_profile` / `deactivate_company_profile`
*   `view_company_pricing` / `manage_signatories`

---

## 20. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 21. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 22. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 23. Error Handling
*   Handles duplicate tax registration numbers, corrupt logo images, and network rollback failures with clear error messages.

---

## 24. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 25. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 26. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 27. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
