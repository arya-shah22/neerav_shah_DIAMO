# DIAMO ERP – PHASE 14.2
## USER MANAGEMENT & EMPLOYEE ACCESS MANAGEMENT SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the User Management, Staff Accounts, and Employee Access Management module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Access Protection:** Restricts operator views to only assigned company profiles, preventing unauthorized access.
*   **Maker-Checker Controls:** Integrates with transaction approval workflows by defining clear roles and departments.

---

## 3. User Management
*   **Operational Controls:** Only the Super Admin is authorized to run tasks: Create, edit, view, activate/deactivate, lock/unlock, delete draft users, and change passwords. Normal operators cannot manage other users.

---

## 4. User Profile
*   **Profile Parameter Blocks:** Employee Code (unique index), Employee Name, Display Name, User ID, Password Hash, Email Address, Mobile Number, Department (e.g., Sales, Inventory), Designation, Profile Photo, Remarks, Creation Timestamp, and Created By.

---

## 5. Company Assignment
*   **Multi-Company Scope Mapping:** Allows the Super Admin to assign access rights for One Company, Multiple Companies, or All Companies to a user profile. The UI only displays company options assigned to the logged-in user.

---

## 6. User Status
*   **Operational States:**
    *   *Active:* Full access allowed within assigned scopes.
    *   *Inactive:* Temporarily suspended.
    *   *Locked:* Locked after excessive failed login attempts.
    *   *Disabled:* Permanently closed.

---

## 7. User Login
*   **Telemetry Logs:** Displays active session indicators, last login timestamps, last logout timestamps, and active company details.

---

## 8. Password Management
*   **Operator Password Control:** Only the Super Admin can create, change, or reset user passwords. Normal users cannot update or reset their passwords, and must contact the Super Admin for changes.

---

## 9. Profile Management
*   **Super Admin Update Tools:** Allows modifying employee details, shifting departments, updating designations, and uploading profile pictures.

---

## 10. User Search
Supports filters for: Employee Code, Employee Name, User ID, and Department.

---

## 11. Filters
Provides filters for: Account Status (Active/Locked/Disabled), Designation, and Assigned Company.

---

## 12. Sorting
Allows sorting by: Employee Code, Name, and Created Date.

---

## 13. Validation
*   Checks for duplicate User IDs, duplicate Employee Codes, duplicate emails/mobiles, password strength, and invalid company mappings.

---

## 14. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 15. Module Impact
*   Automatically impacts login checks, company selectors, user permission configurations, and audits across all modules.

---

## 16. Permissions
Access is regulated by the following flags:
*   `view_user_profiles` / `create_user_profiles`
*   `edit_user_profiles` / `assign_company_access`
*   `reset_user_passwords` / `unlock_user_accounts`

---

## 17. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 18. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 20. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 21. Error Handling
*   Handles duplicate records, locked logins, disabled user access, and transaction rollbacks with clear error messages.

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
