# DIAMO ERP – PHASE 13.10
## LICENSE MANAGEMENT & APPLICATION INFORMATION SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the License Management, Version Control, and Application Information module of DIAMO ERP. This module provides local registration validations, tracks software release builds, captures desktop environment variables, displays developer details, and registers customer support resources without using external cloud APIs.

---

## 2. Business Purpose
*   **Version Traceability:** Renders current desktop execution versions, making it easier to diagnose bugs.
*   **Resource Monitoring:** Outlines database sizes and local hardware properties to prevent software slowdowns.

---

## 3. License Information
*   **Registration Metadata:** Displays License Number, License Type (e.g., Enterprise, Single-User), Registered Company Name, Registered User, Activation Date, Max allowed Company Profiles, and Max allowed User Accounts.

---

## 4. License Status
*   **Licensing States:** Monitors and displays current states (Active, Inactive, Expired, Suspended) with clear color-coded layout indicators.

---

## 5. Application Information
*   **Build Metadata:** Displays Software Name, Active Edition, Version (e.g., `v2.4.1`), Build Number, Release Date, and Installation Timestamp.

---

## 6. System Information
*   **Hardware Profile:** Renders local host specifications (Operating System, Processor Type, RAM, Disk Space availability, MySQL version, active database file size, and application Uptime).

---

## 7. Version Management
*   **Change Logs:** Displays local release notes, version change history, and lists past patches.

---

## 8. About DIAMO
*   **About Panel Layout:** Contains the software description, copyright details, Terms of Use, Privacy Policy, and support links.

---

## 9. Support Information
*   **Support Details:** Support Email, Telephone helpline numbers, operational hours, and guides for reporting issues.

---

## 10. License Validation
*   **Licensing Constraint Checks:** Verifies the local license signature, validates that company counts do not exceed limits, checks active user numbers, and ensures database version compatibility.

---

## 11. Search
Supports filters for: License Number, Version, and Registered User.

---

## 12. Filters
Provides filters for: License Status, Release Version, and Company Name.

---

## 13. Sorting
Allows sorting by: Version Code, Release Date, and Activation Date.

---

## 14. Validation
*   Checks license formats, validates database sizes, and runs system compatibility checks.

---

## 15. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 16. Module Impact
*   Impacts User profiles, Company registrations, database managers, and administrative control settings.

---

## 17. Permissions
Access is regulated by the following flags:
*   `view_license_info` / `view_system_info`
*   `update_license_key` / `override_version_warnings`

---

## 18. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 19. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 20. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 21. Error Handling
*   Handles invalid keys, expired files, and version conflicts with clear error messages.

---

## 22. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 23. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 24. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 25. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
