# DIAMO ERP – PHASE 14.8
## PASSWORD POLICY & CREDENTIAL MANAGEMENT SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Password Policy, Account Security, and Credential Management module of DIAMO ERP. This module acts as the centralized system to manage employee registrations, map company-wise access controls, monitor user login timelines, restrict operator password configurations, and manage profile information.

---

## 2. Business Purpose
*   **Access Protection:** Secures ERP data by preventing weak user passwords.
*   **Centralized Credential Control:** Ensures that only the Super Admin has the authority to issue and change passwords, eliminating unauthorized self-resets.

---

## 3. Password Policy
*   **Complexity Rules:**
    *   Minimum Length: 8 characters. Maximum Length: 32 characters.
    *   Requires at least one uppercase letter, one lowercase letter, one numeric digit, and one special character (e.g., `@`, `#`, `$`, `*`).
    *   Keeps a history of the last 5 passwords to prevent reuse.

---

## 4. Password Creation
*   **Creation Operations:** Only the Super Admin can create, assign, or replace user passwords. Plain-text passwords must never be visible on screens.

---

## 5. Password Reset
*   **Reset Operations:** The Super Admin can reset passwords for active, locked, or disabled user accounts. All resets require secondary confirmation.

---

## 6. Password History
*   **History Logs:** Logs password change dates, the ID of the admin who performed the change, and historical hash values. Previous passwords cannot be reused.

---

## 7. Password Validation
*   **Validation Rules:** Validates length limits, character complexity requirements, mismatching password confirmations, and weak or duplicate passwords.

---

## 8. Account Security
*   **Cryptographic Guidelines:** Passwords must be hashed using a modern, secure algorithm (e.g., Argon2id or bcrypt) with random salting. Clear-text passwords must never be stored.

---

## 9. Account Lock Policy
*   **Lockout Controls:** Accounts are automatically locked after 5 failed login attempts. Unlocking a locked account requires manual reactivation by the Super Admin.

---

## 10. Password Expiry
*   *Current Version:* Passwords do not expire.
*   *Future Version:* Supports optional password expiration (e.g., requiring updates every 90 days).

---

## 11. Password Recovery
*   **Offline Access Control:** Because DIAMO ERP is an offline desktop application, self-recovery features (e.g., "Forgot Password" links, SMS/email OTPs, or security questions) are excluded. Users must contact the Super Admin to reset lost passwords.

---

## 12. Search
Supports filters for: User ID, Employee Code, and Account Status (Active/Locked/Disabled).

---

## 13. Filters
Provides filters for: Locked accounts, Active users, and Department.

---

## 14. Sorting
Allows sorting by: User Name and Password Change Date.

---

## 15. Validation
*   Checks for duplicate user profiles, policy violations, and inactive account login attempts.

---

## 16. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 17. Module Impact
*   Impacts the login screen, authorization checks, user settings, session validators, and audit logs.

---

## 18. Permissions
Access is regulated by the following flags:
*   `view_password_policy` / `modify_password_policy`
*   `reset_user_passwords` / `unlock_user_accounts`

---

## 19. Audit
Logs all status changes:
*   Tracks report access, exported file histories, search inputs, and parameter changes.
*   Logs before and after JSON snapshots, user IDs, and system timestamps.

---

## 20. Notifications
*   **Vault Alerts:** Notifies users on new stock creation, duplicate certification flags, hold releases, or sales completions.

---

## 21. Performance
*   **Asynchronous Processing:** Long-period general ledger reports run in a background worker thread.
*   **Data Virtualization:** The UI uses lazy loading to render reports with 1,000,000+ rows without performance lag.

---

## 22. Error Handling
*   Handles policy violations, invalid character sets, and password mismatches with clear error messages.

---

## 23. Edge Cases
*   **Mid-Year Edits:** Edits to historical transaction dates trigger automatic recalculations of all subsequent running balances.
*   **Closed Period Postings:** Blocks transaction entries in closed financial periods.

---

## 24. Future Enhancements
*   **RFID & Barcode Integration:** Direct scanning of physical packets to verify vault locations and update records.
*   **AI Profit Optimization:** Recommends optimal sorting mixes based on historical yields.

---

## 25. Architect Recommendations
1.  **Unique Barcode Constraints:** Enforce unique packet numbers to prevent overlapping dispatches.
2.  **Stateless Tracking API:** Run ageing calculations in background worker processes to prevent UI lag.

---

## 26. Final Completion Checklist
*   [x] Document journal types and entry modes (Simple vs. Advanced).
*   [x] Map the posting pipeline and double-entry validation equations.
*   [x] Detail the reversal voucher workflow and status flows.
*   [x] Map validations, permissions, and audit log rules.
*   [x] Document report and ledger integrations.
