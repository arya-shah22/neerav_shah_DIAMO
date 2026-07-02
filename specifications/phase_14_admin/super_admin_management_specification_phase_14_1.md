# DIAMO ERP – PHASE 14.1
## SUPER ADMIN MANAGEMENT, AUTHENTICATION & SYSTEM OWNERSHIP SPECIFICATION

---

## 1. Executive Summary
This document defines the Functional Specification Document (FSD) for the Super Admin Management, Authentication, and System Ownership module of DIAMO ERP. This module structures high-level security clearance, manages Super Admin profiles, handles credential management policies, controls system logins, tracks session durations, and establishes administrative dashboards.

---

## 2. Business Purpose
*   **Centralized Security Control:** Provides a root user profile with unrestricted access to manage system resources.
*   **Access Protection:** Implements strict security policies, including restricting normal users from changing passwords without administrator approval.

---

## 3. Super Admin Account
*   **Super Admin Profile Parameters:** Super Admin Name, User ID (unique system handle), Email Address, Mobile Number, Profile Picture, Designation (e.g., Chief Administrator), Account Status, Creation Date, Last Login Timestamp, and Last Password Change Date.

---

## 4. Login
*   **Authentication Form:** Standard username-password entry fields with hide/show password toggles, "Remember Me" flags, and error status panels.

---

## 5. Login Validation
*   **Authentication Check Rules:** Checks User ID syntax, verifies password hashes, flags inactive or suspended accounts, and handles locked accounts. Renders clean messages like: `Invalid User ID or Password.` or `Your account has been disabled. Please contact your Administrator.`

---

## 6. Password Management
*   **Super Admin Password Controls:** The Super Admin can change their own password, reset their password, and view password change dates.

---

## 7. Password Policy
*   **Access Restrictions:**
    *   *Super Admin:* Can change their own password, and reset or change any user's password.
    *   *Normal Users:* Cannot change or reset their own passwords, or change other users' passwords. Users must contact the Super Admin to request password updates.

---

## 8. Super Admin Rights
*   **Unrestricted Clearances:** The Super Admin has unrestricted access to all modules, including Company Settings, User lists, Ledger records, Cash/Bank books, out-source job trackers, backups, restorations, database maintenance diagnostics, and system audit logs.

---

## 9. Account Status
*   **Operational States:**
    *   *Active:* Full system clearance.
    *   *Inactive:* Temporarily suspended.
    *   *Locked:* Locked after excessive failed login attempts.
    *   *Disabled:* Permanently closed.

---

## 10. Profile Management
*   **Profile Operations:** Allows updating names, emails, and contact details, uploading profile pictures, and viewing profile details.

---

## 11. Session Management
*   **Session Metrics:** Displays active login timestamps, last login dates, desktop machine names, and session durations. Allows terminating active sessions.

---

## 12. Super Admin Dashboard
*   **Admin Console Indicators:** Displays active Company ID, current Financial Year, total user accounts count, active/locked user ratios, MySQL status, backup validity flags, and license metrics.

---

## 13. Search
Supports filters for: User ID, Super Admin Name, and Email.

---

## 14. Filters
Provides filters for: Account Status (Active/Locked/Disabled) and Creation Date.

---

## 15. Sorting
Allows sorting by: Name, User ID, and Last Login Timestamp.

---

## 16. Validation
*   Validates password strength, checks for duplicate User IDs or contact emails, and prevents leaving password fields blank.

---

## 17. Business Rules
1.  **Strict Balance Constraint:** Voucher save blocked if variance is not zero.
2.  **No Edits on Reconciled Vouchers:** Reversing or editing a voucher requires first undoing its reconciliation.
3.  **Approval Logs:** Historical approval records cannot be deleted.

---

## 18. Module Impact
*   Impacts administrative access across the entire ERP database, including companies, settings, backup folders, and user permission matrices.

---

## 19. Permissions
*   **Unrestricted Access:** Unconditional system access. No permission locks apply to the Super Admin profile.

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
*   Handles login failures, locked accounts, database disconnection rollbacks, and credential exceptions with clear error messages.

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
